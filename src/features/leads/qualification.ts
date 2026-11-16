import { QUALIFY_THRESHOLD } from "./pipeline";

export const BUDGET_OPTIONS = [
  { value: "high", label: "מעל 40,000 ₪", points: 30 },
  { value: "mid", label: "15,000–40,000 ₪", points: 20 },
  { value: "low", label: "עד 15,000 ₪", points: 10 },
  { value: "unknown", label: "עדיין לא יודע", points: 5 },
] as const;

export const SERVICE_OPTIONS = [
  { value: "custom", label: "פיתוח מערכת מותאמת", points: 25 },
  { value: "automation", label: "אוטומציה / וואטסאפ / CRM", points: 20 },
  { value: "cloud", label: "ענן ואינטגרציות", points: 15 },
  { value: "other", label: "אחר", points: 10 },
] as const;

export const URGENCY_OPTIONS = [
  { value: "now", label: "מיידי — החודש", points: 20 },
  { value: "month", label: "בחודשיים הקרובים", points: 15 },
  { value: "explore", label: "רק בודק אפשרויות", points: 5 },
] as const;

export const FIT_OPTIONS = [
  { value: "high", label: "התאמה גבוהה ל-IBDA", points: 25 },
  { value: "medium", label: "התאמה בינונית", points: 15 },
  { value: "low", label: "לא מתאים כרגע", points: 5 },
] as const;

function pointsOf<T extends { value: string; points: number }>(
  options: readonly T[],
  value?: string | null,
) {
  return options.find((o) => o.value === value)?.points ?? 0;
}

export function scoreQualification(input: {
  budget?: string | null;
  serviceType?: string | null;
  urgency?: string | null;
  fit?: string | null;
}) {
  const score =
    pointsOf(BUDGET_OPTIONS, input.budget) +
    pointsOf(SERVICE_OPTIONS, input.serviceType) +
    pointsOf(URGENCY_OPTIONS, input.urgency) +
    pointsOf(FIT_OPTIONS, input.fit);
  return {
    score,
    qualified: score >= QUALIFY_THRESHOLD,
  };
}
