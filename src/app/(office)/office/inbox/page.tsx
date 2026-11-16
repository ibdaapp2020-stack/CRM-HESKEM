import { InboxLive } from "@/features/inbox/components/inbox-live";
import { UnifiedInbox } from "@/features/inbox/components/unified-inbox";
import { WhatsAppAccountCard } from "@/features/inbox/components/whatsapp-account-card";
import { getStoredWhatsAppAccount } from "@/features/inbox/whatsapp/account";
import {
  listConversationAssignments,
  listDocuments,
  listInternalNotes,
  listProjects,
  listStaffUsers,
} from "@/services/firestore/crm";
import { getWhatsAppLastError, listInbox } from "@/services/database";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [[conversations, templates], account, errorRow, notes, documents, projects, staff, assignments] = await Promise.all([
    listInbox(),
    getStoredWhatsAppAccount(),
    getWhatsAppLastError(),
    listInternalNotes(),
    listDocuments(),
    listProjects(),
    listStaffUsers(),
    listConversationAssignments(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">מרכז הודעות</h1>
        <p className="text-sm text-muted">WhatsApp Business ו-Instagram במסך אחד. כל ערוץ נשמר בנפרד תחת אותו לקוח.</p>
      </div>
      <InboxLive />
      <WhatsAppAccountCard account={account} error={errorRow?.value} />
      <UnifiedInbox
        conversations={conversations}
        templates={templates}
        notes={notes}
        documents={documents}
        projects={projects}
        staff={staff}
        assignments={assignments}
        initialId={c}
      />
    </div>
  );
}
