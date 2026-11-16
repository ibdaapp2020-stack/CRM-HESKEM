import type { WhatsAppProvider } from "./types";

export const inboxProvider: WhatsAppProvider = {
  channel: "inbox",
  async send() {
    return { ok: true, externalId: `inbox-${Date.now()}` };
  },
};
