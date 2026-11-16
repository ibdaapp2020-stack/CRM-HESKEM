import { InboxApp } from "@/features/inbox/components/inbox-app";
import { WhatsAppAccountCard } from "@/features/inbox/components/whatsapp-account-card";
import { getWhatsAppLastError, listInbox } from "@/services/database";
import { getStoredWhatsAppAccount } from "@/features/inbox/whatsapp/account";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [[conversations, templates], account, errorRow] = await Promise.all([
    listInbox(),
    getStoredWhatsAppAccount(),
    getWhatsAppLastError(),
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
