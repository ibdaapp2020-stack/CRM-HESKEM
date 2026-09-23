"use server";

import { revalidatePath } from "next/cache";
import { requireClient, requireStaff } from "../auth";
import { prisma } from "../prisma";
import { getPaymentProvider } from "../payments";

export async function startCheckoutAction(formData: FormData) {
  const client = await requireClient();
  const lead = await prisma.lead.findUnique({
    where: { clientUserId: client.id },
    include: { documents: { where: { type: "QUOTE", status: "SIGNED" } } },
  });
  if (!lead) throw new Error("לא נמצא תיק לקוח");

  const amount = Number(formData.get("amount") || lead.documents[0]?.total || 0);
  if (!amount) throw new Error("אין סכום לחיוב");

  const provider = getPaymentProvider();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const checkout = await provider.createCheckout({
    leadId: lead.id,
    amount,
    customerName: lead.fullName,
    customerEmail: lead.email,
    returnUrl: appUrl,
    purpose: "account_close",
  });

  await prisma.payment.create({
    data: {
      leadId: lead.id,
      amount,
      status: "PENDING",
      provider: provider.id,
      providerRef: checkout.providerRef,
      purpose: "account_close",
    },
  });

  revalidatePath("/portal/payment");
  return checkout.checkoutUrl;
}

export async function completeSandboxPaymentAction(formData: FormData) {
  const client = await requireClient();
  const lead = await prisma.lead.findUnique({
    where: { clientUserId: client.id },
  });
  if (!lead) throw new Error("לא נמצא תיק לקוח");

  const ref = String(formData.get("ref") || "");
  const amount = Number(formData.get("amount") || 0);
  const provider = getPaymentProvider();
  const token = provider.saveToken({ sandbox: true });

  await prisma.paymentMethod.create({
    data: {
      leadId: lead.id,
      provider: provider.id,
      token: token.token,
      last4: token.last4,
      brand: token.brand,
      expMonth: token.expMonth,
      expYear: token.expYear,
    },
  });

  await prisma.payment.updateMany({
    where: { leadId: lead.id, providerRef: ref },
    data: { status: "COMPLETED", paidAt: new Date() },
  });

  const charge = await provider.charge({ token: token.token, amount });
  if (!charge.ok) throw new Error("החיוב נכשל");

  const existingProject = await prisma.project.findUnique({
    where: { leadId: lead.id },
  });
  if (!existingProject) {
    await prisma.project.create({
      data: {
        leadId: lead.id,
        name: `הקמת מערכת — ${lead.fullName}`,
        status: "PLANNING",
        summary: "הפרויקט נפתח אוטומטית לאחר סגירת החשבון",
        milestones: {
          create: [
            { title: "אפיון ואיסוף חומרים", sortOrder: 0 },
            { title: "בניית תשתית", sortOrder: 1 },
            { title: "פיתוח ליבה", sortOrder: 2 },
            { title: "בדיקות והדרכה", sortOrder: 3 },
            { title: "עלייה לאוויר", sortOrder: 4 },
          ],
        },
      },
    });
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { stage: "ONBOARDING" },
  });
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      actorId: client.id,
      type: "payment",
      message: "אמצעי אשראי עודכן והחשבון נסגר (sandbox)",
    },
  });

  revalidatePath("/portal");
  revalidatePath("/portal/payment");
  revalidatePath("/office");
}

export async function recordManualPaymentAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  const amount = Number(formData.get("amount") || 0);
  if (!amount) throw new Error("יש להזין סכום");

  await prisma.payment.create({
    data: {
      leadId,
      amount,
      status: "COMPLETED",
      provider: "manual",
      purpose: String(formData.get("purpose") || "account_close"),
      paidAt: new Date(),
    },
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: { stage: "ONBOARDING" },
  });
  await prisma.activity.create({
    data: {
      leadId,
      actorId: staff.id,
      type: "payment_manual",
      message: `נרשם תשלום ידני על ${amount} ₪`,
    },
  });
  revalidatePath(`/office/leads/${leadId}`);
  revalidatePath("/office");
}
