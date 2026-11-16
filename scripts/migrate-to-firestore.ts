import { migrationBlockReason } from "../src/services/firestore/guard";
import { comparePlan, planMigration, type MigrationSource } from "../src/services/firestore/map";

const refusalMessage: Record<string, string> = {
  "no-emulator":
    "Refusing to run. Set FIRESTORE_EMULATOR_HOST. This script does not read or write the live Firebase project.",
  "placeholder-database": "Refusing to read. DATABASE_URL is missing or still a placeholder.",
  "remote-database":
    "Refusing to read a remote database. Take a verified backup first, then set MIGRATION_ALLOW_REMOTE_READ=yes for an approved dry-run.",
  "write-not-confirmed":
    "Refusing to write. Pass MIGRATION_CONFIRM=emulator with --write. The default is a dry-run.",
};

function refuseUnlessIsolated(args: string[]) {
  const reason = migrationBlockReason(
    {
      FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
      DATABASE_URL: process.env.DATABASE_URL,
      MIGRATION_ALLOW_REMOTE_READ: process.env.MIGRATION_ALLOW_REMOTE_READ,
      MIGRATION_CONFIRM: process.env.MIGRATION_CONFIRM,
    },
    args,
  );
  if (!reason) return;
  console.error(refusalMessage[reason]);
  process.exit(reason === "no-emulator" ? 1 : reason === "placeholder-database" ? 2 : reason === "remote-database" ? 3 : 4);
}

async function readSource(): Promise<MigrationSource> {
  const { prisma } = await import("../src/services/database/client");
  const [
    users,
    leads,
    qualifications,
    conversations,
    messages,
    messageTemplates,
    documentTemplates,
    documents,
    lineItems,
    signatures,
    questions,
    projects,
    milestones,
    paymentMethods,
    payments,
    appointments,
    settings,
    receipts,
    accesses,
    changes,
    retainerPlans,
    retainerEntries,
    activities,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.lead.findMany(),
    prisma.qualification.findMany(),
    prisma.conversation.findMany(),
    prisma.message.findMany(),
    prisma.messageTemplate.findMany(),
    prisma.documentTemplate.findMany(),
    prisma.document.findMany(),
    prisma.documentLineItem.findMany(),
    prisma.signature.findMany(),
    prisma.clientQuestion.findMany(),
    prisma.project.findMany(),
    prisma.milestone.findMany(),
    prisma.paymentMethod.findMany(),
    prisma.payment.findMany(),
    prisma.appointment.findMany(),
    prisma.appSetting.findMany(),
    prisma.receipt.findMany(),
    prisma.systemAccess.findMany(),
    prisma.systemChange.findMany(),
    prisma.retainerPlan.findMany(),
    prisma.retainerEntry.findMany(),
    prisma.activity.findMany(),
  ]);
  return {
    users,
    leads,
    qualifications,
    conversations,
    messages,
    messageTemplates,
    documentTemplates,
    documents,
    lineItems,
    signatures,
    questions,
    projects,
    milestones,
    paymentMethods,
    payments,
    appointments,
    settings,
    receipts,
    accesses,
    changes,
    retainerPlans,
    retainerEntries,
    activities,
  };
}

async function main() {
  const write = process.argv.includes("--write");
  refuseUnlessIsolated(process.argv);

  const source = await readSource();
  const plan = planMigration(source);
  const mismatches = comparePlan(source, plan);
  console.log(
    JSON.stringify(
      {
        mode: write ? "write" : "dry-run",
        counts: plan.counts,
        totals: plan.totals,
        excluded: plan.excluded,
        pendingSignatureFiles: plan.blobs.length,
        warnings: plan.warnings,
        mismatches,
      },
      null,
      2,
    ),
  );
  if (mismatches.length > 0) process.exit(5);
  if (!write) return;

  const { getAdminFirestore } = await import("../src/lib/firebase/admin");
  const { createFirestoreRepository } = await import("../src/services/firestore/repository");
  const repository = createFirestoreRepository(getAdminFirestore());
  await repository.applyWrites(plan.writes);
  console.log(`Wrote ${plan.writes.length} documents to the local emulator. Signature files were not uploaded.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Migration failed";
  console.error(message);
  process.exit(1);
});
