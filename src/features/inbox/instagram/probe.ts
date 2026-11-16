import { saveChannelConnection, upsertSetting } from "@/services/firestore/crm";
import { classifyGraphFailure } from "@/features/inbox/meta/parse";
import { getInstagramConfig, instagramGraphHost } from "./config";

export type ChannelProbe = {
  state: "connected" | "missing_permissions" | "error" | "disconnected";
  username: string;
  accountId: string;
  loginMode: string;
  error: string;
};

export async function probeInstagramConnection(): Promise<ChannelProbe> {
  const config = await getInstagramConfig();
  const base = {
    username: "",
    accountId: config.accountId,
    loginMode: config.loginMode,
    error: "",
  };
  if (!config.token || !config.accountId) {
    await upsertSetting("instagram_connection_state", "disconnected").catch(() => undefined);
    return { ...base, state: "disconnected" };
  }

  const path =
    config.loginMode === "instagram"
      ? `${instagramGraphHost(config.loginMode)}/me?fields=user_id,username,name`
      : `${instagramGraphHost(config.loginMode)}/${config.accountId}?fields=username,name`;
  try {
    const response = await fetch(path, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as {
      username?: string;
      user_id?: string;
      id?: string;
      error?: { message?: string; code?: number };
    };
    if (!response.ok || data.error) {
      const message = data.error?.message || `Instagram probe failed (${response.status})`;
      const expired = data.error?.code === 190;
      const state = expired ? "error" : classifyGraphFailure(message);
      const error = expired ? "תוקף הטוקן פג" : message;
      await upsertSetting("instagram_connection_state", state);
      await upsertSetting("instagram_last_error", error.slice(0, 300));
      await saveChannelConnection("instagram", {
        state,
        accountId: config.accountId,
        loginMode: config.loginMode,
      }).catch(() => undefined);
      return { ...base, state, error };
    }
    const username = data.username || "";
    await upsertSetting("instagram_connection_state", "connected");
    await upsertSetting("instagram_username", username);
    await upsertSetting("instagram_last_error", "");
    await saveChannelConnection("instagram", {
      state: "connected",
      accountId: data.user_id || data.id || config.accountId,
      username,
      loginMode: config.loginMode,
    }).catch(() => undefined);
    return {
      state: "connected",
      username,
      accountId: data.user_id || data.id || config.accountId,
      loginMode: config.loginMode,
      error: "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאת חיבור";
    await upsertSetting("instagram_connection_state", "error").catch(() => undefined);
    await upsertSetting("instagram_last_error", message.slice(0, 300)).catch(() => undefined);
    return { ...base, state: "error", error: message };
  }
}
