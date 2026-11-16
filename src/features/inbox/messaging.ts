import { nanoid } from "nanoid";
import {
  addMessage,
  createConversation,
  createLead,
  findLeadByPhone,
  getConversationByLead,
  updateConversation,
  upsertAuthUser,
} from "@/services/firestore/crm";
import { getWhatsAppProvider } from "./whatsapp";

export async function findOrCreateLeadByPhone(input: {
  staffId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  locale?: string;
}) {
  const phone = input.phone.trim();
  const existing = await findLeadByPhone(phone);
  if (existing) {
    if (!(await getConversationByLead(String(existing.id)))) {
      await createConversation(String(existing.id));
    }
    return { ...existing, conversation: await getConversationByLead(String(existing.id)) };
  }

  const email = input.email?.trim() || `${phone.replace(/\D/g, "")}@client.ibda.local`;
  const clientUser = await upsertAuthUser({
    email,
    name: input.fullName,
    phone,
    password: `Client${nanoid(8)}`,
    role: "CLIENT",
  });
  const lead = await createLead({
    fullName: input.fullName,
    phone,
    email: input.email?.trim() || null,
    locale: input.locale || "he",
    ownerId: input.staffId,
    clientUserId: clientUser.id,
  });
  const conversation = await createConversation(String(lead.id));
  return { ...lead, conversation };
}

export async function sendSignLinkMessage(input: {
  leadId: string;
  staffId: string;
  phone: string;
  title: string;
  link: string;
  conversationId?: string | null;
}) {
  const body = `${input.title}\n${input.link}`;
  const provider = await getWhatsAppProvider();
  let channel = provider.channel;
  try {
    await provider.send({ toPhone: input.phone, body });
  } catch {
    channel = "inbox";
  }

  let conversationId = input.conversationId;
  if (!conversationId) {
    const conv = (await getConversationByLead(input.leadId)) ?? (await createConversation(input.leadId));
    conversationId = String(conv.id);
  }

  await addMessage({
    conversationId,
    direction: "outbound",
    channel,
    body,
    authorId: input.staffId,
  });
  await updateConversation(conversationId, { lastAt: new Date(), channel });
  return channel;
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
