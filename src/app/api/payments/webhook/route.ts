import { NextResponse } from "next/server";
import { updatePayments } from "@/services/firestore/crm";
import { getPaymentProvider } from "@/features/payments";
import {
  PAYMENT_SIGNATURE_HEADER,
  verifyPaymentWebhook,
} from "@/features/payments/verify-webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get(PAYMENT_SIGNATURE_HEADER);
  if (
    !verifyPaymentWebhook(rawBody, signature, process.env.PAYMENT_WEBHOOK_SECRET)
  ) {
    console.error("[payments] rejected unsigned webhook");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const parsed = provider.parseWebhook?.(payload);
  if (!parsed) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await updatePayments(
    { providerRef: parsed.providerRef },
    {
      status: parsed.status,
      paidAt: parsed.status === "COMPLETED" ? new Date() : null,
    },
  );

  return NextResponse.json({ ok: true });
}
