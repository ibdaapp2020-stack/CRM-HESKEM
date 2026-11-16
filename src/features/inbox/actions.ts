"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { passInstagramThread, sendInstagramMessage } from "@/features/inbox/instagram/send";
import { recordAssignment } from "@/features/inbox/meta/ingest";
import { canSendFreeForm } from "@/features/inbox/meta/window";
import { getWhatsAppConfig, getWhatsAppProvider } from "@/features/inbox/whatsapp";
import {
  addActivity,
  addInternalNote,
  addMessage,
  createLead,
  getConversation,
  getMessageTemplateByKey,
  listStaffUsers,
  searchLeads,
  updateConversation,
  updateLead,
  updateMessage,
} from "@/services/firestore/crm";

function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function channelOf(value: unknown) {
  const channel = String(value ?? "inbox");
  return channel === "cloud_api" ? "whatsapp" : channel;
}

function revalidateInbox(leadId?: string | null) {
  revalidatePath("/office/inbox");
  if (leadId) revalidatePath(`/office/leads/${leadId}`);
}

async function assertSendable(conversation: { channel?: string; customerWindowExpiresAt?: string | Date | null }, templateName: string) {
  const channel = channelOf(conversation.channel);
  if (channel === "inbox") return;
  if (canSendFreeForm(conversation.customerWindowExpiresAt)) return;
  if (channel === "whatsapp" && templateName) return;
  throw new Error(
    channel === "whatsapp"
      ? "חלון 24 השעות של WhatsApp נסגר. אפשר לשלוח רק תבנית מאושרת ב-Meta."
      : "חלון התגובה של Instagram נסגר. Meta לא מאפשרת הודעה חופשית מחוץ לחלון בלי הרשאת Human Agent.",
  );
}

export async function sendMessageAction(formData: FormData) {
  const staff = await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const templateKey = String(formData.get("templateKey") || "") || "";
  const templateName = String(formData.get("metaTemplate") || "").trim();
  const clientRequestId = String(formData.get("clientRequestId") || "").trim();
  let body = String(formData.get("body") || "").trim();

  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error("שיחה לא נמצאה");
  const channel = channelOf(conversation.channel);

  if (templateKey && !body) {
    const tpl = await getMessageTemplateByKey(templateKey);
    if (tpl) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      body = fillTemplate(String(tpl.body ?? ""), {
        name: String(conversation.lead?.fullName ?? ""),
        link: `${appUrl}/portal`,
      });
    }
  }
  if (!body && !templateName) throw new Error("אין תוכן להודעה");
  await assertSendable(conversation, templateName);

  const message = await addMessage({
    conversationId,
    leadId: conversation.leadId ?? null,
    direction: "outbound",
    channel,
    body: body || `תבנית ${templateName}`,
    messageType: templateName ? "template" : "text",
    templateKey: templateKey || null,
    authorId: staff.id,
    clientRequestId: clientRequestId || null,
    status: "pending",
  });
  if (message.status === "sent" || message.status === "delivered" || message.status === "read") {
    revalidateInbox(conversation.leadId ? String(conversation.leadId) : null);
    return;
  }

  try {
    const externalId = await deliver(channel, conversation, body, templateName);
    await updateMessage(String(message.id), { status: "sent", externalId: externalId ?? null });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "השליחה נכשלה";
    await updateMessage(String(message.id), { status: "failed", error: reason.slice(0, 300) });
    throw new Error(reason);
  }

  await updateConversation(conversationId, {
    lastAt: new Date(),
    unread: 0,
    channel,
    lastMessagePreview: (body || templateName).slice(0, 180),
    status: conversation.status === "new" ? "in_progress" : conversation.status,
  });
  if (conversation.leadId) {
    await addActivity({
      leadId: String(conversation.leadId),
      actorId: staff.id,
      type: "message",
      message: channel === "instagram" ? "נשלחה הודעת Instagram" : "נשלחה הודעת וואטסאפ",
    });
  }
  revalidateInbox(conversation.leadId ? String(conversation.leadId) : null);
}

async function deliver(
  channel: string,
  conversation: { phone?: string | null; externalUserId?: string | null; lead?: { phone?: string | null } | null },
  body: string,
  templateName: string,
) {
  if (channel === "instagram") {
    const recipientId = String(conversation.externalUserId || "");
    if (!recipientId) throw new Error("לשיחה אין מזהה Instagram");
    const sent = await sendInstagramMessage({ recipientId, body });
    return sent.externalId;
  }
  if (channel === "whatsapp") {
    const config = await getWhatsAppConfig();
    if (config.provider !== "cloud" || !config.token || !config.phoneNumberId) {
      throw new Error("WhatsApp Cloud API לא מחובר");
    }
    const provider = await getWhatsAppProvider();
    const sent = await provider.send({
      toPhone: String(conversation.lead?.phone || conversation.phone || conversation.externalUserId || ""),
      body,
      templateName: templateName || undefined,
    });
    return sent.externalId;
  }
  return `inbox-${Date.now()}`;
}

