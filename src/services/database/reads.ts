import {
  countLeadsByStage,
  getDocument,
  getDocumentBySignToken,
  getDocumentTemplate,
  getLead,
  getLeadByClient,
  getLeadDetail,
  getOfficeDashboard,
  getProject,
  getSetting,
  listConversations,
  listDocumentTemplates,
  listDocuments,
  listDocumentsForLead,
  listLeads,
  listMessageTemplates,
  listProjects,
  searchLeads,
} from "@/services/firestore/crm";

export { searchLeads, countLeadsByStage, getLeadDetail };

export function getLeadById(id: string) {
  return getLead(id);
}

export function getLeadIdForClient(clientUserId: string) {
  return getLeadByClient(clientUserId);
}

export function listDocumentsPage() {
  return listDocuments();
}

export { listDocuments };

export function listTemplatesByType(type: string) {
  return listDocumentTemplates().then((rows) => rows.filter((row) => row.type === type));
}

export function getOfficeDocument(id: string) {
  return getDocument(id, true);
}

export { getDocumentBySignToken };

export function getPortalDocument(id: string) {
  return getDocument(id, true);
}

export function listTemplates() {
  return listDocumentTemplates();
}

export async function listSentDocuments() {
  const documents = await listDocuments();
  return documents.filter((document) => ["SENT", "SIGNED", "VIEWED"].includes(String(document.status))).slice(0, 30);
}

export function getTemplate(id: string) {
  return getDocumentTemplate(id);
}

export function listInbox() {
  return Promise.all([listConversations(), listMessageTemplates()]);
}

export function getWhatsAppLastError() {
  return getSetting("whatsapp_last_error");
}

export { listProjects, getProject, getOfficeDashboard, listLeads, listDocumentsForLead };
