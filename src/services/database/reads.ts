import { prisma } from "./client";

export function searchLeads(stage?: string, q?: string) {
  return prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    where: {
      AND: [
        stage && stage !== "ALL" ? { stage } : {},
        q
          ? {
              OR: [
                { fullName: { contains: q } },
                { phone: { contains: q } },
                { company: { contains: q } },
                { campaignHeadline: { contains: q } },
              ],
            }
          : {},
      ],
    },
  });
}

export function countLeadsByStage() {
  return prisma.lead.groupBy({
    by: ["stage"],
    _count: { _all: true },
  });
}

export function getLeadDetail(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      qualification: true,
      conversation: true,
      documents: { orderBy: { createdAt: "desc" } },
      questions: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { scheduledAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 12 },
      project: true,
      payments: true,
      receipts: { orderBy: { receivedAt: "desc" } },
      systemAccesses: { include: { changes: { orderBy: { changedAt: "desc" } } } },
      retainerPlans: { include: { entries: true } },
    },
  });
}

export function getLeadById(id: string) {
  return prisma.lead.findUnique({ where: { id } });
}

export function getLeadIdForClient(clientUserId: string) {
  return prisma.lead.findUnique({ where: { clientUserId } });
}

export function listDocuments() {
  return prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
    include: { lead: true, signatures: true },
  });
}

export function listTemplatesByType(type: string) {
  return prisma.documentTemplate.findMany({
    where: { type },
    orderBy: [{ industry: "asc" }, { name: "asc" }],
  });
}

export function getOfficeDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { lead: true, lineItems: { orderBy: { sortOrder: "asc" } }, signatures: true },
  });
}

export function getDocumentBySignToken(token: string) {
  return prisma.document.findUnique({
    where: { signToken: token },
    include: { lead: true, lineItems: true, signatures: true },
  });
}

export function getPortalDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { lead: true, lineItems: true, signatures: true },
  });
}

export function listTemplates() {
  return prisma.documentTemplate.findMany({
    orderBy: [{ industry: "asc" }, { type: "asc" }, { name: "asc" }],
  });
}

export function listSentDocuments() {
  return prisma.document.findMany({
    where: { status: { in: ["SENT", "SIGNED", "VIEWED"] } },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: { lead: true },
  });
}

export function getTemplate(id: string) {
  return prisma.documentTemplate.findUnique({ where: { id } });
}

export function listInbox() {
  return Promise.all([
    prisma.conversation.findMany({
      orderBy: { lastAt: "desc" },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.messageTemplate.findMany({ orderBy: { title: "asc" } }),
  ]);
}

export function getWhatsAppLastError() {
  return prisma.appSetting.findUnique({ where: { key: "whatsapp_last_error" } });
}

export function listProjects() {
  return prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { lead: true, milestones: true },
  });
}

export function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      lead: true,
      milestones: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export function getOfficeDashboard() {
  return Promise.all([
    prisma.lead.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.document.findMany({
      where: { status: { in: ["SENT", "VIEWED"] } },
      include: { lead: true },
    }),
    prisma.lead.findMany({ where: { stage: "PAYMENT" } }),
    prisma.project.findMany({
      where: { status: { not: "LIVE" } },
      include: { lead: true, milestones: true },
    }),
    prisma.activity.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: { lead: true },
    }),
    getWhatsAppLastError(),
  ]);
}
