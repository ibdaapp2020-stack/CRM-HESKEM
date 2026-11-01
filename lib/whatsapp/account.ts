import { prisma } from "../prisma";
import { getWhatsAppConfig } from "./index";

export type WhatsAppAccount = {
  connected: boolean;
  provider: string;
  phoneNumberId: string;
  displayPhone: string;
  displayName: string;
  quality: string;
  wabaId: string;
};

export async function getStoredWhatsAppAccount(): Promise<WhatsAppAccount> {
  const config = await getWhatsAppConfig();
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "whatsapp_display_phone",
          "whatsapp_display_name",
          "whatsapp_quality",
          "whatsapp_waba_id",
        ],
      },
    },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const connected = config.provider === "cloud" && Boolean(config.token && config.phoneNumberId);
  return {
    connected,
    provider: config.provider,
    phoneNumberId: config.phoneNumberId,
    displayPhone: map.whatsapp_display_phone || "",
    displayName: map.whatsapp_display_name || "",
    quality: map.whatsapp_quality || "",
    wabaId: map.whatsapp_waba_id || "",
  };
}

async function upsertSetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function refreshWhatsAppAccountFromMeta() {
  const config = await getWhatsAppConfig();
  if (!config.token || !config.phoneNumberId) {
    throw new Error("חסר Access Token או Phone Number ID");
  }

  const fields = "display_phone_number,verified_name,quality_rating,code_verification_status";
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${config.phoneNumberId}?fields=${fields}`,
    { headers: { Authorization: `Bearer ${config.token}` } },
  );
  const data = (await res.json()) as {
    error?: { message?: string };
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Graph API ${res.status}`);
  }

  await upsertSetting("whatsapp_provider", "cloud");
  await upsertSetting("whatsapp_display_phone", data.display_phone_number || "");
  await upsertSetting("whatsapp_display_name", data.verified_name || "");
  await upsertSetting("whatsapp_quality", data.quality_rating || "");
  await upsertSetting("whatsapp_last_error", "");

  const wabaRes = await fetch(
    `https://graph.facebook.com/v21.0/${config.phoneNumberId}?fields=whatsapp_business_account`,
    { headers: { Authorization: `Bearer ${config.token}` } },
  );
  const waba = (await wabaRes.json()) as {
    whatsapp_business_account?: { id?: string };
  };
  if (waba.whatsapp_business_account?.id) {
    await upsertSetting("whatsapp_waba_id", waba.whatsapp_business_account.id);
  }

  return getStoredWhatsAppAccount();
}
