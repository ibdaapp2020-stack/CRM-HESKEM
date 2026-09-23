import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const provider = getPaymentProvider();
  const parsed = provider.parseWebhook?.(payload);
  if (!parsed) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.payment.updateMany({
    where: { providerRef: parsed.providerRef },
    data: {
      status: parsed.status,
      paidAt: parsed.status === "COMPLETED" ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
