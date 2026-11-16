import {
  addActivity,
  addMessage,
  createConversation,
  createLead,
  findLeadByPhoneTail,
  getConversationByLead,
  updateConversation,
  updateLead,
} from "@/services/firestore/crm";
import type { InboundMessage } from "./types";

function digitsOf(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function ingestInboundWhatsApp(msg: InboundMessage) {
  const digits = digitsOf(msg.fromPhone);
  const tail = digits.slice(-9);
  let lead = await findLeadByPhoneTail(tail);
  let conversation = lead ? await getConversationByLead(String(lead.id)) : null;

  const campaign = msg.referral
    ? {
        source: "whatsapp_ad" as const,
        campaignId: msg.referral.sourceId || null,
        campaignName: msg.referral.body || msg.referral.sourceType || null,
        campaignHeadline: msg.referral.headline || null,
        ctwaClid: msg.referral.ctwaClid || null,
      }
    : null;

  if (!lead) {
    lead = await createLead({
      fullName: msg.profileName || msg.fromPhone,
      phone: digits,
      source: campaign?.source || "whatsapp",
      campaignId: campaign?.campaignId,
      campaignName: campaign?.campaignName,
      campaignHeadline: campaign?.campaignHeadline,
      ctwaClid: campaign?.ctwaClid,
      stage: "NEW_LEAD",
    });
    conversation = await createConversation(String(lead.id), "cloud_api");
  } else if (campaign) {
    lead = await updateLead(String(lead.id), {
      source: campaign.source,
      campaignId: campaign.campaignId ?? lead.campaignId,
      campaignName: campaign.campaignName ?? lead.campaignName,
      campaignHeadline: campaign.campaignHeadline ?? lead.campaignHeadline,
      ctwaClid: campaign.ctwaClid ?? lead.ctwaClid,
      fullName: lead.fullName === lead.phone && msg.profileName ? msg.profileName : lead.fullName,
    });
  }

  if (!conversation) conversation = await createConversation(String(lead.id), "cloud_api");

  await addMessage({
    conversationId: conversation.id,
    direction: "inbound",
    channel: "cloud_api",
    body: msg.body,
  });
  await updateConversation(String(conversation.id), {
    lastAt: new Date(),
    unread: { increment: 1 },
    channel: "cloud_api",
  });
  await addActivity({
    leadId: String(lead.id),
    type: campaign ? "campaign" : "message",
    message: campaign
      ? `פנייה מקמפיין${campaign.campaignHeadline ? `: ${campaign.campaignHeadline}` : ""}`
      : "הודעת וואטסאפ נכנסה",
  });

  return lead.id;
}
