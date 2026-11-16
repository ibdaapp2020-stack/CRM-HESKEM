export type WhatsAppChannel = "inbox" | "cloud_api";

export type WhatsAppConfig = {
  provider: string;
  token: string;
  phoneNumberId: string;
  verifyToken: string;
  appSecret: string;
};

export type OutboundMessage = {
  toPhone: string;
  body: string;
  templateKey?: string;
};

export type CampaignReferral = {
  sourceId?: string;
  sourceUrl?: string;
  sourceType?: string;
  headline?: string;
  body?: string;
  ctwaClid?: string;
};

export type InboundMessage = {
  fromPhone: string;
  body: string;
  externalId?: string;
  profileName?: string;
  referral?: CampaignReferral;
};

export interface WhatsAppProvider {
  channel: WhatsAppChannel;
  send(message: OutboundMessage): Promise<{ ok: true; externalId?: string }>;
  verifyWebhook?(query: {
    mode?: string;
    token?: string;
    challenge?: string;
  }): { ok: boolean; challenge?: string };
  parseWebhook?(payload: unknown): InboundMessage[];
}
