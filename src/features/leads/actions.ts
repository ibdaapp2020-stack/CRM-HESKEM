"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { requireStaff } from "@/lib/auth";
import {
  addActivity,
  createAppointment,
  createConversation,
  createLead,
  updateAppointment,
  updateLead,
  upsertAuthUser,
  upsertQualification,
} from "@/services/firestore/crm";
import { isStage, QUALIFY_THRESHOLD } from "./pipeline";
import { scoreQualification } from "./qualification";
import { serializeTags } from "@/lib/utils";

async function log(leadId: string, actorId: string, type: string, message: string) {
  await addActivity({ leadId, actorId, type, message });
}

export async function createLeadAction(formData: FormData) {
  const staff = await requireStaff();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const company = String(formData.get("company") || "").trim() || null;
  const source = String(formData.get("source") || "whatsapp");
  const industry = String(formData.get("industry") || "general");
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!fullName || !phone) {
    throw new Error("שם ומספר טלפון הם שדות חובה");
  }

  const clientEmail = email || `${phone.replace(/\D/g, "")}@client.ibda.local`;
  const clientUser = await upsertAuthUser({
    email: clientEmail,
    name: fullName,
    phone,
    password: `Client${nanoid(8)}`,
    role: "CLIENT",
  });

  const lead = await createLead({
    fullName,
    phone,
    email,
    company,
    source,
    industry,
    notes,
    stage: "NEW_LEAD",
    ownerId: staff.id,
    clientUserId: clientUser.id,
  });

  await createConversation(String(lead.id), process.env.WHATSAPP_PROVIDER === "cloud" ? "cloud_api" : "inbox");

  await log(lead.id, staff.id, "lead_created", `ליד חדש נוצר: ${fullName}`);
  revalidatePath("/office");
  revalidatePath("/office/leads");
  revalidatePath("/office/inbox");
  redirect(`/office/leads/${lead.id}`);
}

export async function updateLeadDetailsAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  await updateLead(id, {
    fullName: String(formData.get("fullName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim() || null,
    company: String(formData.get("company") || "").trim() || null,
    industry: String(formData.get("industry") || "general"),
    notes: String(formData.get("notes") || "").trim() || null,
    tags: serializeTags(
      String(formData.get("tags") || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  });
  await log(id, staff.id, "lead_updated", "עודכנו פרטי הליד");
  revalidatePath(`/office/leads/${id}`);
}

export async function moveLeadStageAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const stage = String(formData.get("stage") || "");
  const lostReason = String(formData.get("lostReason") || "").trim() || null;
  if (!isStage(stage)) throw new Error("שלב לא חוקי");

  await updateLead(id, { stage, lostReason: stage === "LOST" ? lostReason : null });
  await log(id, staff.id, "stage_changed", `השלב עודכן ל-${stage}`);
  revalidatePath("/office");
  revalidatePath("/office/leads");
  revalidatePath(`/office/leads/${id}`);
  revalidatePath("/portal");
}

export async function saveQualificationAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  const budget = String(formData.get("budget") || "") || null;
  const serviceType = String(formData.get("serviceType") || "") || null;
  const urgency = String(formData.get("urgency") || "") || null;
  const fit = String(formData.get("fit") || "") || null;
  const { score, qualified } = scoreQualification({
    budget,
    serviceType,
    urgency,
    fit,
  });

  await upsertQualification(leadId, { budget, serviceType, urgency, fit, score, qualified });

  const nextStage = !qualified && score < QUALIFY_THRESHOLD ? "LOST" : "VOICE_CALL";
  await updateLead(leadId, {
    score,
    stage: nextStage,
    lostReason: nextStage === "LOST" ? "ציון סינון נמוך" : null,
  });

  await log(
    leadId,
    staff.id,
    "qualified",
    `סינון הושלם — ציון ${score}${qualified ? " (מתאים)" : " (לא רלוונטי)"}`,
  );
  revalidatePath("/office/leads");
  revalidatePath(`/office/leads/${leadId}`);
}

export async function createAppointmentAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  const type = String(formData.get("type") || "VOICE");
  const title = String(formData.get("title") || "פגישה");
  const scheduledAt = new Date(String(formData.get("scheduledAt") || ""));
  const location = String(formData.get("location") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  await createAppointment({ leadId, type, title, scheduledAt, location, notes });

  const stageMap: Record<string, string> = {
    VOICE: "VOICE_CALL",
    ZOOM: "MEETING",
    IN_PERSON: "MEETING",
    UPDATE: "UPDATES",
  };
  if (stageMap[type]) {
    await updateLead(leadId, { stage: stageMap[type] });
  }

  await log(leadId, staff.id, "appointment", `נקבע: ${title}`);
  revalidatePath(`/office/leads/${leadId}`);
  revalidatePath("/portal");
}

export async function completeAppointmentAction(formData: FormData) {
  const staff = await requireStaff();
  const id = String(formData.get("id") || "");
  const appt = await updateAppointment(id, { completed: true });
  if (appt.type === "VOICE") {
    await updateLead(String(appt.leadId), { stage: "MEETING" });
  }
  await log(appt.leadId, staff.id, "appointment_done", `הושלם: ${appt.title}`);
  revalidatePath(`/office/leads/${appt.leadId}`);
}
