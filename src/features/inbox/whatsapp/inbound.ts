import { ingestMetaEvent } from "@/features/inbox/meta/ingest";
import { webhookEventId } from "@/features/inbox/meta/parse";
import type { InboundMessage } from "./types";

export async function ingestInboundWhatsApp(msg: InboundMessage) {
  const externalId = msg.externalId || `local-${msg.fromPhone}-${msg.body.slice(0, 24)}`;
  const result = await ingestMetaEvent({
    eventId: webhookEventId("whatsapp", [externalId, "message"]),
    channel: "whatsapp",
    kind: "message",
    externalId,
    externalUserId: msg.fromPhone,
    profileName: msg.profileName,
    direction: "inbound",
    body: msg.body,
    messageType: "text",
    referral: msg.referral,
  });
  return result.leadId ?? null;
}
