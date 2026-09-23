export type WhatsAppChannel = "inbox" | "cloud_api";

export type WhatsAppConfig = {
  provider: string;
  token: string;
  phoneNumberId: string;
  verifyToken: string;
};

export type OutboundMessage = {
  toPhone: string;
  body: string;
  templateKey?: string;
};

export type InboundMessage = {
  fromPhone: string;
  body: string;
  externalId?: string;
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
