import type { InboundMessage, WhatsAppConfig, WhatsAppProvider } from "./types";

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
      const root = payload as {
        entry?: {
          changes?: {
            value?: {
              messages?: { id?: string; from?: string; text?: { body?: string } }[];
            };
          }[];
        }[];
      };
      for (const entry of root.entry ?? []) {
        for (const change of entry.changes ?? []) {
          for (const msg of change.value?.messages ?? []) {
            if (msg.from && msg.text?.body) {
              messages.push({
                fromPhone: msg.from,
                body: msg.text.body,
                externalId: msg.id,
              });
            }
          }
        }
      }
      return messages;
    },
  };
}
