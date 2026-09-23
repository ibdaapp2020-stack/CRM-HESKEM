"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { requireClient, requireStaff } from "../auth";
import { prisma } from "../prisma";
import { calcTotals } from "../documents/calc";
import { documentHash } from "../documents/hash";
import { DEFAULT_DOCUMENT_TEMPLATES } from "../documents/defaults";
import type { TemplateLine } from "../industries";
import { appUrl, findOrCreateLeadByPhone, sendSignLinkMessage } from "../messaging";
import { isLocale } from "../i18n";
import { legalOverlay } from "../documents/legal-i18n";

type LinePayload = {
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

function parseLines(raw: FormDataEntryValue | null): LinePayload[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw)) as LinePayload[];
    return parsed.filter((l) => l.title);
  } catch {
    return [];
  }
}

async function templateOf(type: string, industry?: string | null) {
  if (industry) {
    const byIndustry = await prisma.documentTemplate.findFirst({
      where: { type, industry, isDefault: true },
      orderBy: { version: "desc" },
    });
    if (byIndustry) return byIndustry;
  }
  const existing = await prisma.documentTemplate.findFirst({
    where: { type, isDefault: true },
    orderBy: { version: "desc" },
  });
  if (existing) return existing;
  const fallback = DEFAULT_DOCUMENT_TEMPLATES.find((t) => t.type === type);
  if (!fallback) throw new Error("אין תבנית למסמך");
  return fallback;
}

function parseTemplateLines(raw?: string | null): TemplateLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TemplateLine[];
    return parsed.filter((l) => l.title);
  } catch {
    return [];
  }
}

export async function createFromTemplateAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  const type = String(formData.get("type") || "QUOTE");
  const templateId = String(formData.get("templateId") || "");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("ליד לא נמצא");

  const tpl = templateId
    ? await prisma.documentTemplate.findUnique({ where: { id: templateId } })
    : await templateOf(type, lead.industry);
  if (!tpl || !("intro" in tpl)) throw new Error("תבנית לא נמצאה");

  const lines = parseTemplateLines("lineItemsJson" in tpl ? tpl.lineItemsJson : "[]");
  const totals = calcTotals(lines, 17);

  const doc = await prisma.document.create({
    data: {
      leadId,
      templateId: "id" in tpl ? tpl.id : null,
      type,
      title: `${tpl.title} — ${lead.fullName}`,
      intro: tpl.intro,
      body: tpl.body,
      footer: tpl.footer,
      vatRate: totals.vatRate,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      validUntil: type === "QUOTE" ? new Date(Date.now() + 14 * 86400000) : null,
      signToken: nanoid(24),
      signTokenExp: new Date(Date.now() + 30 * 86400000),
      status: "DRAFT",
      lineItems: {
        create: lines.map((line, index) => ({
          title: line.title,
          description: line.description || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          sortOrder: index,
        })),
      },
    },
  });

  await prisma.activity.create({
    data: {
      leadId,
      actorId: staff.id,
      type: "document_created",
      message: `נוצר מסמך מתבנית: ${tpl.name}`,
    },
  });
  revalidatePath(`/office/leads/${leadId}`);
  redirect(`/office/documents/${doc.id}`);
}

export async function saveDocumentAsTemplateAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const industry = String(formData.get("industry") || "general");
  const name = String(formData.get("name") || "").trim();
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { lineItems: true, lead: true },
  });
  if (!doc) throw new Error("מסמך לא נמצא");

  await prisma.documentTemplate.create({
    data: {
      type: doc.type,
      industry,
      name: name || `${doc.title} — תבנית`,
      title: doc.title,
      intro: doc.intro,
      body: doc.body,
      footer: doc.footer,
      isDefault: false,
      lineItemsJson: JSON.stringify(
        doc.lineItems.map((l) => ({
          title: l.title,
          description: l.description ?? "",
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
        })),
      ),
    },
  });
  await prisma.activity.create({
    data: {
      leadId: doc.leadId,
      actorId: staff.id,
      type: "template_saved",
      message: `נשמרה תבנית לפי ענף`,
    },
  });
  revalidatePath("/office/templates");
  revalidatePath(`/office/documents/${id}`);
}

