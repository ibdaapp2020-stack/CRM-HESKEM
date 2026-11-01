import { InboxApp } from "@/components/inbox-app";
import { WhatsAppAccountCard } from "@/components/whatsapp-account-card";
import { prisma } from "@/lib/prisma";
import { getStoredWhatsAppAccount } from "@/lib/whatsapp/account";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [conversations, templates, account, errorRow] = await Promise.all([
    prisma.conversation.findMany({
      orderBy: { lastAt: "desc" },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.messageTemplate.findMany({ orderBy: { title: "asc" } }),
    getStoredWhatsAppAccount(),
    prisma.appSetting.findUnique({ where: { key: "whatsapp_last_error" } }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">תיבת וואטסאפ</h1>
        <p className="text-sm text-muted">
          הודעות מ-WhatsApp Business ופניות מקמפיין Click to WhatsApp נכנסות לכאן כליד.
        </p>
      </div>
      <WhatsAppAccountCard account={account} error={errorRow?.value} />
      <InboxApp
        conversations={conversations}
        templates={templates}
        initialId={c}
      />
    </div>
  );
}
