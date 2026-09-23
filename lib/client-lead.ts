import { prisma } from "./prisma";
import type { SessionUser } from "./session";

export async function getClientLead(user: SessionUser) {
  const lead = await prisma.lead.findUnique({
    where: { clientUserId: user.id },
    include: {
      qualification: true,
      documents: { include: { signatures: true, lineItems: true }, orderBy: { createdAt: "desc" } },
      questions: { orderBy: { createdAt: "desc" } },
      project: { include: { milestones: { orderBy: { sortOrder: "asc" } } } },
      payments: { orderBy: { createdAt: "desc" } },
      paymentMethods: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { scheduledAt: "desc" } },
    },
  });
  return lead;
}