export async function updateTemplateAction(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const lines = parseLines(formData.get("lineItems"));
  await prisma.documentTemplate.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      title: String(formData.get("title") || ""),
      intro: String(formData.get("intro") || ""),
      body: String(formData.get("body") || ""),
      footer: String(formData.get("footer") || ""),
      lineItemsJson: JSON.stringify(lines),
    },
  });
  revalidatePath("/office/templates");
  revalidatePath(`/office/templates/${id}`);
}

export async function createDocumentAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  const type = String(formData.get("type") || "QUOTE");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  const tpl = await templateOf(type, lead?.industry);
  const lines = parseLines(formData.get("lineItems"));
  const vatRate = Number(formData.get("vatRate") || 17);
  const totals = calcTotals(lines, vatRate);
  const validDays = Number(formData.get("validDays") || 14);
  const customNotes = String(formData.get("customNotes") || "").trim() || null;
  const title = String(formData.get("title") || tpl.title);
  const intro = String(formData.get("intro") || tpl.intro);
  const body = String(formData.get("body") || tpl.body);
  const footer = String(formData.get("footer") || tpl.footer);

  const doc = await prisma.document.create({
    data: {
      leadId,
      type,
      title,
      intro,
      body,
      footer,
      customNotes,
      vatRate: totals.vatRate,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      validUntil: type === "QUOTE" ? new Date(Date.now() + validDays * 86400000) : null,
      signToken: nanoid(24),
      signTokenExp: new Date(Date.now() + 30 * 86400000),
      status: "DRAFT",
      lineItems: {
        create: lines.map((line, index) => ({
          title: line.title,
          description: line.description || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          sortOrder: index,
        })),
      },
    },
  });

  await prisma.activity.create({
    data: {
      leadId,
      actorId: staff.id,
      type: "document_created",
      message: `נוצר מסמך: ${title}`,
    },
  });

  revalidatePath("/office/documents");
  revalidatePath(`/office/leads/${leadId}`);
  return doc.id;
}

export async function updateDocumentAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const existing = await prisma.document.findUnique({
    where: { id },
    include: { lineItems: true },
  });
  if (!existing || existing.status === "SIGNED") {
    throw new Error("לא ניתן לערוך מסמך חתום");
  }

  const lines = parseLines(formData.get("lineItems"));
  const vatRate = Number(formData.get("vatRate") || existing.vatRate);
  const totals = calcTotals(lines, vatRate);

  await prisma.documentLineItem.deleteMany({ where: { documentId: id } });
  await prisma.document.update({
    where: { id },
    data: {
      title: String(formData.get("title") || existing.title),
      intro: String(formData.get("intro") || existing.intro),
      body: String(formData.get("body") || existing.body),
      footer: String(formData.get("footer") || existing.footer),
      customNotes: String(formData.get("customNotes") || "").trim() || null,
      vatRate: totals.vatRate,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      lineItems: {
        create: lines.map((line, index) => ({
          title: line.title,
          description: line.description || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          sortOrder: index,
        })),
      },
    },
  });

  await prisma.activity.create({
    data: {
      leadId: existing.leadId,
      actorId: staff.id,
      type: "document_updated",
      message: `עודכן מסמך: ${existing.title}`,
    },
  });
  revalidatePath(`/office/documents/${id}`);
  revalidatePath(`/office/leads/${existing.leadId}`);
}

