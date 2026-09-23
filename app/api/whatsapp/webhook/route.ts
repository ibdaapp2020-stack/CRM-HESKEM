import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsAppProvider } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = await getWhatsAppProvider();
  const result = provider.verifyWebhook?.({
    mode: url.searchParams.get("hub.mode") ?? undefined,
    token: url.searchParams.get("hub.verify_token") ?? undefined,
    challenge: url.searchParams.get("hub.challenge") ?? undefined,
  });
  if (result?.ok) {
    return new NextResponse(result.challenge ?? "ok", { status: 200 });
  }
  return NextResponse.json(
    { ok: true, provider: provider.channel, message: "WhatsApp webhook ready" },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const provider = await getWhatsAppProvider();
  const payload = await request.json().catch(() => null);
  const inbound = provider.parseWebhook?.(payload) ?? [];

  for (const msg of inbound) {
    const digits = msg.fromPhone.replace(/\D/g, "");
    let lead = await prisma.lead.findFirst({
      where: { phone: { contains: digits.slice(-9) } },
      include: { conversation: true },
    });
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          fullName: msg.fromPhone,
          phone: digits,
          source: "whatsapp",
          stage: "NEW_LEAD",
          conversation: { create: { channel: "cloud_api" } },
        },
        include: { conversation: true },
      });
    }
    if (!lead.conversation) continue;
    await prisma.message.create({
      data: {
        conversationId: lead.conversation.id,
        direction: "inbound",
        channel: "cloud_api",
        body: msg.body,
      },
    });
    await prisma.conversation.update({
      where: { id: lead.conversation.id },
      data: { lastAt: new Date(), unread: { increment: 1 }, channel: "cloud_api" },
    });
  }

  return NextResponse.json({ ok: true, received: inbound.length });
}
