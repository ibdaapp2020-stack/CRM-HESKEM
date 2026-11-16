import {
  addActivity,
  addConversationAssignment,
  addMessage,
  claimWebhookEvent,
  createChannelThread,
  createLead,
  findConversationByExternalUser,
  findConversationByLeadChannel,
  findLeadByInstagram,
  findLeadByPhoneTail,
  findMessageByExternalId,
  getSetting,
  updateConversation,
  updateLead,
  updateMessage,
} from "@/services/firestore/crm";
import { customerWindowExpiry } from "./window";
import type { MetaEvent } from "./parse";

function digitsOf(phone: string) {
  return phone.replace(/\D/g, "");
}

async function autoCreateLead() {
  const setting = await getSetting("inbox_auto_create_lead");
  return setting?.value !== "no";
}

async function openThread(event: MetaEvent, lead: { id: string; clientUserId?: string | null; ownerId?: string | null; phone?: string | null; instagramUserId?: string | null; instagramUsername?: string | null } | null) {
  const existing = lead
    ? await findConversationByLeadChannel(String(lead.id), event.channel)
    : await findConversationByExternalUser(event.channel, event.externalUserId || "");
  if (existing) return existing;
  const external = await findConversationByExternalUser(event.channel, event.externalUserId || "");
  if (external) return external;
  return createChannelThread({
    leadId: lead?.id ?? null,
    channel: event.channel,
    clientUserId: lead?.clientUserId ?? null,
    assigneeId: lead?.ownerId ?? null,
    phone: event.channel === "whatsapp" ? digitsOf(event.externalUserId || "") : lead?.phone ?? null,
    externalUserId: event.externalUserId ?? null,
    instagramUserId: event.channel === "instagram" ? event.externalUserId ?? null : lead?.instagramUserId ?? null,
    instagramUsername: event.username ?? lead?.instagramUsername ?? null,
  });
}

export async function ingestMetaEvent(event: MetaEvent) {
  const fresh = await claimWebhookEvent(event.eventId, {
    channel: event.channel,
    kind: event.kind,
    externalId: event.externalId ?? null,
  });
  if (!fresh) return { duplicate: true };

  if (event.kind === "status" && event.externalId && event.status) {
    const message = await findMessageByExternalId(event.channel, event.externalId);
    if (message) {
      await updateMessage(String(message.id), {
        status: event.status,
        statusAt: new Date(),
      });
    }
    return { duplicate: false, status: event.status };
  }

  if (event.kind === "routing") {
    const thread = await findConversationByExternalUser(event.channel, event.externalUserId || "");
    if (thread) {
      await updateConversation(String(thread.id), { routingState: event.routingState ?? null });
      await addActivity({
        leadId: thread.leadId ? String(thread.leadId) : null,
        type: "routing",
        message: `ניתוב שיחה: ${event.routingState}`,
      });
    }
    return { duplicate: false, routing: event.routingState };
  }

  if (event.externalId) {
    const existing = await findMessageByExternalId(event.channel, event.externalId);
    if (existing) return { duplicate: true };
  }

  const phoneTail = digitsOf(event.externalUserId || "").slice(-9);
  let lead =
    event.channel === "whatsapp"
      ? phoneTail
        ? await findLeadByPhoneTail(phoneTail)
        : null
      : event.externalUserId
        ? await findLeadByInstagram(event.externalUserId)
        : null;

  if (!lead && (await autoCreateLead())) {
    lead = await createLead(
      event.channel === "whatsapp"
        ? {
            fullName: event.profileName || event.externalUserId,
            phone: digitsOf(event.externalUserId || ""),
            source: event.referral ? "whatsapp_ad" : "whatsapp",
            campaignId: event.referral?.sourceId || null,
            campaignName: event.referral?.body || event.referral?.sourceType || null,
            campaignHeadline: event.referral?.headline || null,
            ctwaClid: event.referral?.ctwaClid || null,
            stage: "NEW_LEAD",
          }
        : {
            fullName: event.username || event.profileName || "Instagram",
            phone: "",
            source: "instagram",
            instagramUserId: event.externalUserId,
            instagramUsername: event.username || null,
            stage: "NEW_LEAD",
          },
    );
  } else if (lead && event.channel === "whatsapp" && event.referral) {
    lead = await updateLead(String(lead.id), {
      source: "whatsapp_ad",
      campaignId: event.referral.sourceId || lead.campaignId,
      campaignName: event.referral.body || event.referral.sourceType || lead.campaignName,
      campaignHeadline: event.referral.headline || lead.campaignHeadline,
      ctwaClid: event.referral.ctwaClid || lead.ctwaClid,
      fullName: lead.fullName === lead.phone && event.profileName ? event.profileName : lead.fullName,
    });
  } else if (lead && event.channel === "instagram" && event.username && !lead.instagramUsername) {
    lead = await updateLead(String(lead.id), { instagramUsername: event.username });
  }

  const thread = await openThread(event, lead);
  const inboundAt = event.createdAt ?? new Date();
  await addMessage({
    conversationId: thread.id,
    leadId: lead?.id ?? thread.leadId ?? null,
    direction: event.direction,
    channel: event.channel,
    body: event.body,
    messageType: event.messageType,
    externalId: event.externalId ?? null,
    mediaUrl: event.mediaUrl ?? null,
    mediaId: event.mediaId ?? null,
    mimeType: event.mimeType ?? null,
    fileName: event.fileName ?? null,
    senderId: event.direction === "inbound" ? event.externalUserId ?? null : null,
    status: event.direction === "inbound" ? "received" : "sent",
    createdAt: inboundAt,
  });

  const preview = event.body.slice(0, 180);
  const patch: Record<string, unknown> = {
    lastAt: inboundAt,
    lastMessagePreview: preview,
    channel: event.channel,
    externalUserId: event.externalUserId ?? thread.externalUserId ?? null,
    phone: event.channel === "whatsapp" ? digitsOf(event.externalUserId || "") : thread.phone ?? null,
    instagramUserId: event.channel === "instagram" ? event.externalUserId ?? null : thread.instagramUserId ?? null,
    instagramUsername: event.username ?? thread.instagramUsername ?? null,
    leadId: lead?.id ?? thread.leadId ?? null,
    clientUserId: lead?.clientUserId ?? thread.clientUserId ?? null,
  };
  if (event.direction === "inbound") {
    patch.unread = { increment: 1 };
    patch.customerWindowExpiresAt = customerWindowExpiry(inboundAt);
    if (thread.status === "closed") patch.status = "new";
  }
  await updateConversation(String(thread.id), patch);
  if (lead) {
    await addActivity({
      leadId: String(lead.id),
      type: event.referral ? "campaign" : "message",
      message:
        event.direction === "outbound"
          ? `הודעה שנשלחה מחוץ ל-CRM (${event.channel})`
          : event.channel === "instagram"
            ? "הודעת Instagram נכנסה"
            : "הודעת וואטסאפ נכנסה",
    });
  }
  return { duplicate: false, conversationId: thread.id, leadId: lead?.id ?? null };
}

export async function recordAssignment(input: {
  conversationId: string;
  leadId?: string | null;
  fromId?: string | null;
  toId: string | null;
  toName: string | null;
  actorId: string;
}) {
  await addConversationAssignment({
    conversationId: input.conversationId,
    leadId: input.leadId ?? null,
    fromId: input.fromId ?? null,
    toId: input.toId,
    toName: input.toName,
    actorId: input.actorId,
  });
}
