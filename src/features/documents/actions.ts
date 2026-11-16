"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { requireClient, requireStaff } from "@/lib/auth";
import {
  addActivity,
  createDocument,
  createDocumentTemplate,
  findDocumentTemplate,
  getConversationByLead,
  getDocument,
  getDocumentTemplate,
  getLead,
  listDocumentsForLead,
  saveSignature,
  updateDocument,
  updateDocumentTemplate,
  updateLead,
} from "@/services/firestore/crm";
import { calcTotals } from "./calc";
import { documentHash } from "./hash";
import { DEFAULT_DOCUMENT_TEMPLATES } from "./defaults";
import type { TemplateLine } from "@/lib/industries";
import { appUrl, findOrCreateLeadByPhone, sendSignLinkMessage } from "@/features/inbox/messaging";
import { isLocale } from "@/lib/i18n";
import { legalOverlay } from "./legal-i18n";

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
  const existing = await findDocumentTemplate(type, industry);
  if (existing) return existing;
  const fallback = DEFAULT_DOCUMENT_TEMPLATES.find((item) => item.type === type);
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
  const lead = await getLead(leadId);
  if (!lead) throw new Error("ליד לא נמצא");

  const tpl = templateId ? await getDocumentTemplate(templateId) : await templateOf(type, String(lead.industry ?? ""));
  if (!tpl || !("intro" in tpl)) throw new Error("תבנית לא נמצאה");

  const lines = parseTemplateLines("lineItemsJson" in tpl ? tpl.lineItemsJson : "[]");
  const totals = calcTotals(lines, 17);

  const doc = await createDocument({
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
    lineItems: lines.map((line, index) => ({
      title: line.title,
      description: line.description || null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      sortOrder: index,
    })),
  });

  await addActivity({
    leadId,
    actorId: staff.id,
    type: "document_created",
    message: `נוצר מסמך מתבנית: ${tpl.name}`,
  });
  revalidatePath(`/office/leads/${leadId}`);
  redirect(`/office/documents/${doc.id}`);
}

export async function saveDocumentAsTemplateAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const industry = String(formData.get("industry") || "general");
  const name = String(formData.get("name") || "").trim();
  const doc = await getDocument(id, false);
  if (!doc) throw new Error("מסמך לא נמצא");

  await createDocumentTemplate({
    type: doc.type,
    industry,
    name: name || `${doc.title} — תבנית`,
    title: doc.title,
    intro: doc.intro,
    body: doc.body,
    footer: doc.footer,
    isDefault: false,
    lineItemsJson: JSON.stringify(
      (doc.lineItems as { title: string; description?: string | null; quantity: number; unitPrice: number; discount: number }[]).map((line) => ({
        title: line.title,
        description: line.description ?? "",
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
      })),
    ),
  });
  await addActivity({
    leadId: String(doc.leadId),
    actorId: staff.id,
    type: "template_saved",
    message: "נשמרה תבנית לפי ענף",
  });
  revalidatePath("/office/templates");
  revalidatePath(`/office/documents/${id}`);
}

export async function updateTemplateAction(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const lines = parseLines(formData.get("lineItems"));
  await updateDocumentTemplate(id, {
    name: String(formData.get("name") || "").trim() || undefined,
    title: String(formData.get("title") || ""),
    intro: String(formData.get("intro") || ""),
    body: String(formData.get("body") || ""),
    footer: String(formData.get("footer") || ""),
    lineItemsJson: JSON.stringify(lines),
  });
  revalidatePath("/office/templates");
  revalidatePath(`/office/templates/${id}`);
}

export async function createDocumentAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  const type = String(formData.get("type") || "QUOTE");
  const lead = await getLead(leadId);
  const tpl = await templateOf(type, lead?.industry ? String(lead.industry) : null);
  const lines = parseLines(formData.get("lineItems"));
  const vatRate = Number(formData.get("vatRate") || 17);
  const totals = calcTotals(lines, vatRate);
  const validDays = Number(formData.get("validDays") || 14);
  const customNotes = String(formData.get("customNotes") || "").trim() || null;
  const title = String(formData.get("title") || tpl.title);
  const intro = String(formData.get("intro") || tpl.intro);
  const body = String(formData.get("body") || tpl.body);
  const footer = String(formData.get("footer") || tpl.footer);

  const doc = await createDocument({
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
    lineItems: lines.map((line, index) => ({
      title: line.title,
      description: line.description || null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      sortOrder: index,
    })),
  });

  await addActivity({
    leadId,
    actorId: staff.id,
    type: "document_created",
    message: `נוצר מסמך: ${title}`,
  });

  revalidatePath("/office/documents");
  revalidatePath(`/office/leads/${leadId}`);
  return doc.id;
}