export async function sendDocumentAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const doc = await prisma.document.update({
    where: { id },
    data: { status: "SENT" },
    include: { lead: { include: { conversation: true } } },
  });

  const appUrlValue = appUrl();
  const link = `${appUrlValue}/sign/${doc.signToken}`;

  await sendSignLinkMessage({
    leadId: doc.leadId,
    staffId: staff.id,
    phone: doc.lead.phone,
    title: `נשלח אליך מסמך לחתימה: ${doc.title}`,
    link,
    conversationId: doc.lead.conversation?.id,
  });

  if (doc.type === "QUOTE") {
    await prisma.lead.update({
      where: { id: doc.leadId },
      data: { stage: "QUOTE_SENT" },
    });
  } else if (doc.type === "CONTRACT" || doc.type === "TERMS") {
    await prisma.lead.update({
      where: { id: doc.leadId },
      data: { stage: "CONTRACT" },
    });
  }

  await prisma.activity.create({
    data: {
      leadId: doc.leadId,
      actorId: staff.id,
      type: "document_sent",
      message: `נשלח לחתימה: ${doc.title}`,
    },
  });

  revalidatePath("/office");
  revalidatePath(`/office/documents/${id}`);
  revalidatePath(`/office/leads/${doc.leadId}`);
  revalidatePath("/portal");
  redirect(`/office/leads/${doc.leadId}`);
}

export async function signDocumentAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const token = String(formData.get("token") || "");
  const signerName = String(formData.get("signerName") || "").trim();
  const imageData = String(formData.get("imageData") || "");
  if (!signerName || !imageData.startsWith("data:image")) {
    throw new Error("נדרשת חתימה ושם החותם");
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { lineItems: true, lead: true },
  });
  if (!doc) throw new Error("מסמך לא נמצא");
  if (doc.status === "SIGNED") throw new Error("המסמך כבר נחתם");
  if (doc.signToken !== token) throw new Error("קישור חתימה לא תקין");
  if (doc.signTokenExp && doc.signTokenExp < new Date()) {
    throw new Error("פג תוקף קישור החתימה");
  }

  const hdrs = await headers();
  const hash = documentHash({
    title: doc.title,
    intro: doc.intro,
    body: doc.body,
    footer: doc.footer,
    customNotes: doc.customNotes,
    subtotal: doc.subtotal,
    vatAmount: doc.vatAmount,
    total: doc.total,
    lineItems: doc.lineItems,
  });

  await prisma.signature.create({
    data: {
      documentId: doc.id,
      signerName,
      signerRole: "CLIENT",
      imageData,
      ipAddress: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip"),
      userAgent: hdrs.get("user-agent"),
      contentHash: hash,
    },
  });

  await prisma.document.update({
    where: { id: doc.id },
    data: { status: "SIGNED", lockedAt: new Date() },
  });

  if (doc.type === "QUOTE") {
    await prisma.lead.update({
      where: { id: doc.leadId },
      data: { stage: "QUOTE_SIGNED" },
    });
  } else if (doc.type === "CONTRACT" || doc.type === "TERMS") {
    const siblings = await prisma.document.findMany({
      where: { leadId: doc.leadId, type: { in: ["CONTRACT", "TERMS"] } },
    });
    const allSigned = siblings.every((s) => s.id === doc.id || s.status === "SIGNED");
    await prisma.lead.update({
      where: { id: doc.leadId },
      data: { stage: allSigned ? "PAYMENT" : "CONTRACT" },
    });
  }

  await prisma.activity.create({
    data: {
      leadId: doc.leadId,
      type: "document_signed",
      message: `${signerName} חתם/ה על ${doc.title}`,
    },
  });

  if (doc.lead.clientUserId) {
    try {
      await requireClient();
    } catch {
      // public sign link is allowed without portal session
    }
  }

  revalidatePath("/office");
  revalidatePath("/portal");
  revalidatePath(`/office/documents/${id}`);
  revalidatePath("/office/templates");
  revalidatePath(`/sign/${token}`);
}

