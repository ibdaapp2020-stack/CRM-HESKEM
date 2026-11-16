"use server";

import { revalidatePath } from "next/cache";
import { requireClient, requireStaff } from "@/lib/auth";
import {
  addActivity,
  createPayment,
  createPaymentMethod,
  createProject,
  getLeadByClient,
  getProjectByLead,
  listDocumentsForLead,
  updateLead,
  updatePayments,
} from "@/services/firestore/crm";
import { getPaymentProvider } from "@/features/payments";

export async function startCheckoutAction(formData: FormData) {
  const client = await requireClient();
  const lead = await getLeadByClient(client.id);
  if (!lead) throw new Error("לא נמצא תיק לקוח");
  const quotes = (await listDocumentsForLead(String(lead.id))).filter(
    (document) => document.type === "QUOTE" && document.status === "SIGNED",
  );
  const amount = Number(formData.get("amount") || quotes[0]?.total || 0);
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

  await createPayment({
    leadId: lead.id,
    amount,
    status: "PENDING",
    provider: provider.id,
    providerRef: checkout.providerRef,
    purpose: "account_close",
  });

  revalidatePath("/portal/payment");
  return checkout.checkoutUrl;
}

export async function completeSandboxPaymentAction(formData: FormData) {
  const client = await requireClient();
  const lead = await getLeadByClient(client.id);
  if (!lead) throw new Error("לא נמצא תיק לקוח");

  const ref = String(formData.get("ref") || "");
  const amount = Number(formData.get("amount") || 0);
  const provider = getPaymentProvider();
  const token = provider.saveToken({ sandbox: true });

  await createPaymentMethod({
    leadId: lead.id,
    provider: provider.id,
    token: token.token,
    last4: token.last4,
    brand: token.brand,
    expMonth: token.expMonth,
    expYear: token.expYear,
  });

  await updatePayments(
    { leadId: String(lead.id), providerRef: ref },
    { status: "COMPLETED", paidAt: new Date() },
  );

  const charge = await provider.charge({ token: token.token, amount });
  if (!charge.ok) throw new Error("החיוב נכשל");

  const existingProject = await getProjectByLead(String(lead.id));
  if (!existingProject) {
    await createProject({
      leadId: lead.id,
      name: `הקמת מערכת — ${lead.fullName}`,
      status: "PLANNING",
      summary: "הפרויקט נפתח אוטומטית לאחר סגירת החשבון",
      milestones: [
        { title: "אפיון ואיסוף חומרים", sortOrder: 0 },
        { title: "בניית תשתית", sortOrder: 1 },
        { title: "פיתוח ליבה", sortOrder: 2 },
        { title: "בדיקות והדרכה", sortOrder: 3 },
        { title: "עלייה לאוויר", sortOrder: 4 },
      ],
    });
  }

  await updateLead(String(lead.id), { stage: "ONBOARDING" });
  await addActivity({
    leadId: String(lead.id),
    actorId: client.id,
    type: "payment",
    message: "אמצעי אשראי עודכן והחשבון נסגר (sandbox)",
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

  await createPayment({
    leadId,
    amount,
    status: "COMPLETED",
    provider: "manual",
    purpose: String(formData.get("purpose") || "account_close"),
    paidAt: new Date(),
  });
  await updateLead(leadId, { stage: "ONBOARDING" });
  await addActivity({
    leadId,
    actorId: staff.id,
    type: "payment_manual",
    message: `נרשם תשלום ידני על ${amount} ₪`,
  });
  revalidatePath(`/office/leads/${leadId}`);
  revalidatePath("/office");
}
