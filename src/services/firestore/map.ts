import type { FirestoreLead, FirestoreUser, UserRole } from "@/types/firestore";

export type PlannedWrite = {
  path: string;
  data: Record<string, unknown>;
};

export type PendingBlob = {
  storagePath: string;
  sourceId: string;
  bytes: number;
};

export type MigrationPlan = {
  writes: PlannedWrite[];
  blobs: PendingBlob[];
  counts: Record<string, number>;
  warnings: string[];
  excluded: {
    passwordHashes: number;
    signatureBlobs: number;
  };
  totals: {
    paymentAgorot: number;
    receiptAgorot: number;
  };
};

type Row = Record<string, unknown>;

export type MigrationSource = {
  users?: Row[];
  leads?: Row[];
  qualifications?: Row[];
  conversations?: Row[];
  messages?: Row[];
  messageTemplates?: Row[];
  documentTemplates?: Row[];
  documents?: Row[];
  lineItems?: Row[];
  signatures?: Row[];
  questions?: Row[];
  projects?: Row[];
  milestones?: Row[];
  paymentMethods?: Row[];
  payments?: Row[];
  appointments?: Row[];
  settings?: Row[];
  receipts?: Row[];
  accesses?: Row[];
  changes?: Row[];
  retainerPlans?: Row[];
  retainerEntries?: Row[];
  activities?: Row[];
};

const SENSITIVE_KEYS = new Set(["passwordHash", "imageData"]);

