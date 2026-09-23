import { Badge } from "./ui";
import { STAGE_META, type Stage, isStage } from "@/lib/pipeline";

const TONE: Record<string, "cyan" | "amber" | "rose" | "slate" | "green"> = {
  NEW_LEAD: "cyan",
  QUALIFYING: "amber",
  VOICE_CALL: "cyan",
  MEETING: "cyan",
  QUOTE_SENT: "amber",
  QUOTE_SIGNED: "green",
  CONTRACT: "amber",
  PAYMENT: "amber",
  ONBOARDING: "cyan",
  UPDATES: "green",
  LOST: "rose",
};

export function StageBadge({ stage }: { stage: string }) {
  const key = isStage(stage) ? (stage as Stage) : "NEW_LEAD";
  return <Badge tone={TONE[key] ?? "slate"}>{STAGE_META[key].label}</Badge>;
}
