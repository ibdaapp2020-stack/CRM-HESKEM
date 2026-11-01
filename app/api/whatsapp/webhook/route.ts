import { NextResponse } from "next/server";
import { cloudProvider } from "@/lib/whatsapp/cloud-provider";
import { ingestInboundWhatsApp } from "@/lib/whatsapp/inbound";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { verifyMetaSignature } from "@/lib/whatsapp/verify-signature";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = await getWhatsAppConfig();
  const result = cloudProvider(config).verifyWebhook?.({
    mode: url.searchParams.get("hub.mode") ?? undefined,
    token: url.searchParams.get("hub.verify_token") ?? undefined,
    challenge: url.searchParams.get("hub.challenge") ?? undefined,
  });
  if (result?.ok) {
    return new NextResponse(result.challenge ?? "ok", { status: 200 });
  }
  if (url.searchParams.get("hub.mode") === "subscribe") {
    return new NextResponse("forbidden", { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    webhook: "ready",
    verifyTokenHint: "ibda-wa-verify",
  });
}

export async function POST(request: Request) {
  const config = await getWhatsAppConfig();
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature, config.appSecret)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody || "null");
  const inbound = cloudProvider(config).parseWebhook?.(payload) ?? [];
  for (const msg of inbound) {
    await ingestInboundWhatsApp(msg);
  }

  return NextResponse.json({ ok: true, received: inbound.length });
}