export function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function dateOrNull(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function money(value: unknown) {
  if (value == null || value === "") return { amount: null, agorot: null };
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return { amount: null, agorot: null };
  return { amount, agorot: Math.round(amount * 100) };
}

export function jsonValue<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function text(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function role(value: unknown): UserRole {
  return value === "STAFF" ? "STAFF" : "CLIENT";
}

function assertClean(data: Record<string, unknown>, path: string) {
  for (const key of SENSITIVE_KEYS) {
    if (key in data) {
      throw new Error(`${path} still contains ${key}`);
    }
  }
}

function push(
  writes: PlannedWrite[],
  seen: Set<string>,
  warnings: string[],
  path: string,
  data: Record<string, unknown>,
) {
  assertClean(data, path);
  if (seen.has(path)) {
    warnings.push(`duplicate path skipped: ${path}`);
    return;
  }
  seen.add(path);
  writes.push({ path, data });
}

export function planMigration(source: MigrationSource): MigrationPlan {
  const writes: PlannedWrite[] = [];
  const blobs: PendingBlob[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const emails = new Set<string>();
  const signTokens = new Set<string>();
  const providerRefs = new Set<string>();
  const stageCounts: Record<string, number> = {};
  let paymentAgorot = 0;
  let receiptAgorot = 0;
  let passwordHashes = 0;
  let signatureBlobs = 0;

  for (const user of source.users ?? []) {
    const id = text(user.id);
    const email = text(user.email)?.toLowerCase();
    if (!id || !email) {
      warnings.push("user skipped because id or email is missing");
      continue;
    }
    if (emails.has(email)) {
      warnings.push(`duplicate email skipped: ${email}`);
      continue;
    }
    emails.add(email);
    if (user.passwordHash) passwordHashes += 1;
    const mapped: FirestoreUser = {
      email,
      name: text(user.name) ?? email,
      phone: text(user.phone),
      role: role(user.role),
      authUid: null,
      legacyUserId: id,
      createdAt: dateOrNull(user.createdAt),
      updatedAt: dateOrNull(user.updatedAt),
    };
    push(writes, seen, warnings, `users/${id}`, mapped as unknown as Record<string, unknown>);
  }

  for (const lead of source.leads ?? []) {
    const id = text(lead.id);
    if (!id) {
      warnings.push("lead skipped because id is missing");
      continue;
    }
    const fullName = text(lead.fullName) ?? "";
    const company = text(lead.company);
    const headline = text(lead.campaignHeadline);
    const mapped: FirestoreLead = {
      fullName,
      nameLower: fullName.toLowerCase(),
      phone: text(lead.phone) ?? "",
      phoneDigits: digits(lead.phone),
      email: text(lead.email),
      company,
      companyLower: company?.toLowerCase() ?? null,
      source: text(lead.source) ?? "whatsapp",
      campaignId: text(lead.campaignId),
      campaignName: text(lead.campaignName),
      campaignHeadline: headline,
      campaignHeadlineLower: headline?.toLowerCase() ?? null,
      ctwaClid: text(lead.ctwaClid),
      industry: text(lead.industry) ?? "general",
      locale: text(lead.locale) ?? "he",
      stage: text(lead.stage) ?? "NEW_LEAD",
      score: Number(lead.score ?? 0) || 0,
      tags: jsonValue<string[]>(lead.tags, []),
      notes: text(lead.notes),
      lostReason: text(lead.lostReason),
      ownerId: text(lead.ownerId),
      clientUserId: text(lead.clientUserId),
      authUid: null,
      createdAt: dateOrNull(lead.createdAt),
      updatedAt: dateOrNull(lead.updatedAt),
    };
    stageCounts[mapped.stage] = (stageCounts[mapped.stage] ?? 0) + 1;
    push(writes, seen, warnings, `leads/${id}`, mapped as unknown as Record<string, unknown>);
  }

  for (const row of source.qualifications ?? []) {
    const leadId = text(row.leadId);
    if (!leadId) continue;
    push(writes, seen, warnings, `leads/${leadId}/qualification/profile`, {
      legacyId: text(row.id),
      budget: text(row.budget),
      serviceType: text(row.serviceType),
      urgency: text(row.urgency),
      fit: text(row.fit),
      answers: jsonValue(row.answers, {}),
      score: Number(row.score ?? 0) || 0,
      qualified: Boolean(row.qualified),
      createdAt: dateOrNull(row.createdAt),
      updatedAt: dateOrNull(row.updatedAt),
    });
  }

  const conversationLead = new Map<string, string>();
  for (const row of source.conversations ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    if (!id || !leadId) continue;
    conversationLead.set(id, leadId);
    push(writes, seen, warnings, `leads/${leadId}/conversation/thread`, {
      legacyId: id,
      channel: text(row.channel) ?? "inbox",
      unread: Number(row.unread ?? 0) || 0,
      lastAt: dateOrNull(row.lastAt),
    });
  }

  for (const row of source.messages ?? []) {
    const id = text(row.id);
    const conversationId = text(row.conversationId);
    const leadId = conversationId ? conversationLead.get(conversationId) : null;
    if (!id || !leadId) {
      warnings.push(`message skipped because its conversation is missing: ${id ?? "unknown"}`);
      continue;
    }
    push(writes, seen, warnings, `leads/${leadId}/conversation/thread/messages/${id}`, {
      direction: text(row.direction),
      channel: text(row.channel) ?? "inbox",
      body: text(row.body) ?? "",
      templateKey: text(row.templateKey),
      authorId: text(row.authorId),
      createdAt: dateOrNull(row.createdAt),
    });
  }

  for (const row of source.messageTemplates ?? []) {
    const key = text(row.key);
    if (!key) continue;
    push(writes, seen, warnings, `messageTemplates/${key}`, {
      legacyId: text(row.id),
      key,
      title: text(row.title) ?? key,
      body: text(row.body) ?? "",
    });
  }

  for (const row of source.documentTemplates ?? []) {
    const id = text(row.id);
    if (!id) continue;
    push(writes, seen, warnings, `documentTemplates/${id}`, {
      type: text(row.type),
      name: text(row.name),
      industry: text(row.industry) ?? "general",
      locale: text(row.locale) ?? "he",
      version: Number(row.version ?? 1) || 1,
      title: text(row.title) ?? "",
      intro: text(row.intro) ?? "",
      body: text(row.body) ?? "",
      footer: text(row.footer) ?? "",
      lineItems: jsonValue(row.lineItemsJson, []),
      isDefault: Boolean(row.isDefault),
      createdAt: dateOrNull(row.createdAt),
    });
  }

  const documentLead = new Map<string, string>();
  for (const row of source.documents ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    const signToken = text(row.signToken);
    if (!id || !leadId || !signToken) {
      warnings.push(`document skipped because id, lead, or sign token is missing: ${id ?? "unknown"}`);
      continue;
    }
    if (signTokens.has(signToken)) {
      warnings.push(`duplicate sign token skipped: ${signToken}`);
      continue;
    }
    signTokens.add(signToken);
    documentLead.set(id, leadId);
    const subtotal = money(row.subtotal);
    const vat = money(row.vatAmount);
    const total = money(row.total);
    push(writes, seen, warnings, `leads/${leadId}/documents/${id}`, {
      templateId: text(row.templateId),
      type: text(row.type),
      title: text(row.title) ?? "",
      locale: text(row.locale) ?? "he",
      status: text(row.status) ?? "DRAFT",
      intro: text(row.intro) ?? "",
      body: text(row.body) ?? "",
      footer: text(row.footer) ?? "",
      validUntil: dateOrNull(row.validUntil),
      currency: text(row.currency) ?? "ILS",
      subtotal: subtotal.amount,
      subtotalAgorot: subtotal.agorot,
      vatRate: Number(row.vatRate ?? 0) || 0,
      vatAmount: vat.amount,
      vatAmountAgorot: vat.agorot,
      total: total.amount,
      totalAgorot: total.agorot,
      customNotes: text(row.customNotes),
      signToken,
      signTokenExp: dateOrNull(row.signTokenExp),
      snapshotHtml: text(row.snapshotHtml),
      lockedAt: dateOrNull(row.lockedAt),
      createdAt: dateOrNull(row.createdAt),
      updatedAt: dateOrNull(row.updatedAt),
    });
  }

  for (const row of source.lineItems ?? []) {
    const id = text(row.id);
    const documentId = text(row.documentId);
    const leadId = documentId ? documentLead.get(documentId) : null;
    if (!id || !documentId || !leadId) continue;
    const unit = money(row.unitPrice);
    push(writes, seen, warnings, `leads/${leadId}/documents/${documentId}/lines/${id}`, {
      title: text(row.title) ?? "",
      description: text(row.description),
      quantity: Number(row.quantity ?? 1) || 0,
      unitPrice: unit.amount,
      unitPriceAgorot: unit.agorot,
      discount: Number(row.discount ?? 0) || 0,
      sortOrder: Number(row.sortOrder ?? 0) || 0,
    });
  }

  for (const row of source.signatures ?? []) {
    const id = text(row.id);
    const documentId = text(row.documentId);
    const leadId = documentId ? documentLead.get(documentId) : null;
    if (!id || !documentId || !leadId) continue;
    const image = text(row.imageData);
    if (image) signatureBlobs += 1;
    const storagePath = `leads/${leadId}/documents/${documentId}/signatures/${id}.png`;
    if (image) blobs.push({ storagePath, sourceId: id, bytes: image.length });
    push(writes, seen, warnings, `leads/${leadId}/documents/${documentId}/signatures/${id}`, {
      signerName: text(row.signerName) ?? "",
      signerRole: text(row.signerRole) ?? "",
      storagePath: image ? storagePath : null,
      ipAddress: text(row.ipAddress),
      userAgent: text(row.userAgent),
      contentHash: text(row.contentHash) ?? "",
      signedAt: dateOrNull(row.signedAt),
    });
  }

  for (const row of source.questions ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    if (!id || !leadId) continue;
    push(writes, seen, warnings, `leads/${leadId}/questions/${id}`, {
      authorId: text(row.authorId),
      question: text(row.question) ?? "",
      required: Boolean(row.required),
      answer: text(row.answer),
      answeredAt: dateOrNull(row.answeredAt),
      createdAt: dateOrNull(row.createdAt),
    });
  }

  const projectLead = new Map<string, string>();
  for (const row of source.projects ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    if (!id || !leadId) continue;
    projectLead.set(id, leadId);
    push(writes, seen, warnings, `leads/${leadId}/project/main`, {
      legacyId: id,
      name: text(row.name) ?? "",
      status: text(row.status) ?? "PLANNING",
      summary: text(row.summary),
      createdAt: dateOrNull(row.createdAt),
      updatedAt: dateOrNull(row.updatedAt),
    });
  }

  for (const row of source.milestones ?? []) {
    const id = text(row.id);
    const projectId = text(row.projectId);
    const leadId = projectId ? projectLead.get(projectId) : null;
    if (!id || !leadId) continue;
    push(writes, seen, warnings, `leads/${leadId}/project/main/milestones/${id}`, {
      title: text(row.title) ?? "",
      description: text(row.description),
      status: text(row.status) ?? "PENDING",
      dueDate: dateOrNull(row.dueDate),
      sortOrder: Number(row.sortOrder ?? 0) || 0,
      completedAt: dateOrNull(row.completedAt),
    });
  }

  for (const row of source.paymentMethods ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    if (!id || !leadId) continue;
    push(writes, seen, warnings, `leads/${leadId}/paymentMethods/${id}`, {
      provider: text(row.provider) ?? "",
      token: text(row.token),
      last4: text(row.last4) ?? "",
      brand: text(row.brand) ?? "",
      expMonth: row.expMonth == null ? null : Number(row.expMonth),
      expYear: row.expYear == null ? null : Number(row.expYear),
      createdAt: dateOrNull(row.createdAt),
    });
  }

  for (const row of source.payments ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    if (!id || !leadId) continue;
    const providerRef = text(row.providerRef);
    if (providerRef && providerRefs.has(providerRef)) {
      warnings.push(`duplicate payment reference skipped: ${providerRef}`);
      continue;
    }
    if (providerRef) providerRefs.add(providerRef);
    const value = money(row.amount);
    paymentAgorot += value.agorot ?? 0;
    push(writes, seen, warnings, `leads/${leadId}/payments/${id}`, {
      amount: value.amount,
      agorot: value.agorot,
      currency: text(row.currency) ?? "ILS",
      status: text(row.status) ?? "PENDING",
      provider: text(row.provider) ?? "",
      providerRef,
      purpose: text(row.purpose) ?? "account_close",
      createdAt: dateOrNull(row.createdAt),
      paidAt: dateOrNull(row.paidAt),
    });
  }

  for (const row of source.appointments ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    if (!id || !leadId) continue;
    push(writes, seen, warnings, `leads/${leadId}/appointments/${id}`, {
      type: text(row.type) ?? "",
      title: text(row.title) ?? "",
      scheduledAt: dateOrNull(row.scheduledAt),
      location: text(row.location),
      notes: text(row.notes),
      completed: Boolean(row.completed),
      createdAt: dateOrNull(row.createdAt),
    });
  }

  for (const row of source.settings ?? []) {
    const key = text(row.key);
    if (!key) continue;
    push(writes, seen, warnings, `settings/${key}`, { value: text(row.value) ?? "" });
  }

  for (const row of source.receipts ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    if (!id || !leadId) continue;
    const value = money(row.amount);
    receiptAgorot += value.agorot ?? 0;
    push(writes, seen, warnings, `leads/${leadId}/receipts/${id}`, {
      method: text(row.method) ?? "",
      amount: value.amount,
      agorot: value.agorot,
      currency: text(row.currency) ?? "ILS",
      receivedAt: dateOrNull(row.receivedAt),
      reference: text(row.reference),
      bank: text(row.bank),
      checkNumber: text(row.checkNumber),
      notes: text(row.notes),
      createdAt: dateOrNull(row.createdAt),
    });
  }

  const accessLead = new Map<string, string>();
  for (const row of source.accesses ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    if (!id || !leadId) continue;
    accessLead.set(id, leadId);
    push(writes, seen, warnings, `leads/${leadId}/accesses/${id}`, {
      label: text(row.label) ?? "",
      url: text(row.url),
      username: text(row.username),
      secret: text(row.secret),
      version: text(row.version),
      notes: text(row.notes),
      createdAt: dateOrNull(row.createdAt),
      updatedAt: dateOrNull(row.updatedAt),
    });
  }

  for (const row of source.changes ?? []) {
    const id = text(row.id);
    const accessId = text(row.accessId);
    const leadId = accessId ? accessLead.get(accessId) : null;
    if (!id || !leadId || !accessId) continue;
    push(writes, seen, warnings, `leads/${leadId}/accesses/${accessId}/changes/${id}`, {
      version: text(row.version) ?? "",
      summary: text(row.summary) ?? "",
      changedAt: dateOrNull(row.changedAt),
    });
  }

  const planLead = new Map<string, string>();
  for (const row of source.retainerPlans ?? []) {
    const id = text(row.id);
    const leadId = text(row.leadId);
    if (!id || !leadId) continue;
    planLead.set(id, leadId);
    push(writes, seen, warnings, `leads/${leadId}/retainers/${id}`, {
      title: text(row.title) ?? "",
      unitLabel: text(row.unitLabel) ?? "סרטונים",
      quotaPerPeriod: Number(row.quotaPerPeriod ?? 0) || 0,
      period: text(row.period) ?? "MONTH",
      active: Boolean(row.active),
      createdAt: dateOrNull(row.createdAt),
    });
  }

  const retainerKeys = new Set<string>();
  for (const row of source.retainerEntries ?? []) {
    const planId = text(row.planId);
    const leadId = planId ? planLead.get(planId) : null;
    const periodKey = text(row.periodKey);
    if (!planId || !leadId || !periodKey) continue;
    const unique = `${planId}:${periodKey}`;
    if (retainerKeys.has(unique)) {
      warnings.push(`duplicate retainer period skipped: ${unique}`);
      continue;
    }
    retainerKeys.add(unique);
    push(writes, seen, warnings, `leads/${leadId}/retainers/${planId}/entries/${periodKey}`, {
      legacyId: text(row.id),
      periodKey,
      delivered: Number(row.delivered ?? 0) || 0,
      notes: text(row.notes),
      status: text(row.status) ?? "OPEN",
      createdAt: dateOrNull(row.createdAt),
      updatedAt: dateOrNull(row.updatedAt),
    });
  }

  for (const row of source.activities ?? []) {
    const id = text(row.id);
    if (!id) continue;
    const leadId = text(row.leadId);
    const path = leadId ? `leads/${leadId}/activities/${id}` : `activities/${id}`;
    push(writes, seen, warnings, path, {
      actorId: text(row.actorId),
      type: text(row.type) ?? "",
      message: text(row.message) ?? "",
      createdAt: dateOrNull(row.createdAt),
    });
  }

  push(writes, seen, warnings, "stats/leadStages", stageCounts);

  const counts = writes.reduce<Record<string, number>>((acc, write) => {
    const root = write.path.split("/")[0] ?? "unknown";
    acc[root] = (acc[root] ?? 0) + 1;
    return acc;
  }, {});

  return {
    writes,
    blobs,
    counts,
    warnings,
    excluded: { passwordHashes, signatureBlobs },
    totals: { paymentAgorot, receiptAgorot },
  };
}

export function comparePlan(source: MigrationSource, plan: MigrationPlan) {
  const mismatches: string[] = [];
  const expect = (label: string, actual: number, expected: number) => {
    if (actual !== expected) mismatches.push(`${label}: planned ${actual}, source ${expected}`);
  };
  const leadWrites = plan.writes.filter((write) => /^leads\/[^/]+$/.test(write.path));
  const paymentWrites = plan.writes.filter((write) => write.path.includes("/payments/"));
  expect("leads", leadWrites.length, source.leads?.length ?? 0);
  expect("payments", paymentWrites.length, source.payments?.length ?? 0);
  expect("users", plan.writes.filter((write) => write.path.startsWith("users/")).length, source.users?.length ?? 0);
  const sourcePaymentAgorot = (source.payments ?? []).reduce((sum, row) => sum + (money(row.amount).agorot ?? 0), 0);
  expect("paymentAgorot", plan.totals.paymentAgorot, sourcePaymentAgorot);
  return mismatches;
}
