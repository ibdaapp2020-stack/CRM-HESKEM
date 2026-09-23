"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "../auth";
import { prisma } from "../prisma";

const DEFAULT_MILESTONES = [
  { title: "אפיון ואיסוף חומרים", description: "אישור אפיון, גישות וחשבונות" },
  { title: "בניית תשתית", description: "הקמת סביבה, הרשאות ומסד נתונים" },
  { title: "פיתוח ליבה", description: "מסכים ותהליכים העיקריים" },
  { title: "בדיקות והדרכה", description: "בדיקה עם הלקוח והדרכת צוות" },
  { title: "עלייה לאוויר", description: "השקה וליווי ראשוני" },
];

export async function createProjectAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  const name = String(formData.get("name") || "").trim();
  const summary = String(formData.get("summary") || "").trim() || null;
  if (!name) throw new Error("יש לתת שם לפרויקט");

  const project = await prisma.project.create({
    data: {
      leadId,
      name,
      summary,
      status: "IN_PROGRESS",
      milestones: {
        create: DEFAULT_MILESTONES.map((m, index) => ({
          title: m.title,
          description: m.description,
          sortOrder: index,
        })),
      },
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { stage: "ONBOARDING" },
  });
  await prisma.activity.create({
    data: {
      leadId,
      actorId: staff.id,
      type: "project_created",
      message: `נפתח פרויקט הקמה: ${name}`,
    },
  });
  revalidatePath("/office/projects");
  revalidatePath(`/office/projects/${project.id}`);
  revalidatePath("/portal");
  revalidatePath("/portal/project");
}

export async function addMilestoneAction(formData: FormData) {
  const staff = await requireStaff();
  const projectId = String(formData.get("projectId") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!title) throw new Error("יש כותרת לאבן דרך");

  const count = await prisma.milestone.count({ where: { projectId } });
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      milestones: {
        create: { title, description, sortOrder: count },
      },
    },
  });
  await prisma.activity.create({
    data: {
      leadId: project.leadId,
      actorId: staff.id,
      type: "milestone_added",
      message: `נוספה אבן דרך: ${title}`,
    },
  });
  revalidatePath(`/office/projects/${projectId}`);
  revalidatePath("/portal/project");
}

export async function setMilestoneStatusAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "PENDING");
  const milestone = await prisma.milestone.update({
    where: { id },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
    },
    include: { project: { include: { milestones: true } } },
  });

  const allDone = milestone.project.milestones.every(
    (m) => (m.id === id ? status : m.status) === "DONE",
  );
  if (allDone) {
    await prisma.project.update({
      where: { id: milestone.projectId },
      data: { status: "LIVE" },
    });
    await prisma.lead.update({
      where: { id: milestone.project.leadId },
      data: { stage: "UPDATES" },
    });
  }

  await prisma.activity.create({
    data: {
      leadId: milestone.project.leadId,
      actorId: staff.id,
      type: "milestone_updated",
      message: `אבן דרך עודכנה: ${milestone.title} → ${status}`,
    },
  });
  revalidatePath(`/office/projects/${milestone.projectId}`);
  revalidatePath("/portal/project");
  revalidatePath("/office");
}
