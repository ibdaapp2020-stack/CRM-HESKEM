import { nanoid } from "nanoid";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { getAdminApp, getAdminFirestore, getAdminStorage, isAdminConfigured } from "@/lib/firebase/admin";

// Firestore documents are open records; callers narrow the fields they use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function store() {
  if (!isAdminConfigured()) return null;
  return getAdminFirestore();
}

function requireStore() {
  const db = store();
  if (!db) throw new Error("Firebase Admin is not configured.");
  return db;
}

function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => clean(item)) as T;
  if (value instanceof Date) return value;
  if (value && typeof value === "object") {
    const out: Row = {};
    for (const [key, item] of Object.entries(value as Row)) {
      if (item !== undefined) out[key] = clean(item);
    }
    return out as T;
  }
  return value;
}

function revive<T>(value: T): T {
  if (value instanceof FieldValue) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as T;
  }
  if (Array.isArray(value)) return value.map((item) => revive(item)) as T;
  if (value && typeof value === "object") {
    const out: Row = {};
    for (const [key, item] of Object.entries(value as Row)) out[key] = revive(item);
    return out as T;
  }
  return value;
}

function docData(id: string, data: DocumentData | undefined): Row | null {
  if (!data) return null;
  return revive({ id, ...data });
}

async function getDoc(path: string) {
  const db = store();
  if (!db) return null;
  const snap = await db.doc(path).get();
  return snap.exists ? docData(snap.id, snap.data()) : null;
}

async function setDoc(path: string, data: Row, merge = false) {
  await requireStore().doc(path).set(clean(data), { merge });
}

async function col(name: string): Promise<Row[]> {
  const db = store();
  if (!db) return [];
  const snap = await db.collection(name).get();
  return snap.docs.flatMap((item) => {
    const row = docData(item.id, item.data());
    return row ? [row] : [];
  });
}

function byDate(field: string) {
  return (a: Row, b: Row) => new Date(String(b[field] ?? 0)).getTime() - new Date(String(a[field] ?? 0)).getTime();
}

