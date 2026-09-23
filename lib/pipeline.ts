export const STAGES = [
  "NEW_LEAD",
  "QUALIFYING",
  "VOICE_CALL",
  "MEETING",
  "QUOTE_SENT",
  "QUOTE_SIGNED",
  "CONTRACT",
  "PAYMENT",
  "ONBOARDING",
  "UPDATES",
  "LOST",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_META: Record<
  Stage,
  { label: string; hint: string; clientLabel: string }
> = {
  NEW_LEAD: {
    label: "ליד חדש",
    hint: "פנייה ראשונה בוואטסאפ",
    clientLabel: "קיבלנו את הפנייה שלך",
  },
  QUALIFYING: {
    label: "סינון",
    hint: "בדיקת התאמה, תקציב ודחיפות",
    clientLabel: "מסננים ומבינים את הצורך",
  },
  VOICE_CALL: {
    label: "שיחה קולית",
    hint: "שיחת היכרות קולית",
    clientLabel: "שיחת היכרות קולית",
  },
  MEETING: {
    label: "פגישה",
    hint: "זום או פגישה פרונטלית",
    clientLabel: "פגישת אפיון",
  },
  QUOTE_SENT: {
    label: "הצעת מחיר",
    hint: "נשלחה הצעה לחתימה",
    clientLabel: "הצעת מחיר ממתינה לחתימה",
  },
  QUOTE_SIGNED: {
    label: "הצעה נחתמה",
    hint: "הלקוח חתם על ההצעה",
    clientLabel: "ההצעה נחתמה",
  },
  CONTRACT: {
    label: "הסכם ותקנון",
    hint: "הסכם עבודה ותקנון לחתימה",
    clientLabel: "הסכם ותקנון",
  },
  PAYMENT: {
    label: "אשראי וסגירה",
    hint: "עדכון אשראי וסגירת חשבון",
    clientLabel: "סגירת חשבון",
  },
  ONBOARDING: {
    label: "הקמת מערכת",
    hint: "בניית והקמת המערכת ללקוח",
    clientLabel: "מקימים את המערכת שלך",
  },
  UPDATES: {
    label: "שיחות עדכון",
    hint: "ליווי ושיחות עדכון עתידיות",
    clientLabel: "ליווי שוטף",
  },
  LOST: {
    label: "לא רלוונטי",
    hint: "סונן החוצה — ההיסטוריה נשמרת",
    clientLabel: "הפנייה נסגרה",
  },
};

export const CLIENT_VISIBLE_STAGES: Stage[] = STAGES.filter((s) => s !== "LOST");

export const QUALIFY_THRESHOLD = 40;

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export function stageIndex(stage: string) {
  const index = STAGES.indexOf(stage as Stage);
  return index === -1 ? 0 : index;
}

export function nextStage(stage: string): Stage | null {
  if (stage === "LOST" || stage === "UPDATES") return null;
  const index = STAGES.indexOf(stage as Stage);
  if (index < 0) return null;
  const upcoming = STAGES[index + 1];
  return upcoming && upcoming !== "LOST" ? upcoming : null;
}
