"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "../auth";
import { prisma } from "../prisma";
import { getWhatsAppConfig } from "../whatsapp";
import { refreshWhatsAppAccountFromMeta } from "../whatsapp/account";

export async function saveWhatsAppSettingsAction(formData: FormData) {
  const staff = await requireStaff();
  const entries = [
    ["whatsapp_provider", String(formData.get("provider") || "inbox")],
    ["whatsapp_token", String(formData.get("token") || "").trim()],
    ["whatsapp_phone_id", String(formData.get("phoneNumberId") || "").trim()],
    ["whatsapp_waba_id", String(formData.get("wabaId") || "").trim()],
    ["whatsapp_verify_token", String(formData.get("verifyToken") || "").trim()],
    ["whatsapp_app_secret", String(formData.get("appSecret") || "").trim()],
  ] as const;

  for (const [key, value] of entries) {
    if (key !== "whatsapp_provider" && key !== "whatsapp_verify_token" && !value) {
      continue;
    }
    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  let accountNote = "עודכנו הגדרות וואטסאפ";
  try {
    const account = await refreshWhatsAppAccountFromMeta();
    if (account.connected && (account.displayName || account.displayPhone)) {
      accountNote = `וואטסאפ מחובר: ${account.displayName || ""} ${account.displayPhone || ""}`.trim();
      if (account.webhookStatus === "ok") accountNote += " · Webhook נרשם ב-Meta";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בחיבור Meta";
    await prisma.appSetting.upsert({
      where: { key: "whatsapp_last_error" },
      update: { value: message },
      create: { key: "whatsapp_last_error", value: message },
    });
    accountNote = `הגדרות נשמרו, חיבור Meta נכשל: ${message}`;
  }

  await prisma.activity.create({
    data: {
      actorId: staff.id,
      type: "settings",
      message: accountNote,
    },
  });
  revalidatePath("/office");
  revalidatePath("/office/settings");
  revalidatePath("/office/inbox");
}

export async function refreshWhatsAppAccountAction() {
  await requireStaff();
  try {
    await refreshWhatsAppAccountFromMeta();
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בחיבור Meta";
    await prisma.appSetting.upsert({
      where: { key: "whatsapp_last_error" },
      update: { value: message },
      create: { key: "whatsapp_last_error", value: message },
    });
  }
  revalidatePath("/office");
  revalidatePath("/office/settings");
  revalidatePath("/office/inbox");
}

export async function addReceiptAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  const amount = Number(formData.get("amount") || 0);
  if (!leadId || !amount) throw new Error("יש להזין סכום");

  await prisma.receipt.create({
    data: {
      leadId,
      method: String(formData.get("method") || "TRANSFER"),
      amount,
      receivedAt: new Date(String(formData.get("receivedAt") || Date.now())),
      reference: String(formData.get("reference") || "").trim() || null,
      bank: String(formData.get("bank") || "").trim() || null,
      checkNumber: String(formData.get("checkNumber") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });
  await prisma.activity.create({
    data: {
      leadId,
      actorId: staff.id,
      type: "receipt",
      message: `נרשם תקבול ${amount} ₪`,
    },
  });
  revalidatePath(`/office/leads/${leadId}`);
}

export async function saveSystemAccessAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  await prisma.systemAccess.create({
    data: {
      leadId,
      label: String(formData.get("label") || "מערכת הלקוח"),
      url: String(formData.get("url") || "").trim() || null,
      username: String(formData.get("username") || "").trim() || null,
      secret: String(formData.get("secret") || "").trim() || null,
      version: String(formData.get("version") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });
  await prisma.activity.create({
    data: {
      leadId,
      actorId: staff.id,
      type: "access",
      message: "נשמרה גישה למערכת הלקוח",
    },
  });
  revalidatePath(`/office/leads/${leadId}`);
}

export async function addSystemChangeAction(formData: FormData) {
  const staff = await requireStaff();
  const accessId = String(formData.get("accessId") || "");
  const leadId = String(formData.get("leadId") || "");
  const version = String(formData.get("version") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  if (!version || !summary) throw new Error("יש גרסה ותיאור שינוי");

  await prisma.systemChange.create({
    data: { accessId, version, summary },
  });
  await prisma.systemAccess.update({
    where: { id: accessId },
    data: { version },
  });
  await prisma.activity.create({
    data: {
      leadId,
      actorId: staff.id,
      type: "version",
      message: `גרסה ${version}: ${summary}`,
    },
  });
  revalidatePath(`/office/leads/${leadId}`);
}

export async function saveRetainerPlanAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  await prisma.retainerPlan.create({
    data: {
      leadId,
      title: String(formData.get("title") || "שירות שיווק חודשי"),
      unitLabel: String(formData.get("unitLabel") || "סרטונים"),
      quotaPerPeriod: Number(formData.get("quota") || 4),
    },
  });
  await prisma.activity.create({
    data: {
      leadId,
      actorId: staff.id,
      type: "retainer",
      message: "נפתח מעקב חודשי לשירות",
    },
  });
  revalidatePath(`/office/leads/${leadId}`);
}

export async function updateRetainerEntryAction(formData: FormData) {
  const staff = await requireStaff();
  const planId = String(formData.get("planId") || "");
  const leadId = String(formData.get("leadId") || "");
  const periodKey = String(formData.get("periodKey") || "");
  const delivered = Number(formData.get("delivered") || 0);
  const notes = String(formData.get("notes") || "").trim() || null;
  const plan = await prisma.retainerPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("אין תוכנית מעקב");

  const status = delivered >= plan.quotaPerPeriod ? "DONE" : "OPEN";
  await prisma.retainerEntry.upsert({
    where: { planId_periodKey: { planId, periodKey } },
    update: { delivered, notes, status },
    create: { planId, periodKey, delivered, notes, status },
  });
  await prisma.activity.create({
    data: {
      leadId,
      actorId: staff.id,
      type: "retainer_update",
      message: `${periodKey}: ${delivered}/${plan.quotaPerPeriod} ${plan.unitLabel}`,
    },
  });
  revalidatePath(`/office/leads/${leadId}`);
}

export async function currentWhatsAppSettings() {
  return getWhatsAppConfig();
}
