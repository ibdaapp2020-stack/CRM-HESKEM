import type {
  CampaignReferral,
  InboundMessage,
  WhatsAppConfig,
  WhatsAppProvider,
} from "./types";

type CloudMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
  referral?: {
    source_url?: string;
    source_id?: string;
    source_type?: string;
    headline?: string;
    body?: string;
    ctwa_clid?: string;
  };
};

type CloudPayload = {
  entry?: {
    changes?: {
      value?: {
        contacts?: { profile?: { name?: string }; wa_id?: string }[];
        messages?: CloudMessage[];
      };
    }[];
  }[];
};

function messageBody(msg: CloudMessage, referral?: CampaignReferral) {
  return (
    msg.text?.body?.trim() ||
    msg.image?.caption?.trim() ||
    msg.button?.text?.trim() ||
    msg.interactive?.button_reply?.title?.trim() ||
    msg.interactive?.list_reply?.title?.trim() ||
    (referral ? "פנייה מקמפיין" : "")
  );
}

function parseReferral(msg: CloudMessage): CampaignReferral | undefined {
  const ref = msg.referral;
  if (!ref) return undefined;
  const referral: CampaignReferral = {
    sourceId: ref.source_id,
    sourceUrl: ref.source_url,
    sourceType: ref.source_type,
    headline: ref.headline,
    body: ref.body,
    ctwaClid: ref.ctwa_clid,
  };
  if (!Object.values(referral).some(Boolean)) return undefined;
  return referral;
}

export function cloudProvider(config: WhatsAppConfig): WhatsAppProvider {
  return {
    channel: "cloud_api",
    async send(message) {
      const token = config.token;
      const phoneNumberId = config.phoneNumberId;
      if (!token || !phoneNumberId) {
        throw new Error("WhatsApp Cloud API is not configured");
      }
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: message.toPhone.replace(/\D/g, ""),
            type: "text",
            text: { body: message.body },
          }),
        },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`WhatsApp Cloud API send failed: ${res.status} ${detail}`);
      }
      const data = (await res.json()) as { messages?: { id?: string }[] };
      return { ok: true, externalId: data.messages?.[0]?.id };
    },
    verifyWebhook(query) {
      if (query.mode === "subscribe" && query.token === config.verifyToken) {
        return { ok: true, challenge: query.challenge };
      }
      return { ok: false };
    },
    parseWebhook(payload: unknown) {
      const messages: InboundMessage[] = [];
      const root = payload as CloudPayload;
      for (const entry of root.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          const names = new Map(
            (value?.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]),
          );
          for (const msg of value?.messages ?? []) {
            if (!msg.from) continue;
            const referral = parseReferral(msg);
            const body = messageBody(msg, referral);
            if (!body) continue;
            messages.push({
              fromPhone: msg.from,
              body,
              externalId: msg.id,
              profileName: names.get(msg.from),
              referral,
            });
          }
        }
      }
      return messages;
    },
  };
}
