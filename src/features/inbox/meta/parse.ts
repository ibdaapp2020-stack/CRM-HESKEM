export type MetaChannel = "whatsapp" | "instagram";

export type MetaEvent = {
  eventId: string;
  channel: MetaChannel;
  kind: "message" | "status" | "routing";
  externalId?: string;
  externalUserId?: string;
  profileName?: string;
  username?: string;
  direction: "inbound" | "outbound";
  body: string;
  messageType: string;
  mediaUrl?: string;
  mediaId?: string;
  mimeType?: string;
  fileName?: string;
  status?: string;
  recipientId?: string;
  routingState?: string;
  referral?: {
    sourceId?: string;
    sourceUrl?: string;
    sourceType?: string;
    headline?: string;
    body?: string;
    ctwaClid?: string;
  };
  createdAt?: Date;
};

type Loose = Record<string, unknown>;

function asObject(value: unknown): Loose {
  return value && typeof value === "object" ? (value as Loose) : {};
}

function asArray(value: unknown): Loose[] {
  return Array.isArray(value) ? value.map(asObject) : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function webhookEventId(channel: string, parts: string[]) {
  return [channel, ...parts.filter(Boolean)].join(":");
}

function whatsappBody(message: Loose) {
  const textBody = text(asObject(message.text).body);
  const image = asObject(message.image);
  const video = asObject(message.video);
  const document = asObject(message.document);
  const button = text(asObject(message.button).text);
  const interactive = asObject(message.interactive);
  const buttonReply = text(asObject(interactive.button_reply).title);
  const listReply = text(asObject(interactive.list_reply).title);
  const caption = text(image.caption) || text(video.caption) || text(document.caption);
  return textBody || caption || button || buttonReply || listReply;
}

function whatsappMedia(message: Loose) {
  const type = text(message.type) || "text";
  const block = asObject(message[type]);
  return {
    messageType: type,
    mediaId: text(block.id),
    mimeType: text(block.mime_type),
    fileName: text(block.filename),
  };
}

function parseWhatsAppChange(value: Loose, events: MetaEvent[]) {
  const names = new Map<string, string>();
  for (const contact of asArray(value.contacts)) {
    const profile = asObject(contact.profile);
    const id = text(contact.wa_id);
    if (id && text(profile.name)) names.set(id, text(profile.name));
  }

  for (const message of asArray(value.messages)) {
    const from = text(message.from);
    const id = text(message.id);
    if (!from || !id) continue;
    const referralRaw = asObject(message.referral);
    const referral = {
      sourceId: text(referralRaw.source_id),
      sourceUrl: text(referralRaw.source_url),
      sourceType: text(referralRaw.source_type),
      headline: text(referralRaw.headline),
      body: text(referralRaw.body),
      ctwaClid: text(referralRaw.ctwa_clid),
    };
    const hasReferral = Object.values(referral).some(Boolean);
    const media = whatsappMedia(message);
    const body = whatsappBody(message) || (hasReferral ? "פנייה מקמפיין" : labelFor(media.messageType));
    events.push({
      eventId: webhookEventId("whatsapp", [id, "message"]),
      channel: "whatsapp",
      kind: "message",
      externalId: id,
      externalUserId: from,
      profileName: names.get(from),
      direction: "inbound",
      body,
      ...media,
      referral: hasReferral ? referral : undefined,
    });
  }

  for (const echo of asArray(value.message_echoes)) {
    const id = text(echo.id);
    const to = text(echo.to);
    if (!id || !to) continue;
    const media = whatsappMedia(echo);
    events.push({
      eventId: webhookEventId("whatsapp", [id, "echo"]),
      channel: "whatsapp",
      kind: "message",
      externalId: id,
      externalUserId: to,
      direction: "outbound",
      body: whatsappBody(echo) || labelFor(media.messageType),
      ...media,
    });
  }

  for (const status of asArray(value.statuses)) {
    const id = text(status.id);
    const state = text(status.status);
    if (!id || !state) continue;
    events.push({
      eventId: webhookEventId("whatsapp", [id, "status", state, text(status.timestamp)]),
      channel: "whatsapp",
      kind: "status",
      externalId: id,
      externalUserId: text(status.recipient_id),
      recipientId: text(status.recipient_id),
      direction: "outbound",
      body: "",
      messageType: "status",
      status: state,
    });
  }
}

function labelFor(type: string) {
  if (type === "image") return "תמונה";
  if (type === "audio" || type === "voice") return "הודעה קולית";
  if (type === "video") return "סרטון";
  if (type === "document" || type === "file") return "קובץ";
  if (type === "sticker") return "מדבקה";
  if (type === "story_reply") return "תגובה לסטורי";
  if (type === "share") return "שיתוף";
  return "הודעה";
}

function parseInstagramMessaging(entryId: string, item: Loose, events: MetaEvent[]) {
  const sender = text(asObject(item.sender).id);
  const recipient = text(asObject(item.recipient).id);
  const message = asObject(item.message);
  const mid = text(message.mid);
  const timestamp = typeof item.timestamp === "number" ? new Date(item.timestamp) : undefined;

  if (item.pass_thread_control || item.take_thread_control || item.request_thread_control) {
    const routingState = item.pass_thread_control
      ? "passed"
      : item.take_thread_control
        ? "taken"
        : "requested";
    const actor = sender || recipient || entryId;
    events.push({
      eventId: webhookEventId("instagram", [actor, "routing", routingState, String(item.timestamp ?? "")]),
      channel: "instagram",
      kind: "routing",
      externalUserId: sender === entryId ? recipient : sender,
      direction: "inbound",
      body: "",
      messageType: "routing",
      routingState,
      createdAt: timestamp,
    });
  }

  if (!mid) return;
  const echo = message.is_echo === true || sender === entryId;
  const customerId = echo ? recipient : sender;
  const attachments = asArray(message.attachments);
  const first = attachments[0];
  const payload = asObject(first?.payload);
  const reply = asObject(message.reply_to);
  const story = asObject(reply.story);
  const attachmentType = text(first?.type);
  const messageType = text(story.url) ? "story_reply" : attachmentType || "text";
  const body =
    text(message.text) ||
    (story.url ? "תגובה לסטורי" : "") ||
    labelFor(messageType);
  events.push({
    eventId: webhookEventId("instagram", [mid, echo ? "echo" : "message"]),
    channel: "instagram",
    kind: "message",
    externalId: mid,
    externalUserId: customerId,
    direction: echo ? "outbound" : "inbound",
    body,
    messageType,
    mediaUrl: text(payload.url) || text(story.url),
    createdAt: timestamp,
  });
}

export function parseMetaWebhook(payload: unknown): MetaEvent[] {
  const root = asObject(payload);
  const object = text(root.object);
  const events: MetaEvent[] = [];
  for (const entry of asArray(root.entry)) {
    if (object === "instagram") {
      for (const item of asArray(entry.messaging)) parseInstagramMessaging(text(entry.id), item, events);
      continue;
    }
    for (const change of asArray(entry.changes)) {
      const value = asObject(change.value);
      if (object === "whatsapp_business_account" || asArray(value.messages).length || asArray(value.statuses).length) {
        parseWhatsAppChange(value, events);
      }
    }
  }
  return events;
}

export function classifyGraphFailure(message: string): "missing_permissions" | "error" {
  const textValue = message.toLowerCase();
  if (
    textValue.includes("permission") ||
    textValue.includes("(#10)") ||
    textValue.includes("(#200)") ||
    textValue.includes("missing permission") ||
    textValue.includes("scopes")
  ) {
    return "missing_permissions";
  }
  return "error";
}
