"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { addActivity, addMilestone, createProject, getProject, updateLead, updateMilestone, updateProject } from "@/services/firestore/crm";

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

  const project = await createProject({
    leadId,
    name,
    summary,
    status: "IN_PROGRESS",
    milestones: DEFAULT_MILESTONES.map((item, index) => ({
      title: item.title,
      description: item.description,
      sortOrder: index,
    })),
  });

  await updateLead(leadId, { stage: "ONBOARDING" });
  await addActivity({
    leadId,
    actorId: staff.id,
    type: "project_created",
    message: `נפתח פרויקט הקמה: ${name}`,
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

  const existing = await getProject(projectId);
  if (!existing) throw new Error("פרויקט לא נמצא");
  const project = await addMilestone(projectId, { title, description, sortOrder: (existing.milestones as unknown[]).length });
  await addActivity({
    leadId: String(project?.leadId),
    actorId: staff.id,
    type: "milestone_added",
    message: `נוספה אבן דרך: ${title}`,
  });
  revalidatePath(`/office/projects/${projectId}`);
  revalidatePath("/portal/project");
}

export async function setMilestoneStatusAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "PENDING");
  const milestone = await updateMilestone(id, {
    status,
    completedAt: status === "DONE" ? new Date() : null,
  });

  const milestones = milestone.project.milestones as { id: string; status: string }[];
  const allDone = milestones.every((item) => (item.id === id ? status : item.status) === "DONE");
  if (allDone) {
    await updateProject(String(milestone.projectId), { status: "LIVE" });
    await updateLead(String(milestone.project.leadId), { stage: "UPDATES" });
  }

  await addActivity({
    leadId: String(milestone.project.leadId),
    actorId: staff.id,
    type: "milestone_updated",
    message: `אבן דרך עודכנה: ${milestone.title} → ${status}`,
  });
  revalidatePath(`/office/projects/${milestone.projectId}`);
  revalidatePath("/portal/project");
  revalidatePath("/office");
}
