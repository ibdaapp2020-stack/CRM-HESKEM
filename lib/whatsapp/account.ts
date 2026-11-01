import { prisma } from "../prisma";
import { getWhatsAppConfig } from "./index";
import type { WhatsAppConfig } from "./types";

const GRAPH = "https://graph.facebook.com/v21.0";

export type WhatsAppAccount = {
  connected: boolean;
  provider: string;
  phoneNumberId: string;
  displayPhone: string;
  displayName: string;
  quality: string;
  wabaId: string;
  phoneStatus: string;
  webhookStatus: string;
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
          "whatsapp_phone_status",
          "whatsapp_webhook_status",
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
    phoneStatus: map.whatsapp_phone_status || "",
    webhookStatus: map.whatsapp_webhook_status || "",
  };
}

async function upsertSetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

type GraphError = { error?: { message?: string } };

async function graph<T>(
  path: string,
  token: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const hasBody = init?.body !== undefined;
  const res = await fetch(`${GRAPH}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(init?.body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & GraphError;
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph API ${res.status}`);
  }
  return data;
}

/** מוצא את מזהה חשבון העסק (WABA): קודם מה שהוזן ידנית, אחרת מתוך הרשאות ה-Token. */
async function findWabaId(config: WhatsAppConfig, stored: string): Promise<string> {
  if (stored) return stored;

  const debug = await graph<{
    data?: { granular_scopes?: { scope?: string; target_ids?: string[] }[] };
  }>(`/debug_token?input_token=${encodeURIComponent(config.token)}`, config.token);

  const candidates = new Set<string>();
  for (const entry of debug.data?.granular_scopes ?? []) {
    if (entry.scope?.startsWith("whatsapp_business")) {
      for (const id of entry.target_ids ?? []) candidates.add(id);
    }
  }

  for (const id of candidates) {
    const numbers = await graph<{ data?: { id?: string }[] }>(
      `/${id}/phone_numbers?fields=id&limit=100`,
      config.token,
    ).catch(() => null);
    if (numbers?.data?.some((n) => n.id === config.phoneNumberId)) return id;
  }

  return candidates.size === 1 ? Array.from(candidates)[0] : "";
}

/** רושם ב-Meta את כתובת ה-Webhook של המערכת על חשבון העסק, כך שלא צריך להגדיר אותה ידנית. */
async function registerWebhook(config: WhatsAppConfig, wabaId: string): Promise<string> {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (!base.startsWith("https://")) {
    return "רישום Webhook אוטומטי דורש כתובת HTTPS ציבורית (האתר החי)";
  }

  await graph(`/${wabaId}/subscribed_apps`, config.token, {
    method: "POST",
    body: {
      override_callback_uri: `${base}/api/whatsapp/webhook`,
      verify_token: config.verifyToken,
    },
  });
  return "ok";
}

export async function refreshWhatsAppAccountFromMeta() {
  const config = await getWhatsAppConfig();
  if (!config.token || !config.phoneNumberId) {
    throw new Error("חסר Access Token או Phone Number ID");
  }

  const data = await graph<{
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
  }>(
    `/${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
    config.token,
  );

  await upsertSetting("whatsapp_provider", "cloud");
  await upsertSetting("whatsapp_display_phone", data.display_phone_number || "");
  await upsertSetting("whatsapp_display_name", data.verified_name || "");
  await upsertSetting("whatsapp_quality", data.quality_rating || "");
  await upsertSetting("whatsapp_last_error", "");

  // פרטים נוספים על המספר — לא קריטי, לכן כשל כאן לא עוצר את החיבור.
  try {
    const extra = await graph<{ status?: string; platform_type?: string }>(
      `/${config.phoneNumberId}?fields=status,platform_type`,
      config.token,
    );
    await upsertSetting(
      "whatsapp_phone_status",
      [extra.status, extra.platform_type].filter(Boolean).join(" / "),
    );
  } catch {
    await upsertSetting("whatsapp_phone_status", "");
  }

  // רישום Webhook אוטומטי — גם כאן כשל לא מפיל את החיבור, אלא מוצג בכרטיס.
  let webhookStatus: string;
  try {
    const stored = await prisma.appSetting.findUnique({ where: { key: "whatsapp_waba_id" } });
    const wabaId = await findWabaId(config, stored?.value || "");
    if (!wabaId) {
      webhookStatus = "לא נמצא מזהה חשבון עסק (WABA) — הזינו אותו בהגדרות";
    } else {
      await upsertSetting("whatsapp_waba_id", wabaId);
      webhookStatus = await registerWebhook(config, wabaId);
    }
  } catch (error) {
    webhookStatus = error instanceof Error ? error.message : "רישום Webhook נכשל";
  }
  await upsertSetting("whatsapp_webhook_status", webhookStatus);

  return getStoredWhatsAppAccount();
}
