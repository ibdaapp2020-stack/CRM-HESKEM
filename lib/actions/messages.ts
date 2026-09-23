"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "../auth";
import { prisma } from "../prisma";
import { getWhatsAppProvider } from "../whatsapp";

function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function sendMessageAction(formData: FormData) {
  const staff = await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const templateKey = String(formData.get("templateKey") || "") || null;
  let body = String(formData.get("body") || "").trim();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  });
  if (!conversation) throw new Error("שיחה לא נמצאה");

  if (templateKey && !body) {
    const tpl = await prisma.messageTemplate.findUnique({
      where: { key: templateKey },
    });
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

  await prisma.message.create({
    data: {
      conversationId,
      direction: "outbound",
      channel: provider.channel,
      body,
      templateKey,
      authorId: staff.id,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastAt: new Date(), unread: 0, channel: provider.channel },
  });

  await prisma.activity.create({
    data: {
      leadId: conversation.leadId,
      actorId: staff.id,
      type: "message",
      message: "נשלחה הודעת וואטסאפ",
    },
  });

  revalidatePath("/office/inbox");
  revalidatePath(`/office/leads/${conversation.leadId}`);
}

export async function receiveInboxMessageAction(formData: FormData) {
  const staff = await requireStaff();
  const conversationId = String(formData.get("conversationId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) throw new Error("שיחה לא נמצאה");

  await prisma.message.create({
    data: {
      conversationId,
      direction: "inbound",
      channel: "inbox",
      body,
    },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastAt: new Date(), unread: { increment: 1 } },
  });
  await prisma.activity.create({
    data: {
      leadId: conversation.leadId,
      actorId: staff.id,
      type: "message_in",
      message: "התקבלה הודעה (סימולציית תיבה)",
    },
  });
  revalidatePath("/office/inbox");
}

export async function markConversationReadAction(conversationId: string) {
  await requireStaff();
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { unread: 0 },
  });
  revalidatePath("/office/inbox");
}