function leadDefaults(data: Row): Row {
  const now = new Date();
  const fullName = String(data.fullName ?? "");
  const phone = String(data.phone ?? "");
  const company = data.company == null ? null : String(data.company);
  const headline = data.campaignHeadline == null ? null : String(data.campaignHeadline);
  return clean({
    fullName,
    nameLower: fullName.toLowerCase(),
    phone,
    phoneDigits: phone.replace(/\D/g, ""),
    email: data.email ?? null,
    company,
    companyLower: company ? company.toLowerCase() : null,
    source: data.source ?? "whatsapp",
    campaignId: data.campaignId ?? null,
    campaignName: data.campaignName ?? null,
    campaignHeadline: headline,
    campaignHeadlineLower: headline ? headline.toLowerCase() : null,
    ctwaClid: data.ctwaClid ?? null,
    industry: data.industry ?? "general",
    locale: data.locale ?? "he",
    stage: data.stage ?? "NEW_LEAD",
    score: data.score ?? 0,
    tags: data.tags ?? "[]",
    notes: data.notes ?? null,
    lostReason: data.lostReason ?? null,
    ownerId: data.ownerId ?? null,
    clientUserId: data.clientUserId ?? null,
    authUid: data.clientUserId ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function upsertAuthUser(input: {
  email: string;
  name: string;
  phone?: string | null;
  password?: string;
  role: "STAFF" | "CLIENT";
}) {
  const auth = getAuth(getAdminApp());
  const email = input.email.trim().toLowerCase();
  let record;
  try {
    record = await auth.getUserByEmail(email);
    await auth.updateUser(record.uid, { displayName: input.name });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code !== "auth/user-not-found") throw error;
    if (!input.password) throw new Error("לא ניתן ליצור משתמש בלי סיסמה");
    record = await auth.createUser({ email, password: input.password, displayName: input.name });
  }
  await auth.setCustomUserClaims(record.uid, { role: input.role });
  const now = new Date();
  await setDoc(
    `users/${record.uid}`,
    {
      email,
      name: input.name,
      phone: input.phone ?? null,
      role: input.role,
      authUid: record.uid,
      createdAt: now,
      updatedAt: now,
    },
    true,
  );
  return { id: record.uid, email, name: input.name, phone: input.phone ?? null, role: input.role };
}

export async function getUser(id: string) {
  return getDoc(`users/${id}`) as Promise<Row | null>;
}

export async function getUserByEmail(email: string) {
  const users = await col("users");
  return users.find((user) => String(user.email).toLowerCase() === email.trim().toLowerCase()) ?? null;
}

export async function createLead(data: Row) {
  const id = nanoid();
  const lead = { ...leadDefaults(data) };
  await setDoc(`leads/${id}`, lead);
  return { id, ...lead };
}

export async function updateLead(id: string, data: Row) {
  const current = await getDoc(`leads/${id}`);
  if (!current) throw new Error("ליד לא נמצא");
  const next = { ...current, ...clean(data), updatedAt: new Date() };
  if (data.fullName != null) next.nameLower = String(data.fullName).toLowerCase();
  if (data.phone != null) next.phoneDigits = String(data.phone).replace(/\D/g, "");
  if (data.company !== undefined) next.companyLower = data.company ? String(data.company).toLowerCase() : null;
  if (data.campaignHeadline !== undefined) {
    next.campaignHeadlineLower = data.campaignHeadline ? String(data.campaignHeadline).toLowerCase() : null;
  }
  if (data.clientUserId !== undefined) next.authUid = data.clientUserId;
  delete next.id;
  await setDoc(`leads/${id}`, next);
  return { id, ...next };
}

export async function getLead(id: string) {
  return getDoc(`leads/${id}`) as Promise<Row | null>;
}

export async function listLeads() {
  const leads = await col("leads");
  return leads.sort(byDate("updatedAt"));
}

export async function getLeadByClient(clientUserId: string) {
  const leads = await listLeads();
  return leads.find((lead) => lead.clientUserId === clientUserId) ?? null;
}

export async function findLeadByPhone(phone: string) {
  const leads = await listLeads();
  return leads.find((lead) => lead.phone === phone) ?? null;
}

export async function findLeadByPhoneTail(tail: string) {
  const leads = await listLeads();
  return leads.find((lead) => String(lead.phoneDigits ?? "").endsWith(tail)) ?? null;
}

export async function searchLeads(stage?: string, q?: string) {
  const needle = q?.trim().toLowerCase() ?? "";
  return (await listLeads()).filter((lead) => {
    if (stage && stage !== "ALL" && lead.stage !== stage) return false;
    if (!needle) return true;
    return [lead.fullName, lead.phone, lead.company, lead.campaignHeadline]
      .some((value) => String(value ?? "").toLowerCase().includes(needle));
  });
}

export async function countLeadsByStage() {
  const counts = new Map<string, number>();
  for (const lead of await listLeads()) {
    const stage = String(lead.stage ?? "NEW_LEAD");
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return [...counts.entries()].map(([stage, count]) => ({ stage, _count: { _all: count } }));
}

export async function addActivity(data: { leadId?: string | null; actorId?: string | null; type: string; message: string }) {
  const id = nanoid();
  const activity = clean({ ...data, leadId: data.leadId ?? null, actorId: data.actorId ?? null, createdAt: new Date() });
  await setDoc(`activities/${id}`, activity);
  return { id, ...activity };
}

export async function listActivities(limit = 12) {
  const rows = (await col("activities")).sort(byDate("createdAt"));
  return Promise.all(rows.slice(0, limit).map(async (activity) => ({
    ...activity,
    lead: activity.leadId ? await getLead(String(activity.leadId)) : null,
  })));
}

async function childList(name: string, leadId?: string) {
  const rows = await col(name);
  return leadId ? rows.filter((row) => row.leadId === leadId) : rows;
}

export async function upsertQualification(leadId: string, data: Row) {
  const current = await getDoc(`qualifications/${leadId}`);
  const lead = await getLead(leadId);
  const next = clean({
    ...(current ?? {}),
    ...data,
    leadId,
    clientUserId: lead?.clientUserId ?? null,
    answers: data.answers ?? current?.answers ?? "{}",
    createdAt: current?.createdAt ?? new Date(),
    updatedAt: new Date(),
  });
  delete next.id;
  await setDoc(`qualifications/${leadId}`, next);
  return { id: leadId, ...next };
}

export async function getQualification(leadId: string) {
  return getDoc(`qualifications/${leadId}`);
}

export async function createConversation(leadId: string, channel = "inbox") {
  const existing = await getConversationByLead(leadId);
  if (existing) return existing;
  const id = nanoid();
  const lead = await getLead(leadId);
  const conversation = { leadId, clientUserId: lead?.clientUserId ?? null, channel, unread: 0, lastAt: new Date() };
  await setDoc(`conversations/${id}`, conversation);
  return { id, ...conversation };
}

export async function getConversation(id: string) {
  const conversation = await getDoc(`conversations/${id}`);
  if (!conversation) return null;
  const lead = await getLead(String(conversation.leadId));
  const messages = (await childList("messages")).filter((item) => item.conversationId === id).sort(byDate("createdAt")).reverse();
  return { ...conversation, lead, messages };
}

export async function getConversationByLead(leadId: string) {
  const rows = await childList("conversations", leadId);
  return rows[0] ?? null;
}

export async function updateConversation(id: string, data: Row & { unread?: number | { increment: number } }) {
  const current = await getDoc(`conversations/${id}`);
  if (!current) throw new Error("שיחה לא נמצאה");
  const unread = data.unread && typeof data.unread === "object"
    ? Number(current.unread ?? 0) + data.unread.increment
    : data.unread ?? current.unread;
  const next = { ...current, ...clean({ ...data, unread }), unread };
  delete next.id;
  delete next.lead;
  delete next.messages;
  await setDoc(`conversations/${id}`, next);
  return { id, ...next };
}

export async function addMessage(data: Row) {
  const id = nanoid();
  const conversation = data.conversationId ? await getDoc(`conversations/${String(data.conversationId)}`) : null;
  const message = clean({ ...data, clientUserId: conversation?.clientUserId ?? null, createdAt: new Date() });
  await setDoc(`messages/${id}`, message);
  return { id, ...message };
}

export async function listConversations() {
  const conversations = (await col("conversations")).sort(byDate("lastAt"));
  const messages = await col("messages");
  return Promise.all(conversations.map(async (conversation) => ({
    ...conversation,
    lead: await getLead(String(conversation.leadId)),
    messages: messages
      .filter((item) => item.conversationId === conversation.id)
      .sort((a, b) => new Date(String(a.createdAt ?? 0)).getTime() - new Date(String(b.createdAt ?? 0)).getTime()),
  })));
}

export async function listMessageTemplates() {
  return (await col("messageTemplates")).sort((a, b) => String(a.title).localeCompare(String(b.title), "he"));
}

export async function getMessageTemplateByKey(key: string) {
  return getDoc(`messageTemplates/${key}`);
}

export async function listDocumentTemplates() {
  return (await col("documentTemplates")).sort((a, b) =>
    String(a.industry).localeCompare(String(b.industry)) || String(a.type).localeCompare(String(b.type)) || String(a.name).localeCompare(String(b.name)),
  );
}

export async function getDocumentTemplate(id: string) {
  return getDoc(`documentTemplates/${id}`);
}

export async function findDocumentTemplate(type: string, industry?: string | null) {
  const templates = await listDocumentTemplates();
  const defaults = templates.filter((item) => item.type === type && item.isDefault === true);
  if (industry) {
    const match = defaults.filter((item) => item.industry === industry).sort((a, b) => Number(b.version ?? 0) - Number(a.version ?? 0))[0];
    if (match) return match;
  }
  return defaults.sort((a, b) => Number(b.version ?? 0) - Number(a.version ?? 0))[0] ?? null;
}

export async function createDocumentTemplate(data: Row) {
  const id = nanoid();
  const template = clean({
    industry: "general",
    locale: "he",
    version: 1,
    isDefault: false,
    lineItemsJson: "[]",
    createdAt: new Date(),
    ...data,
  });
  await setDoc(`documentTemplates/${id}`, template);
  return { id, ...template };
}

export async function updateDocumentTemplate(id: string, data: Row) {
  const current = await getDocumentTemplate(id);
  if (!current) throw new Error("תבנית לא נמצאה");
  const next = { ...current, ...clean(data) };
  delete next.id;
  await setDoc(`documentTemplates/${id}`, next);
  return { id, ...next };
}

async function signatureImage(path: string) {
  try {
    const [bytes] = await getAdminStorage().bucket().file(path).download();
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return "";
  }
}

async function withSignatureImages(document: Row) {
  const signatures = Array.isArray(document.signatures) ? document.signatures : [];
  const hydrated = await Promise.all(signatures.map(async (signature: Row) => ({
    ...signature,
    imageData: signature.storagePath ? await signatureImage(String(signature.storagePath)) : "",
  })));
  return { ...document, signatures: hydrated };
}

async function presentDocument(document: Row | null, images: boolean) {
  if (!document) return null;
  const lead = document.leadId ? await getLead(String(document.leadId)) : null;
  const full = images ? await withSignatureImages(document) : document;
  return { ...full, lead, lineItems: full.lineItems ?? [] };
}

export async function createDocument(data: Row & { lineItems?: Row[] }) {
  const id = nanoid();
  const lead = data.leadId ? await getLead(String(data.leadId)) : null;
  const lineItems = (data.lineItems ?? []).map((line: Row, index: number) => ({ id: nanoid(), ...line, sortOrder: line.sortOrder ?? index }));
  const document = clean({
    locale: "he",
    status: "DRAFT",
    currency: "ILS",
    intro: "",
    body: "",
    footer: "",
    customNotes: null,
    subtotal: 0,
    vatRate: 17,
    vatAmount: 0,
    total: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
    clientUserId: lead?.clientUserId ?? null,
    lineItems,
    signatures: [],
  });
  delete document.id;
  await setDoc(`documents/${id}`, document);
  if (document.signToken) await setDoc(`signLinks/${String(document.signToken)}`, { documentId: id, leadId: document.leadId });
  return { id, ...document, lead };
}

export async function getDocument(id: string, images = true) {
  return presentDocument(await getDoc(`documents/${id}`), images);
}

export async function getDocumentBySignToken(token: string) {
  const link = await getDoc(`signLinks/${token}`);
  if (!link) return null;
  return getDocument(String(link.documentId), true);
}

export async function updateDocument(id: string, data: Row) {
  const current = await getDoc(`documents/${id}`);
  if (!current) throw new Error("מסמך לא נמצא");
  const next = { ...current, ...clean(data), updatedAt: new Date() };
  delete next.id;
  delete next.lead;
  await setDoc(`documents/${id}`, next);
  if (next.signToken) await setDoc(`signLinks/${String(next.signToken)}`, { documentId: id, leadId: next.leadId });
  return presentDocument({ id, ...next }, false);
}

export async function listDocuments() {
  const documents = (await col("documents")).sort(byDate("updatedAt"));
  return Promise.all(documents.map(async (document) => ({ ...document, lead: await getLead(String(document.leadId)) })));
}

export async function listDocumentsForLead(leadId: string) {
  return (await listDocuments()).filter((document) => document.leadId === leadId);
}

export async function saveSignature(input: {
  documentId: string;
  signerName: string;
  signerRole: string;
  imageData: string;
  ipAddress: string | null;
  userAgent: string | null;
  contentHash: string;
}) {
  const document = await getDoc(`documents/${input.documentId}`);
  if (!document) throw new Error("מסמך לא נמצא");
  const id = nanoid();
  const leadId = String(document.leadId);
  const storagePath = `leads/${leadId}/documents/${input.documentId}/signatures/${id}.png`;
  const encoded = input.imageData.split(",")[1] ?? "";
  await getAdminStorage().bucket().file(storagePath).save(Buffer.from(encoded, "base64"), {
    contentType: "image/png",
    resumable: false,
    metadata: { metadata: { leadId, documentId: input.documentId } },
  });
  const signature = {
    id,
    signerName: input.signerName,
    signerRole: input.signerRole,
    storagePath,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    contentHash: input.contentHash,
    signedAt: new Date(),
  };
  const signatures = [...(Array.isArray(document.signatures) ? document.signatures as Row[] : []), signature];
  await updateDocument(input.documentId, { signatures });
  return signature;
}

export async function createProject(data: Row & { milestones?: Row[] }) {
  const id = nanoid();
  const lead = await getLead(String(data.leadId));
  const milestones = (data.milestones ?? []).map((item: Row, index: number) => ({
    id: nanoid(),
    title: item.title,
    description: item.description ?? null,
    status: "PENDING",
    dueDate: null,
    sortOrder: item.sortOrder ?? index,
    completedAt: null,
  }));
  const project = clean({
    name: data.name,
    leadId: data.leadId,
    clientUserId: lead?.clientUserId ?? null,
    status: data.status ?? "PLANNING",
    summary: data.summary ?? null,
    milestones,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await setDoc(`projects/${id}`, project);
  return { id, ...project, lead };
}

export async function getProject(id: string) {
  const project = await getDoc(`projects/${id}`);
  if (!project) return null;
  const milestones = [...(Array.isArray(project.milestones) ? project.milestones as Row[] : [])].sort(
    (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
  );
  return { ...project, milestones, lead: await getLead(String(project.leadId)) };
}

export async function getProjectByLead(leadId: string) {
  const projects = await col("projects");
  const project = projects.find((item) => item.leadId === leadId);
  return project ? getProject(String(project.id)) : null;
}

export async function listProjects() {
  const projects = (await col("projects")).sort(byDate("updatedAt"));
  const loaded = await Promise.all(projects.map((project) => getProject(String(project.id))));
  return loaded.filter((project) => project !== null);
}

export async function updateProject(id: string, data: Row) {
  const current = await getDoc(`projects/${id}`);
  if (!current) throw new Error("פרויקט לא נמצא");
  const next = { ...current, ...clean(data), updatedAt: new Date() };
  delete next.id;
  delete next.lead;
  await setDoc(`projects/${id}`, next);
  return getProject(id);
}

export async function addMilestone(projectId: string, data: Row) {
  const project = await getProject(projectId);
  if (!project) throw new Error("פרויקט לא נמצא");
  const milestone = {
    id: nanoid(),
    title: data.title,
    description: data.description ?? null,
    status: "PENDING",
    sortOrder: (project.milestones as Row[]).length,
    completedAt: null,
  };
  await updateProject(projectId, { milestones: [...(project.milestones as Row[]), milestone] });
  return getProject(projectId);
}

export async function updateMilestone(id: string, data: Row) {
  const projects = await col("projects");
  const project = projects.find((item) => (item.milestones as Row[] | undefined)?.some((milestone) => milestone.id === id));
  if (!project) throw new Error("אבן דרך לא נמצאה");
  const milestones = (project.milestones as Row[]).map((milestone) => milestone.id === id ? { ...milestone, ...clean(data) } : milestone);
  await updateProject(String(project.id), { milestones });
  const updated = milestones.find((milestone) => milestone.id === id)!;
  return { ...updated, projectId: project.id, project: { ...project, id: project.id, milestones } };
}

export async function createPayment(data: Row) {
  const id = nanoid();
  const lead = await getLead(String(data.leadId));
  const payment = clean({
    currency: "ILS",
    status: "PENDING",
    purpose: "account_close",
    providerRef: null,
    paidAt: null,
    createdAt: new Date(),
    ...data,
    clientUserId: lead?.clientUserId ?? null,
  });
  await setDoc(`payments/${id}`, payment);
  return { id, ...payment };
}

export async function updatePayments(where: { leadId?: string; providerRef?: string }, data: Row) {
  const payments = (await col("payments")).filter((payment) => {
    if (where.leadId && payment.leadId !== where.leadId) return false;
    if (where.providerRef && payment.providerRef !== where.providerRef) return false;
    return true;
  });
  await Promise.all(payments.map((payment) => setDoc(`payments/${payment.id}`, { ...payment, ...clean(data) })));
  return { count: payments.length };
}

export async function createPaymentMethod(data: Row) {
  const id = nanoid();
  const method = clean({ ...data, createdAt: new Date() });
  await setDoc(`paymentMethods/${id}`, method);
  return { id, ...method };
}

export async function listPaymentsForLead(leadId: string) {
  return (await childList("payments", leadId)).sort(byDate("createdAt"));
}

export async function listPaymentMethodsForLead(leadId: string) {
  return (await childList("paymentMethods", leadId)).sort(byDate("createdAt"));
}

export async function getSetting(key: string) {
  const row = await getDoc(`settings/${key}`);
  return row ? { key, value: String(row.value ?? "") } : null;
}

export async function listSettings(keys?: string[]) {
  const rows = await col("settings");
  return rows
    .map((row) => ({ key: String(row.id), value: String(row.value ?? "") }))
    .filter((row) => !keys || keys.includes(row.key));
}

export async function upsertSetting(key: string, value: string) {
  await setDoc(`settings/${key}`, { value });
  return { key, value };
}

export async function createQuestion(data: Row) {
  const id = nanoid();
  const lead = await getLead(String(data.leadId));
  const question = clean({
    required: true,
    answer: null,
    answeredAt: null,
    createdAt: new Date(),
    ...data,
    clientUserId: lead?.clientUserId ?? null,
  });
  await setDoc(`questions/${id}`, question);
  return { id, ...question };
}

export async function getQuestion(id: string) {
  return getDoc(`questions/${id}`);
}

export async function updateQuestion(id: string, data: Row) {
  const current = await getQuestion(id);
  if (!current) throw new Error("שאלה לא נמצאה");
  const next = { ...current, ...clean(data) };
  delete next.id;
  await setDoc(`questions/${id}`, next);
  return { id, ...next };
}

export async function listQuestionsForLead(leadId: string) {
  return (await childList("questions", leadId)).sort(byDate("createdAt"));
}

export async function createAppointment(data: Row) {
  const id = nanoid();
  const lead = await getLead(String(data.leadId));
  const appointment = clean({ completed: false, createdAt: new Date(), ...data, clientUserId: lead?.clientUserId ?? null });
  await setDoc(`appointments/${id}`, appointment);
  return { id, ...appointment };
}

export async function updateAppointment(id: string, data: Row) {
  const current = await getDoc(`appointments/${id}`);
  if (!current) throw new Error("פגישה לא נמצאה");
  const next = { ...current, ...clean(data) };
  delete next.id;
  await setDoc(`appointments/${id}`, next);
  return { id, ...next };
}

export async function listAppointmentsForLead(leadId: string) {
  return (await childList("appointments", leadId)).sort(byDate("scheduledAt"));
}

export async function createReceipt(data: Row) {
  const id = nanoid();
  const lead = await getLead(String(data.leadId ?? ""));
  const receipt = clean({ currency: "ILS", createdAt: new Date(), ...data, clientUserId: lead?.clientUserId ?? null });
  await setDoc(`receipts/${id}`, receipt);
  return { id, ...receipt };
}

export async function listReceiptsForLead(leadId: string) {
  return (await childList("receipts", leadId)).sort(byDate("receivedAt"));
}

export async function createAccess(data: Row) {
  const id = nanoid();
  const access = clean({ createdAt: new Date(), updatedAt: new Date(), changes: [], ...data });
  await setDoc(`accesses/${id}`, access);
  return { id, ...access };
}

export async function addAccessChange(accessId: string, data: { version: string; summary: string }) {
  const access = await getDoc(`accesses/${accessId}`);
  if (!access) throw new Error("גישה לא נמצאה");
  const change = { id: nanoid(), ...data, changedAt: new Date() };
  const changes = [...(Array.isArray(access.changes) ? access.changes as Row[] : []), change];
  await setDoc(`accesses/${accessId}`, { ...access, changes, version: data.version, updatedAt: new Date() });
  return change;
}

export async function listAccessesForLead(leadId: string) {
  const rows = await childList("accesses", leadId);
  return rows.map((access) => ({
    ...access,
    changes: [...(Array.isArray(access.changes) ? access.changes as Row[] : [])].sort(byDate("changedAt")),
  }));
}

export async function createRetainer(data: Row) {
  const id = nanoid();
  const plan = clean({
    unitLabel: "סרטונים",
    quotaPerPeriod: 4,
    period: "MONTH",
    active: true,
    createdAt: new Date(),
    entries: [],
    ...data,
    clientUserId: (await getLead(String(data.leadId ?? "")))?.clientUserId ?? null,
  });
  await setDoc(`retainers/${id}`, plan);
  return { id, ...plan };
}

export async function getRetainer(id: string) {
  return getDoc(`retainers/${id}`);
}

export async function upsertRetainerEntry(planId: string, periodKey: string, data: Row) {
  const plan = await getRetainer(planId);
  if (!plan) return null;
  const entries = Array.isArray(plan.entries) ? [...(plan.entries as Row[])] : [];
  const index = entries.findIndex((entry) => entry.periodKey === periodKey);
  const entry = clean({
    id: index >= 0 ? entries[index].id : nanoid(),
    periodKey,
    delivered: 0,
    notes: null,
    status: "OPEN",
    createdAt: index >= 0 ? entries[index].createdAt : new Date(),
    updatedAt: new Date(),
    ...data,
  });
  if (index >= 0) entries[index] = entry;
  else entries.push(entry);
  const next = { ...plan, entries };
  delete next.id;
  await setDoc(`retainers/${planId}`, next);
  return entry;
}

export async function listRetainersForLead(leadId: string) {
  return childList("retainers", leadId);
}

export async function getLeadDetail(id: string) {
  const lead = await getLead(id);
  if (!lead) return null;
  const [qualification, conversation, documents, questions, appointments, activities, project, payments, receipts, systemAccesses, retainerPlans] = await Promise.all([
    getQualification(id),
    getConversationByLead(id),
    listDocumentsForLead(id),
    listQuestionsForLead(id),
    listAppointmentsForLead(id),
    listActivities(50).then((rows) => rows.filter((row) => row.leadId === id).slice(0, 12)),
    getProjectByLead(id),
    listPaymentsForLead(id),
    listReceiptsForLead(id),
    listAccessesForLead(id),
    listRetainersForLead(id),
  ]);
  return {
    ...lead,
    qualification,
    conversation,
    documents,
    questions,
    appointments,
    activities,
    project,
    payments,
    receipts,
    systemAccesses,
    retainerPlans,
  };
}

export async function getClientBundle(clientUserId: string) {
  const lead = await getLeadByClient(clientUserId);
  if (!lead) return null;
  const id = String(lead.id);
  const [qualification, documents, questions, project, payments, paymentMethods, appointments] = await Promise.all([
    getQualification(id),
    Promise.all((await listDocumentsForLead(id)).map((document) => withSignatureImages(document))),
    listQuestionsForLead(id),
    getProjectByLead(id),
    listPaymentsForLead(id),
    listPaymentMethodsForLead(id),
    listAppointmentsForLead(id),
  ]);
  return { ...lead, qualification, documents, questions, project, payments, paymentMethods, appointments };
}

export async function getOfficeDashboard() {
  const [leads, documents, projects, activities, whatsappError] = await Promise.all([
    listLeads(),
    listDocuments(),
    listProjects(),
    listActivities(12),
    getSetting("whatsapp_last_error"),
  ]);
  return [
    leads,
    documents.filter((document) => document.status === "SENT" || document.status === "VIEWED"),
    leads.filter((lead) => lead.stage === "PAYMENT"),
    projects.filter((project) => project && project.status !== "LIVE"),
    activities,
    whatsappError,
  ] as const;
}