export async function retryMessageAction(formData: FormData) {
  const staff = await requireStaff();
  const messageId = String(formData.get("messageId") || "");
  const conversationId = String(formData.get("conversationId") || "");
  const conversation = await getConversation(conversationId);
  const message = conversation?.messages?.find((item: { id?: string }) => item.id === messageId);
  if (!conversation || !message) throw new Error("ההודעה לא נמצאה");
  if (message.status !== "failed") throw new Error("אפשר לנסות שוב רק הודעה שנכשלה");
  const channel = channelOf(conversation.channel);
  await assertSendable(conversation, String(message.messageType) === "template" ? String(message.body) : "");
  try {
    const externalId = await deliver(channel, conversation, String(message.body ?? ""), "");
    await updateMessage(messageId, { status: "sent", externalId: externalId ?? null, error: null, retriedBy: staff.id });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "השליחה נכשלה";
    await updateMessage(messageId, { status: "failed", error: reason.slice(0, 300) });
    throw new Error(reason);
  }
  revalidateInbox(conversation.leadId ? String(conversation.leadId) : null);
}

export async function markConversationReadAction(conversationId: string) {
  await requireStaff();
  await updateConversation(conversationId, { unread: 0 });
  revalidatePath("/office/inbox");
}

export async function updateConversationDeskAction(formData: FormData) {
  const staff = await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error("שיחה לא נמצאה");
  const status = String(formData.get("status") || conversation.status || "new");
  const priority = String(formData.get("priority") || conversation.priority || "normal");
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const assigneeId = String(formData.get("assigneeId") || "");
  const staffUsers = await listStaffUsers();
  const assignee = staffUsers.find((user) => user.id === assigneeId);
  if (assigneeId !== String(conversation.assigneeId ?? "")) {
    await recordAssignment({
      conversationId,
      leadId: conversation.leadId ? String(conversation.leadId) : null,
      fromId: conversation.assigneeId ? String(conversation.assigneeId) : null,
      toId: assigneeId || null,
      toName: assignee ? String(assignee.name) : null,
      actorId: staff.id,
    });
  }
  await updateConversation(conversationId, {
    status,
    priority,
    tags: JSON.stringify(tags),
    assigneeId: assigneeId || null,
    assigneeName: assignee ? String(assignee.name) : null,
  });
  revalidateInbox(conversation.leadId ? String(conversation.leadId) : null);
}

export async function addInternalNoteAction(formData: FormData) {
  const staff = await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error("שיחה לא נמצאה");
  await addInternalNote({
    conversationId,
    leadId: conversation.leadId ?? null,
    body,
    authorId: staff.id,
    authorName: staff.name,
  });
  revalidatePath("/office/inbox");
}

export async function linkConversationLeadAction(formData: FormData) {
  const staff = await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const query = String(formData.get("query") || "").trim();
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error("שיחה לא נמצאה");
  const matches = await searchLeads(undefined, query);
  const lead = matches[0];
  if (!lead) throw new Error("לא נמצא לקוח תואם");
  if (channelOf(conversation.channel) === "instagram" && conversation.externalUserId) {
    await updateLead(String(lead.id), {
      instagramUserId: conversation.externalUserId,
      instagramUsername: conversation.instagramUsername ?? lead.instagramUsername ?? null,
    });
  }
  await updateConversation(conversationId, {
    leadId: lead.id,
    clientUserId: lead.clientUserId ?? null,
    phone: channelOf(conversation.channel) === "whatsapp" ? lead.phone : conversation.phone ?? null,
  });
  await addActivity({
    leadId: String(lead.id),
    actorId: staff.id,
    type: "link",
    message: "שיחה קושרה ידנית ללקוח",
  });
  revalidateInbox(String(lead.id));
}

export async function convertConversationToLeadAction(formData: FormData) {
  const staff = await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error("שיחה לא נמצאה");
  if (conversation.leadId) return;
  const channel = channelOf(conversation.channel);
  const lead = await createLead({
    fullName: conversation.instagramUsername || conversation.phone || conversation.externalUserId || "לקוח חדש",
    phone: channel === "whatsapp" ? String(conversation.phone || conversation.externalUserId || "") : "",
    source: channel === "instagram" ? "instagram" : "whatsapp",
    instagramUserId: channel === "instagram" ? conversation.externalUserId : null,
    instagramUsername: conversation.instagramUsername ?? null,
    ownerId: staff.id,
    stage: "NEW_LEAD",
  });
  await updateConversation(conversationId, { leadId: lead.id, assigneeId: staff.id, assigneeName: staff.name });
  revalidateInbox(String(lead.id));
}

export async function passThreadAction(formData: FormData) {
  await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const targetAppId = String(formData.get("targetAppId") || "").trim();
  const conversation = await getConversation(conversationId);
  if (!conversation?.externalUserId || !targetAppId) throw new Error("חסר יעד להעברת השיחה");
  await passInstagramThread({ recipientId: String(conversation.externalUserId), targetAppId });
  await updateConversation(conversationId, { routingState: "passed" });
  revalidatePath("/office/inbox");
}
