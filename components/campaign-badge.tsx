import { Badge } from "./ui";

export function CampaignBadge({
  source,
  headline,
}: {
  source?: string | null;
  headline?: string | null;
}) {
  if (source !== "whatsapp_ad" && !headline) return null;
  return (
    <Badge tone="amber">{headline?.trim() || "קמפיין וואטסאפ"}</Badge>
  );
}
