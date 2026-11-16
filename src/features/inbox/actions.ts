"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import {
  addActivity,
  addMessage,
  getConversation,
  getMessageTemplateByKey,
  updateConversation,
} from "@/services/firestore/crm";
import { getWhatsAppProvider } from "@/features/inbox/whatsapp";

function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function sendMessageAction(formData: FormData) {
  const staff = await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const templateKey = String(formData.get("templateKey") || "") || null;
  let body = String(formData.get("body") || "").trim();

  const conversation = await getConversation(conversationId);
  if (!conversation?.lead) throw new Error("שיחה לא נמצאה");

  if (templateKey && !body) {
    const tpl = await getMessageTemplateByKey(templateKey);
    if (tpl) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      body = fillTemplate(tpl.body, {
        name: conversation.lead.fullName,
        link: `${appUrl}/portal`,
      });
    }
  }

  if (!body) throw new Error("אין תוכן להודעה");

  const provider = await getWhatsAppProvider();
  await provider.send({
    toPhone: conversation.lead.phone,
    body,
    templateKey: templateKey || undefined,
  });

  await addMessage({
    conversationId,
    direction: "outbound",
    channel: provider.channel,
    body,
    templateKey,
    authorId: staff.id,
  });

  await updateConversation(conversationId, { lastAt: new Date(), unread: 0, channel: provider.channel });

  await addActivity({
    leadId: String(conversation.leadId),
    actorId: staff.id,
    type: "message",
    message: "נשלחה הודעת וואטסאפ",
  });

  revalidatePath("/office/inbox");
  revalidatePath(`/office/leads/${conversation.leadId}`);
}

export async function receiveInboxMessageAction(formData: FormData) {
  const staff = await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error("שיחה לא נמצאה");

  await addMessage({
    conversationId,
    direction: "inbound",
    channel: "inbox",
    body,
  });
  await updateConversation(conversationId, { lastAt: new Date(), unread: { increment: 1 } });
  await addActivity({
    leadId: String(conversation.leadId),
    actorId: staff.id,
    type: "message_in",
    message: "התקבלה הודעה (סימולציית תיבה)",
  });
  revalidatePath("/office/inbox");
}

export async function markConversationReadAction(conversationId: string) {
  await requireStaff();
  await updateConversation(conversationId, { unread: 0 });
  revalidatePath("/office/inbox");
}
