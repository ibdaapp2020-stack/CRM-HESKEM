import { prisma } from "../prisma";
import { cloudProvider } from "./cloud-provider";
import { inboxProvider } from "./inbox-provider";
import type { WhatsAppConfig, WhatsAppProvider } from "./types";

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "whatsapp_provider",
          "whatsapp_token",
          "whatsapp_phone_id",
          "whatsapp_verify_token",
          "whatsapp_app_secret",
        ],
      },
    },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    provider: map.whatsapp_provider || process.env.WHATSAPP_PROVIDER || "inbox",
    token: map.whatsapp_token || process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: map.whatsapp_phone_id || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    verifyToken:
      map.whatsapp_verify_token ||
      process.env.WHATSAPP_VERIFY_TOKEN ||
      "ibda-wa-verify",
    appSecret: map.whatsapp_app_secret || process.env.WHATSAPP_APP_SECRET || "",
  };
}

export async function getWhatsAppProvider(): Promise<WhatsAppProvider> {
  const config = await getWhatsAppConfig();
  if (config.provider === "cloud" && config.token && config.phoneNumberId) {
    return cloudProvider(config);
  }
  return inboxProvider;
}

export type { WhatsAppProvider, WhatsAppConfig } from "./types";
