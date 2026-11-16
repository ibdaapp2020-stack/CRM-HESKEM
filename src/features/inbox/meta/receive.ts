import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getInstagramConfig } from "@/features/inbox/instagram/config";
import { ingestMetaEvent } from "@/features/inbox/meta/ingest";
import { parseMetaWebhook } from "@/features/inbox/meta/parse";
import { getWhatsAppConfig } from "@/features/inbox/whatsapp";
import { verifyMetaSignature } from "@/features/inbox/whatsapp/verify-signature";

function tokenMatches(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (!left.length || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function verifyMetaWebhook(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode") ?? "";
  const token = url.searchParams.get("hub.verify_token") ?? "";
  const challenge = url.searchParams.get("hub.challenge") ?? "";
  const [whatsapp, instagram] = await Promise.all([getWhatsAppConfig(), getInstagramConfig()]);
  const expected = [whatsapp.verifyToken, instagram.verifyToken].filter(Boolean);
  const accepted =
    mode === "subscribe" &&
    Boolean(challenge) &&
    expected.some((value) => tokenMatches(token, value));
  if (accepted) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (mode === "subscribe") return new NextResponse("forbidden", { status: 403 });
  return NextResponse.json({ ok: true, webhook: "ready" });
}

export async function receiveMetaWebhook(request: Request) {
  const [whatsapp, instagram] = await Promise.all([getWhatsAppConfig(), getInstagramConfig()]);
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const secret = whatsapp.appSecret || instagram.appSecret;
  if (!verifyMetaSignature(rawBody, signature, secret)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody || "null");
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }

  const events = parseMetaWebhook(payload);
  let stored = 0;
  let duplicates = 0;
  for (const event of events) {
    const result = await ingestMetaEvent(event);
    if (result.duplicate) duplicates += 1;
    else stored += 1;
  }
  return NextResponse.json({ ok: true, stored, duplicates });
}
