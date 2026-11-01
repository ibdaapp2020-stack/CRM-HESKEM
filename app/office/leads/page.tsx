import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { StageBadge } from "@/components/stage-badge";
import { prisma } from "@/lib/prisma";
import { STAGES } from "@/lib/pipeline";
import { industryLabel } from "@/lib/industries";
import { getT } from "@/lib/locale";
import { STAGE_I18N } from "@/lib/i18n";
import { CampaignBadge } from "@/components/campaign-badge";
import { formatDateTime } from "@/lib/utils";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; q?: string }>;
}) {
  const { stage, q } = await searchParams;
  const { locale, t } = await getT();
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    where: {
      AND: [
        stage && stage !== "ALL" ? { stage } : {},
        q
          ? {
              OR: [
                { fullName: { contains: q } },
                { phone: { contains: q } },
                { company: { contains: q } },
                { campaignHeadline: { contains: q } },
              ],
            }
          : {},
      ],
    },
  });
  const counts = await prisma.lead.groupBy({
    by: ["stage"],
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.stage, c._count._all]));
  const stageLabel = (s: string) => STAGE_I18N[locale][s] ?? s;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("pipeline")}</h1>
          <p className="text-sm text-muted">{t("pipelineHint")}</p>
        </div>
        <Link href="/office/leads/new">
          <Button>{t("newLead")}</Button>
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={`${t("phone")} / ${t("pipeline")}`}
          className="min-w-[200px] flex-1 rounded-xl border border-line bg-navy px-3 py-2 text-sm"
        />
          <Button type="submit" variant="outline">
            {t("search")}
          </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <StageChip href="/office/leads" active={!stage || stage === "ALL"} label={`${t("allStages")} (${leads.length})`} />
        {STAGES.map((s) => (
          <StageChip
            key={s}
            href={`/office/leads?stage=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={stage === s}
            label={`${stageLabel(s)} (${countMap[s] ?? 0})`}
          />
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-navy-3/50 text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-normal">{t("pipeline")}</th>
              <th className="px-4 py-3 text-start font-normal">{t("phone")}</th>
              <th className="px-4 py-3 text-start font-normal">{t("campaign")}</th>
              <th className="px-4 py-3 text-start font-normal">{t("industry")}</th>
              <th className="px-4 py-3 text-start font-normal">{t("stage")}</th>
              <th className="px-4 py-3 text-start font-normal">{t("score")}</th>
              <th className="px-4 py-3 text-start font-normal">{t("updated")}</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-line/50 hover:bg-navy-3/40">
                <td className="px-4 py-3">
                  <Link href={`/office/leads/${lead.id}`} className="font-medium text-cyan-2 hover:underline">
                    {lead.fullName}
                  </Link>
                  {lead.company && (
                    <div className="text-xs text-muted">{lead.company}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{lead.phone}</td>
                <td className="px-4 py-3">
                  <CampaignBadge
                    source={lead.source}
                    headline={lead.campaignHeadline}
                  />
                </td>
                <td className="px-4 py-3 text-muted">{industryLabel(lead.industry)}</td>
                <td className="px-4 py-3">
                  <StageBadge stage={lead.stage} />
                </td>
                <td className="px-4 py-3 text-cyan-2">{lead.score}</td>
                <td className="px-4 py-3 text-muted">{formatDateTime(lead.updatedAt)}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StageChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs ${
        active ? "border-cyan bg-cyan/15 text-cyan-2" : "border-line text-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
