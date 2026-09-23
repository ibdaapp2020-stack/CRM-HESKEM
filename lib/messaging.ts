import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getWhatsAppProvider } from "./whatsapp";

export async function findOrCreateLeadByPhone(input: {
  staffId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  locale?: string;
}) {
  const phone = input.phone.trim();
  const existing = await prisma.lead.findFirst({
    where: { phone },
    include: { conversation: true },
  });
  if (existing) {
    if (!existing.conversation) {
      await prisma.conversation.create({ data: { leadId: existing.id } });
    }
    return prisma.lead.findUniqueOrThrow({
      where: { id: existing.id },
      include: { conversation: true },
    });
  }

  const email =
    input.email?.trim() ||
    `${phone.replace(/\D/g, "")}@client.ibda.local`;
  const passwordHash = await bcrypt.hash(`Client${nanoid(6)}`, 10);
  const clientUser = await prisma.user.upsert({
    where: { email },
    update: { name: input.fullName, phone },
    create: {
      email,
      name: input.fullName,
      phone,
      role: "CLIENT",
      passwordHash,
    },
  });

  return prisma.lead.create({
    data: {
      fullName: input.fullName,
      phone,
      email: input.email?.trim() || null,
      locale: input.locale || "he",
      ownerId: input.staffId,
      clientUserId: clientUser.id,
      conversation: { create: {} },
    },
    include: { conversation: true },
  });
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
    const conv = await prisma.conversation.upsert({
      where: { leadId: input.leadId },
      update: {},
      create: { leadId: input.leadId },
    });
    conversationId = conv.id;
  }

  await prisma.message.create({
    data: {
      conversationId,
      direction: "outbound",
      channel,
      body,
      authorId: input.staffId,
    },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastAt: new Date(), channel },
  });
  return channel;
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
