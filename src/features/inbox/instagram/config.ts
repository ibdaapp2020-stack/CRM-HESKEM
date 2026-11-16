import { listSettings } from "@/services/firestore/crm";

export type InstagramConfig = {
  token: string;
  accountId: string;
  loginMode: "instagram" | "facebook";
  appSecret: string;
  verifyToken: string;
};

export async function getInstagramConfig(): Promise<InstagramConfig> {
  const rows = await listSettings([
    "instagram_token",
    "instagram_account_id",
    "instagram_login_mode",
    "instagram_app_secret",
    "instagram_verify_token",
    "whatsapp_app_secret",
    "whatsapp_verify_token",
  ]);
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const loginMode = map.instagram_login_mode === "facebook" ? "facebook" : "instagram";
  return {
    token: map.instagram_token || process.env.INSTAGRAM_ACCESS_TOKEN || "",
    accountId: map.instagram_account_id || process.env.INSTAGRAM_ACCOUNT_ID || "",
    loginMode: (process.env.INSTAGRAM_LOGIN_MODE === "facebook" ? "facebook" : loginMode) as InstagramConfig["loginMode"],
    appSecret: map.instagram_app_secret || map.whatsapp_app_secret || process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "",
    verifyToken: map.instagram_verify_token || map.whatsapp_verify_token || process.env.WHATSAPP_VERIFY_TOKEN || "",
  };
}

export function instagramGraphHost(mode: InstagramConfig["loginMode"]) {
  return mode === "instagram" ? "https://graph.instagram.com/v21.0" : "https://graph.facebook.com/v21.0";
}
