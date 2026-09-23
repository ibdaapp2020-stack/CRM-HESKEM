import { STAGE_META, stageIndex, type Stage } from "./pipeline";
import { industryLabel } from "./industries";

export type WorkflowDoc = {
  id: string;
  type: string;
  title: string;
  status: string;
};

export type WorkflowLead = {
  id: string;
  stage: string;
  score: number;
  industry?: string | null;
  conversation?: { id: string } | null;
  qualification?: { qualified: boolean; score: number } | null;
  documents: WorkflowDoc[];
  appointments: { type: string; completed: boolean }[];
  questions: { answer: string | null; required: boolean }[];
  payments: { status: string }[];
  project?: { id: string; status: string } | null;
};

export type StepStatus = "done" | "current" | "upcoming";

export const WORK_STEPS: {
  id: Stage;
  title: string;
  goal: string;
}[] = [
  { id: "NEW_LEAD", title: "פנייה ראשונה", goal: "לקבל פרטים ולפתוח שיחה" },
  { id: "QUALIFYING", title: "סינון ליד", goal: "תקציב, ענף, דחיפות והתאמה" },
  { id: "VOICE_CALL", title: "שיחה קולית", goal: "לקבוע ולהשלים שיחת היכרות" },
  { id: "MEETING", title: "פגישת אפיון", goal: "זום או פגישה פרונטלית" },
  { id: "QUOTE_SENT", title: "הצעת מחיר", goal: "עריכה לפי תבנית ענף ושליחה לחתימה" },
  { id: "QUOTE_SIGNED", title: "הצעה נחתמה", goal: "לוודא חתימה ולהמשיך להסכם" },
  { id: "CONTRACT", title: "הסכם ותקנון", goal: "שליחה לחתימה דיגיטלית" },
  { id: "PAYMENT", title: "אשראי וסגירה", goal: "סגירת חשבון ותיעוד תשלום" },
  { id: "ONBOARDING", title: "הקמת מערכת", goal: "פתיחת פרויקט ומעקב אבני דרך" },
  { id: "UPDATES", title: "שיחות עדכון", goal: "ליווי שוטף אחרי עלייה לאוויר" },
];

function latest(docs: WorkflowDoc[], type: string) {
  return docs.find((d) => d.type === type) ?? null;
}

function signed(docs: WorkflowDoc[], type: string) {
  return docs.some((d) => d.type === type && d.status === "SIGNED");
}

export function stepStatus(lead: WorkflowLead, step: Stage): StepStatus {
  if (lead.stage === "LOST") {
    return stageIndex(lead.stage) > stageIndex(step) ? "done" : "upcoming";
  }
  const current = lead.stage as Stage;
  if (step === current) return "current";
  if (stageIndex(current) > stageIndex(step)) return "done";
  return "upcoming";
}

export function quoteOf(lead: WorkflowLead) {
  return latest(lead.documents, "QUOTE");
}
export function contractOf(lead: WorkflowLead) {
  return latest(lead.documents, "CONTRACT");
}
export function termsOf(lead: WorkflowLead) {
  return latest(lead.documents, "TERMS");
}

export function nextWorkAction(lead: WorkflowLead): { label: string; href: string } {
  const quote = quoteOf(lead);
  const contract = contractOf(lead);
  const terms = termsOf(lead);
  const base = `/office/leads/${lead.id}`;

  switch (lead.stage) {
    case "NEW_LEAD":
      return { label: "סנן ליד", href: `${base}#step-QUALIFYING` };
    case "QUALIFYING":
      return { label: "קבע שיחה קולית", href: `${base}#step-VOICE_CALL` };
    case "VOICE_CALL":
      return { label: "קבע פגישה", href: `${base}#step-MEETING` };
    case "MEETING":
      return quote
        ? { label: "ערוך הצעת מחיר", href: `/office/documents/${quote.id}` }
        : { label: "צור הצעת מחיר", href: `/office/documents/new?leadId=${lead.id}&type=QUOTE` };
    case "QUOTE_SENT":
      return quote
        ? { label: quote.status === "SIGNED" ? "הצעה נחתמה" : "שלח / ערוך הצעה", href: `/office/documents/${quote.id}` }
        : { label: "צור הצעת מחיר", href: `/office/documents/new?leadId=${lead.id}&type=QUOTE` };
    case "QUOTE_SIGNED":
      return contract
        ? { label: "ערוך הסכם", href: `/office/documents/${contract.id}` }
        : { label: "צור הסכם", href: `/office/documents/new?leadId=${lead.id}&type=CONTRACT` };
    case "CONTRACT":
      if (contract && contract.status !== "SIGNED") {
        return { label: "שלח הסכם לחתימה", href: `/office/documents/${contract.id}` };
      }
      if (terms && terms.status !== "SIGNED") {
        return { label: "שלח תקנון לחתימה", href: `/office/documents/${terms.id}` };
      }
      return { label: "צור תקנון", href: `/office/documents/new?leadId=${lead.id}&type=TERMS` };
    case "PAYMENT":
      return { label: "סגור חשבון", href: `${base}#step-PAYMENT` };
    case "ONBOARDING":
      return lead.project
        ? { label: "עדכן הקמה", href: `/office/projects/${lead.project.id}` }
        : { label: "פתח הקמה", href: `${base}#step-ONBOARDING` };
    case "UPDATES":
      return { label: "קבע שיחת עדכון", href: `${base}#step-UPDATES` };
    default:
      return { label: "פתח כרטיס", href: base };
  }
}

export function workflowHint(lead: WorkflowLead) {
  const quote = quoteOf(lead);
  if (lead.stage === "QUOTE_SENT" && quote?.status === "DRAFT") {
    return "יש טיוטת הצעה — אפשר לערוך ולשלוח לחתימה.";
  }
  if (lead.stage === "QUOTE_SENT" && quote?.status === "SENT") {
    return "ההצעה ממתינה לחתימת הלקוח.";
  }
  if (signed(lead.documents, "QUOTE") && !contractOf(lead)) {
    return "ההצעה נחתמה — השלב הבא: הסכם לפי ענף " + industryLabel(lead.industry);
  }
  return STAGE_META[lead.stage as Stage]?.hint ?? "";
}
