import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWhatsAppConfig } from "@/features/inbox/whatsapp";
import { findMessageByMediaId } from "@/services/firestore/crm";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "STAFF") {
    return new NextResponse("forbidden", { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("mediaId") || "";
  if (!id) return new NextResponse("missing media", { status: 400 });
  const message = await findMessageByMediaId(id).catch(() => null);
  if (!message?.mediaId) return new NextResponse("not found", { status: 404 });
  const mediaId = String(message.mediaId);
  const config = await getWhatsAppConfig();
  if (!config.token) return new NextResponse("not configured", { status: 404 });

  const meta = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });
  const info = (await meta.json().catch(() => ({}))) as { url?: string; mime_type?: string };
  if (!meta.ok || !info.url) return new NextResponse("unavailable", { status: 404 });
  const file = await fetch(info.url, { headers: { Authorization: `Bearer ${config.token}` } });
  if (!file.ok || !file.body) return new NextResponse("unavailable", { status: 404 });
  return new NextResponse(file.body, {
    headers: {
      "Content-Type": info.mime_type || file.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
