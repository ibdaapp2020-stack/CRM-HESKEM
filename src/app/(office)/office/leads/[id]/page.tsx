import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { StageBadge } from "@/components/shared/stage-badge";
import { IndustryField, LeadWorkflow } from "@/features/leads/components/lead-workflow";
import { CampaignBadge } from "@/components/shared/campaign-badge";
import { CustomerCard } from "@/features/clients/components/customer-card";
import { updateLeadDetailsAction } from "@/features/leads/actions";
import { getLeadDetail } from "@/services/database";
import { industryLabel } from "@/lib/industries";
import { formatDateTime, parseTags } from "@/lib/utils";
import { getT } from "@/lib/locale";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale, t } = await getT();
  const lead = await getLeadDetail(id);
  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{lead.fullName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <StageBadge stage={lead.stage} />
            <CampaignBadge
              source={lead.source}
              headline={lead.campaignHeadline}
            />
            <span>{industryLabel(lead.industry)}</span>
            <span>ציון {lead.score}</span>
            <span>{lead.phone}</span>
          </div>
        </div>
        <Link href="/office/leads">
          <Button variant="ghost">{t("backToLeads")}</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <LeadWorkflow
          lead={{
            ...lead,
            conversation: lead.conversation,
            project: lead.project,
          }}
        />

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 font-medium">פרטי לקוח וענף</h2>
            <form action={updateLeadDetailsAction} className="space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              <Field label="שם">
                <Input name="fullName" defaultValue={lead.fullName} />
              </Field>
              <Field label="טלפון">
                <Input name="phone" defaultValue={lead.phone} />
              </Field>
              <Field label="אימייל">
                <Input name="email" defaultValue={lead.email ?? ""} />
              </Field>
              <Field label="חברה">
                <Input name="company" defaultValue={lead.company ?? ""} />
              </Field>
              <Field label="ענף — קובע את תבנית ההצעה">
                <IndustryField value={lead.industry} />
              </Field>
              <Field label="תגיות">
                <Input name="tags" defaultValue={parseTags(lead.tags).join(", ")} />
              </Field>
              <Field label="הערות">
                <Textarea name="notes" rows={3} defaultValue={lead.notes ?? ""} />
              </Field>
              <Button type="submit">שמור</Button>
            </form>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-medium">יומן</h2>
            <ul className="space-y-2 text-sm">
              {lead.activities.map((a: { id: string; message: string; createdAt: string | Date }) => (
                <li key={a.id} className="border-b border-line/40 pb-2">
                  {a.message}
                  <span className="ms-2 text-xs text-muted">{formatDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <CustomerCard
        leadId={lead.id}
        locale={locale}
        quotedTotal={
          lead.documents.find((d: { type: string; status: string; total: number }) => d.type === "QUOTE" && d.status === "SIGNED")?.total ??
          lead.documents.find((d: { type: string; total: number }) => d.type === "QUOTE")?.total ??
          0
        }
        receipts={lead.receipts}
        accesses={lead.systemAccesses}
        plans={lead.retainerPlans}
        source={lead.source}
        campaignHeadline={lead.campaignHeadline}
      />
    </div>
  );
}
