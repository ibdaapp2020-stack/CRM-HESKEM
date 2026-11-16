import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { migrationBlockReason } from "../src/services/firestore/guard";
import { comparePlan, dateOrNull, money, planMigration } from "../src/services/firestore/map";

const sample = {
  users: [
    {
      id: "user-staff",
      email: "Admin@Ibda.co.il",
      passwordHash: "$2a$secret-hash",
      name: "מנהל",
      phone: null,
      role: "STAFF",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
    {
      id: "user-client",
      email: "client@demo.co.il",
      passwordHash: "$2a$other",
      name: "לקוח",
      role: "CLIENT",
    },
  ],
  leads: [
    {
      id: "lead-1",
      fullName: "דנה כהן",
      phone: "050-123-4567",
      email: null,
      company: null,
      tags: "[\"vip\", \"not-json\"",
      stage: "NEW_LEAD",
      clientUserId: "user-client",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "not-a-date",
    },
  ],
  conversations: [{ id: "conv-1", leadId: "lead-1", channel: "inbox", unread: 1, lastAt: new Date("2026-02-02T00:00:00.000Z") }],
  messages: [
    { id: "msg-1", conversationId: "conv-1", direction: "in", body: "שלום", createdAt: "2026-02-02T00:00:00.000Z" },
    { id: "msg-orphan", conversationId: "missing", direction: "out", body: "x" },
  ],
  documents: [
    {
      id: "doc-1",
      leadId: "lead-1",
      signToken: "token-1",
      subtotal: "100.105",
      vatAmount: null,
      total: 117.12,
      status: "SENT",
    },
  ],
  signatures: [
    {
      id: "sig-1",
      documentId: "doc-1",
      signerName: "דנה",
      signerRole: "CLIENT",
      imageData: "data:image/png;base64,AAAA",
      contentHash: "abc",
    },
  ],
  payments: [
    { id: "pay-1", leadId: "lead-1", amount: 10.5, currency: "ILS", status: "COMPLETED", provider: "sandbox", providerRef: "ref-1" },
    { id: "pay-2", leadId: "lead-1", amount: 10.5, provider: "sandbox", providerRef: "ref-1" },
  ],
  receipts: [{ id: "rcpt-1", leadId: "lead-1", amount: 10.5, method: "transfer" }],
  projects: [{ id: "proj-1", leadId: "lead-1", name: "אתר", status: "PLANNING" }],
  milestones: [{ id: "mile-1", projectId: "proj-1", title: "אפיון" }],
  activities: [{ id: "act-1", leadId: null, type: "note", message: "כללי" }],
  retainerPlans: [{ id: "plan-1", leadId: "lead-1", title: "ריטיינר" }],
  retainerEntries: [
    { id: "entry-1", planId: "plan-1", periodKey: "2026-11", delivered: 1 },
    { id: "entry-2", planId: "plan-1", periodKey: "2026-11", delivered: 2 },
  ],
  settings: [{ key: "company", value: "IBDA" }],
};

test("money, dates, nulls, and broken JSON are normalized", () => {
  assert.deepEqual(money("100.105"), { amount: 100.105, agorot: 10011 });
  assert.deepEqual(money(null), { amount: null, agorot: null });
  assert.equal(dateOrNull("not-a-date"), null);
  const plan = planMigration(sample);
  const lead = plan.writes.find((write) => write.path === "leads/lead-1");
  assert.equal(lead?.data.phoneDigits, "0501234567");
  assert.deepEqual(lead?.data.tags, []);
  assert.equal(lead?.data.updatedAt, null);
  assert.equal(lead?.data.authUid, null);
  assert.equal(lead?.data.clientUserId, "user-client");
});

test("password hashes and signature images stay out of Firestore documents", () => {
  const plan = planMigration(sample);
  const serialized = JSON.stringify(plan.writes);
  assert.equal(serialized.includes("passwordHash"), false);
  assert.equal(serialized.includes("imageData"), false);
  assert.equal(serialized.includes("$2a$secret-hash"), false);
  assert.equal(plan.excluded.passwordHashes, 2);
  assert.equal(plan.excluded.signatureBlobs, 1);
  assert.deepEqual(plan.blobs, [
    {
      storagePath: "leads/lead-1/documents/doc-1/signatures/sig-1.png",
      sourceId: "sig-1",
      bytes: "data:image/png;base64,AAAA".length,
    },
  ]);
  const signature = plan.writes.find((write) => write.path.endsWith("/signatures/sig-1"));
  assert.equal(signature?.data.storagePath, "leads/lead-1/documents/doc-1/signatures/sig-1.png");
  assert.equal(signature?.data.contentHash, "abc");
});

test("ids stay stable and duplicates are reported instead of written twice", () => {
  const plan = planMigration(sample);
  assert.ok(plan.writes.some((write) => write.path === "users/user-staff"));
  assert.ok(plan.writes.some((write) => write.path === "leads/lead-1/documents/doc-1"));
  assert.ok(plan.writes.some((write) => write.path === "leads/lead-1/project/main/milestones/mile-1"));
  assert.ok(plan.writes.some((write) => write.path === "leads/lead-1/retainers/plan-1/entries/2026-11"));
  assert.ok(plan.writes.some((write) => write.path === "activities/act-1"));
  assert.ok(plan.writes.some((write) => write.path === "messageTemplates/welcome") === false);
  assert.equal(plan.writes.filter((write) => write.path.includes("/payments/")).length, 1);
  assert.equal(plan.totals.paymentAgorot, 1050);
  assert.ok(plan.warnings.some((warning) => warning.includes("duplicate payment reference")));
  assert.ok(plan.warnings.some((warning) => warning.includes("duplicate retainer period")));
  assert.ok(plan.warnings.some((warning) => warning.includes("message skipped")));
});

test("counts and payment totals match the source after duplicate skips are expected", () => {
  const source = {
    users: [{ id: "u1", email: "a@ibda.co.il", name: "A", role: "STAFF" }],
    leads: [{ id: "l1", fullName: "A", phone: "0500000000", stage: "NEW_LEAD" }],
    payments: [{ id: "p1", leadId: "l1", amount: 20, providerRef: "once" }],
  };
  const plan = planMigration(source);
  assert.deepEqual(comparePlan(source, plan), []);
  assert.equal(plan.writes.find((write) => write.path === "stats/leadStages")?.data.NEW_LEAD, 1);
});

test("client components do not import the Admin SDK", () => {
  const root = path.join(process.cwd(), "src");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
    }
  };
  walk(root);
  const offenders = files.filter((file) => {
    const source = readFileSync(file, "utf8");
    const client = source.includes('"use client"') || source.includes("'use client'");
    const adminImport = source.includes("firebase-admin") || source.includes("@/lib/firebase/admin");
    return client && adminImport;
  });
  assert.deepEqual(offenders, []);
  const admin = readFileSync(path.join(root, "lib", "firebase", "admin.ts"), "utf8");
  assert.match(admin, /cannot run in the browser/);
});

test("the migration guard refuses production and allows only an isolated dry-run", () => {
  assert.equal(migrationBlockReason({}), "no-emulator");
  assert.equal(
    migrationBlockReason({
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      DATABASE_URL: "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require",
    }),
    "placeholder-database",
  );
  assert.equal(
    migrationBlockReason({
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      DATABASE_URL: "postgresql://crm:secret@db.example.com/crm",
    }),
    "remote-database",
  );
  assert.equal(
    migrationBlockReason(
      {
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        DATABASE_URL: "postgresql://crm:secret@127.0.0.1:5432/crm",
      },
      ["--write"],
    ),
    "write-not-confirmed",
  );
  assert.equal(
    migrationBlockReason({
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      DATABASE_URL: "postgresql://crm:secret@127.0.0.1:5432/crm",
    }),
    null,
  );
});

test("security rules are not open", () => {
  for (const file of ["firestore.rules", "storage.rules"]) {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    assert.equal(/allow\s+read\s*,\s*write\s*:\s*if\s+true/.test(source), false);
    assert.match(source, /if false/);
  }
});
