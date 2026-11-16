import { getInstagramConfig, instagramGraphHost } from "./config";

export async function sendInstagramMessage(input: { recipientId: string; body: string }) {
  const config = await getInstagramConfig();
  if (!config.token || !config.accountId) {
    throw new Error("Instagram Messaging API is not configured");
  }
  const response = await fetch(`${instagramGraphHost(config.loginMode)}/${config.accountId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: input.recipientId },
      message: { text: input.body },
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    message_id?: string;
    error?: { message?: string };
  };
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `Instagram send failed: ${response.status}`);
  }
  return { ok: true as const, externalId: data.message_id };
}

export async function passInstagramThread(input: { recipientId: string; targetAppId: string }) {
  const config = await getInstagramConfig();
  if (!config.token || !config.accountId) {
    throw new Error("Instagram Messaging API is not configured");
  }
  const response = await fetch(`${instagramGraphHost(config.loginMode)}/${config.accountId}/pass_thread_control`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: input.recipientId },
      target_app_id: input.targetAppId,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Instagram thread control failed: ${response.status} ${detail.slice(0, 180)}`);
  }
}
