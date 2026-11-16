"use server";

import { revalidatePath } from "next/cache";
import { requireClient, requireStaff } from "@/lib/auth";
import { addActivity, createQuestion, getLeadByClient, getQuestion, updateQuestion } from "@/services/firestore/crm";

export async function askClientQuestionAction(formData: FormData) {
  const staff = await requireStaff();
  const leadId = String(formData.get("leadId") || "");
  const question = String(formData.get("question") || "").trim();
  const required = String(formData.get("required") || "on") === "on";
  if (!question) throw new Error("יש לכתוב שאלה");

  await createQuestion({ leadId, question, required, authorId: staff.id });
  await addActivity({
    leadId,
    actorId: staff.id,
    type: "question",
    message: "נשלחה שאלת חובה ללקוח",
  });
  revalidatePath(`/office/leads/${leadId}`);
  revalidatePath("/portal");
  revalidatePath("/portal/questions");
}

export async function answerQuestionAction(formData: FormData) {
  const client = await requireClient();
  const id = String(formData.get("id") || "");
  const answer = String(formData.get("answer") || "").trim();
  if (!answer) throw new Error("יש להשיב");

  const lead = await getLeadByClient(client.id);
  const question = await getQuestion(id);
  if (!lead || !question || question.leadId !== lead.id) {
    throw new Error("אין הרשאה לשאלה זו");
  }

  await updateQuestion(id, { answer, answeredAt: new Date() });
  await addActivity({
    leadId: String(lead.id),
    actorId: client.id,
    type: "question_answered",
    message: "הלקוח השיב על שאלה",
  });
  revalidatePath("/portal");
  revalidatePath("/portal/questions");
  revalidatePath(`/office/leads/${lead.id}`);
}
