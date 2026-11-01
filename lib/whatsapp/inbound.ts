import { prisma } from "../prisma";
import type { InboundMessage } from "./types";

function digitsOf(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function ingestInboundWhatsApp(msg: InboundMessage) {
  const digits = digitsOf(msg.fromPhone);
  const tail = digits.slice(-9);
  let lead = await prisma.lead.findFirst({
    where: { phone: { contains: tail } },
    include: { conversation: true },
  });

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
    lead = await prisma.lead.create({
      data: {
        fullName: msg.profileName || msg.fromPhone,
        phone: digits,
        source: campaign?.source || "whatsapp",
        campaignId: campaign?.campaignId,
        campaignName: campaign?.campaignName,
        campaignHeadline: campaign?.campaignHeadline,
        ctwaClid: campaign?.ctwaClid,
        stage: "NEW_LEAD",
        conversation: { create: { channel: "cloud_api" } },
      },
      include: { conversation: true },
    });
  } else if (campaign) {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        source: campaign.source,
        campaignId: campaign.campaignId ?? lead.campaignId,
        campaignName: campaign.campaignName ?? lead.campaignName,
        campaignHeadline: campaign.campaignHeadline ?? lead.campaignHeadline,
        ctwaClid: campaign.ctwaClid ?? lead.ctwaClid,
        fullName:
          lead.fullName === lead.phone && msg.profileName
            ? msg.profileName
            : lead.fullName,
      },
      include: { conversation: true },
    });
  }

  if (!lead.conversation) {
    const conversation = await prisma.conversation.create({
      data: { leadId: lead.id, channel: "cloud_api" },
    });
    lead = { ...lead, conversation };
  }

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
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: campaign ? "campaign" : "message",
      message: campaign
        ? `פנייה מקמפיין${campaign.campaignHeadline ? `: ${campaign.campaignHeadline}` : ""}`
        : "הודעת וואטסאפ נכנסה",
    },
  });

  return lead.id;
}