export async function updateDocumentAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const existing = await getDocument(id, false);
  if (!existing || existing.status === "SIGNED") {
    throw new Error("לא ניתן לערוך מסמך חתום");
  }

  const lines = parseLines(formData.get("lineItems"));
  const vatRate = Number(formData.get("vatRate") || existing.vatRate);
  const totals = calcTotals(lines, vatRate);

  await updateDocument(id, {
    title: String(formData.get("title") || existing.title),
    intro: String(formData.get("intro") || existing.intro),
    body: String(formData.get("body") || existing.body),
    footer: String(formData.get("footer") || existing.footer),
    customNotes: String(formData.get("customNotes") || "").trim() || null,
    vatRate: totals.vatRate,
    subtotal: totals.subtotal,
    vatAmount: totals.vatAmount,
    total: totals.total,
    lineItems: lines.map((line, index) => ({
      title: line.title,
      description: line.description || null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      sortOrder: index,
    })),
  });

  await addActivity({
    leadId: String(existing.leadId),
    actorId: staff.id,
    type: "document_updated",
    message: `עודכן מסמך: ${existing.title}`,
  });
  revalidatePath(`/office/documents/${id}`);
  revalidatePath(`/office/leads/${existing.leadId}`);
}

export async function sendDocumentAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const doc = await updateDocument(id, { status: "SENT" });
  if (!doc?.lead) throw new Error("מסמך לא נמצא");
  const conversation = await getConversationByLead(String(doc.leadId));

  const appUrlValue = appUrl();
  const link = `${appUrlValue}/sign/${doc.signToken}`;

  await sendSignLinkMessage({
    leadId: String(doc.leadId),
    staffId: staff.id,
    phone: String(doc.lead.phone ?? ""),
    title: `נשלח אליך מסמך לחתימה: ${doc.title}`,
    link,
    conversationId: conversation ? String(conversation.id) : null,
  });

  if (doc.type === "QUOTE") {
    await updateLead(String(doc.leadId), { stage: "QUOTE_SENT" });
  } else if (doc.type === "CONTRACT" || doc.type === "TERMS") {
    await updateLead(String(doc.leadId), { stage: "CONTRACT" });
  }

  await addActivity({
    leadId: String(doc.leadId),
    actorId: staff.id,
    type: "document_sent",
    message: `נשלח לחתימה: ${doc.title}`,
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

  const doc = await getDocument(id, false);
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

  await saveSignature({
    documentId: String(doc.id),
    signerName,
    signerRole: "CLIENT",
    imageData,
    ipAddress: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip"),
    userAgent: hdrs.get("user-agent"),
    contentHash: hash,
  });

  await updateDocument(String(doc.id), { status: "SIGNED", lockedAt: new Date() });

  if (doc.type === "QUOTE") {
    await updateLead(String(doc.leadId), { stage: "QUOTE_SIGNED" });
  } else if (doc.type === "CONTRACT" || doc.type === "TERMS") {
    const siblings = await listDocumentsForLead(String(doc.leadId));
    const relevant = siblings.filter((item) => item.type === "CONTRACT" || item.type === "TERMS");
    const allSigned = relevant.every((item) => item.id === doc.id || item.status === "SIGNED");
    await updateLead(String(doc.leadId), { stage: allSigned ? "PAYMENT" : "CONTRACT" });
  }

  await addActivity({
    leadId: String(doc.leadId),
    type: "document_signed",
    message: `${signerName} חתם/ה על ${doc.title}`,
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
  const doc = await updateDocument(id, {
    status: "SENT",
    signTokenExp: new Date(Date.now() + 30 * 86400000),
  });
  if (!doc?.lead) throw new Error("מסמך לא נמצא");
  const conversation = await getConversationByLead(String(doc.leadId));
  const link = `${appUrl()}/sign/${doc.signToken}`;
  await sendSignLinkMessage({
    leadId: String(doc.leadId),
    staffId: staff.id,
    phone: String(doc.lead.phone ?? ""),
    title: `תזכורת לחתימה: ${doc.title}`,
    link,
    conversationId: conversation ? String(conversation.id) : null,
  });
  await addActivity({
    leadId: String(doc.leadId),
    actorId: staff.id,
    type: "document_resent",
    message: `נשלח שוב לחתימה: ${doc.title}`,
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

  const tpl = await getDocumentTemplate(templateId);
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
  const lines = editedLines.length ? editedLines : parseTemplateLines(String(tpl.lineItemsJson ?? "[]"));
  const totals = calcTotals(lines, vatRate);

  const lead = await findOrCreateLeadByPhone({
    staffId: staff.id,
    fullName,
    phone,
    locale,
  });

  const doc = await createDocument({
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
    lineItems: lines.map((line, index) => ({
      title: line.title,
      description: line.description || null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      sortOrder: index,
    })),
  });

  if (tpl.type === "QUOTE") {
    await updateLead(String(lead.id), { stage: "QUOTE_SENT", locale });
  } else {
    await updateLead(String(lead.id), { stage: "CONTRACT", locale });
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
  await addActivity({
    leadId: String(lead.id),
    actorId: staff.id,
    type: "document_sent",
    message: `נשלח ישירות מתבנית: ${tpl.name}`,
  });
  revalidatePath("/office/templates");
  revalidatePath("/office/leads");
  redirect(`/office/templates?sent=${doc.id}`);
}