export async function resendDocumentAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const stay = String(formData.get("stay") || "");
  const doc = await prisma.document.update({
    where: { id },
    data: {
      status: "SENT",
      signTokenExp: new Date(Date.now() + 30 * 86400000),
    },
    include: { lead: { include: { conversation: true } } },
  });
  const link = `${appUrl()}/sign/${doc.signToken}`;
  await sendSignLinkMessage({
    leadId: doc.leadId,
    staffId: staff.id,
    phone: doc.lead.phone,
    title: `תזכורת לחתימה: ${doc.title}`,
    link,
    conversationId: doc.lead.conversation?.id,
  });
  await prisma.activity.create({
    data: {
      leadId: doc.leadId,
      actorId: staff.id,
      type: "document_resent",
      message: `נשלח שוב לחתימה: ${doc.title}`,
    },
  });
  revalidatePath("/office/templates");
  revalidatePath("/office/documents");
  revalidatePath(`/office/documents/${id}`);
  revalidatePath(`/office/leads/${doc.leadId}`);
  if (stay === "templates") {
    redirect("/office/templates");
  }
}

export async function sendTemplateDirectAction(formData: FormData) {
  const staff = await requireStaff();
  const templateId = String(formData.get("templateId") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const localeRaw = String(formData.get("locale") || "he");
  const locale = isLocale(localeRaw) ? localeRaw : "he";
  if (!fullName || !phone) throw new Error("שם וטלפון הם חובה");

  const tpl = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) throw new Error("תבנית לא נמצאה");

  const editedTitle = String(formData.get("title") || "").trim();
  const editedIntro = String(formData.get("intro") || "");
  const editedBody = String(formData.get("body") || "");
  const editedFooter = String(formData.get("footer") || "");
  const customNotes = String(formData.get("customNotes") || "").trim() || null;
  const vatRate = Number(formData.get("vatRate") || 17);
  const editedLines = parseLines(formData.get("lineItems"));
  const overlay = legalOverlay(tpl.type, locale);
  const hasEdits = Boolean(editedTitle || editedIntro || editedBody);
  const lines = editedLines.length ? editedLines : parseTemplateLines(tpl.lineItemsJson);
  const totals = calcTotals(lines, vatRate);

  const lead = await findOrCreateLeadByPhone({
    staffId: staff.id,
    fullName,
    phone,
    locale,
  });

  const doc = await prisma.document.create({
    data: {
      leadId: lead.id,
      templateId: tpl.id,
      type: tpl.type,
      title: `${(hasEdits ? editedTitle : overlay?.title ?? tpl.title) || tpl.title} — ${fullName}`,
      locale,
      intro: hasEdits ? editedIntro : overlay?.intro ?? tpl.intro,
      body: hasEdits ? editedBody : overlay?.body ?? tpl.body,
      footer: hasEdits ? editedFooter : overlay?.footer ?? tpl.footer,
      customNotes,
      vatRate: totals.vatRate,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      validUntil: tpl.type === "QUOTE" ? new Date(Date.now() + 14 * 86400000) : null,
      signToken: nanoid(24),
      signTokenExp: new Date(Date.now() + 30 * 86400000),
      status: "SENT",
      lineItems: {
        create: lines.map((line, index) => ({
          title: line.title,
          description: line.description || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          sortOrder: index,
        })),
      },
    },
  });

  if (tpl.type === "QUOTE") {
    await prisma.lead.update({ where: { id: lead.id }, data: { stage: "QUOTE_SENT", locale } });
  } else {
    await prisma.lead.update({ where: { id: lead.id }, data: { stage: "CONTRACT", locale } });
  }

  const link = `${appUrl()}/sign/${doc.signToken}`;
  await sendSignLinkMessage({
    leadId: lead.id,
    staffId: staff.id,
    phone: lead.phone,
    title: `מסמך לחתימה: ${doc.title}`,
    link,
    conversationId: lead.conversation?.id,
  });
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      actorId: staff.id,
      type: "document_sent",
      message: `נשלח ישירות מתבנית: ${tpl.name}`,
    },
  });
  revalidatePath("/office/templates");
  revalidatePath("/office/leads");
  redirect(`/office/templates?sent=${doc.id}`);
}
