import Link from "next/link";
import { Card } from "@/components/ui";
import { StageBadge } from "@/components/stage-badge";
import { prisma } from "@/lib/prisma";
import { STAGE_META, type Stage } from "@/lib/pipeline";
import { formatDateTime } from "@/lib/utils";

export default async function OfficeDashboardPage() {
  const [leads, waitingSign, waitingPay, projects, activities] = await Promise.all([
    prisma.lead.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.document.findMany({
      where: { status: { in: ["SENT", "VIEWED"] } },
      include: { lead: true },
    }),
    prisma.lead.findMany({ where: { stage: "PAYMENT" } }),
    prisma.project.findMany({
      where: { status: { not: "LIVE" } },
      include: { lead: true, milestones: true },
    }),
    prisma.activity.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: { lead: true },
    }),
  ]);

  const counts = leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">דשבורד משרד</h1>
        <p className="text-sm text-muted">
          סינון לידים, חתימות, תשלומים והקמות — במבט אחד.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat title="לידים פתוחים" value={leads.filter((l) => l.stage !== "LOST").length} />
        <Stat title="ממתינים לחתימה" value={waitingSign.length} />
        <Stat title="ממתינים לתשלום" value={waitingPay.length} />
        <Stat title="הקמות פעילות" value={projects.length} />
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {Object.entries(counts).map(([stage, count]) => (
          <Card key={stage} className="p-3">
            <div className="text-xs text-muted">
              {STAGE_META[stage as Stage]?.label ?? stage}
            </div>
            <div className="text-2xl font-bold text-cyan-2">{count}</div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-medium">ממתינים לחתימה</h2>
          <div className="space-y-2">
            {waitingSign.length === 0 && (
              <div className="text-sm text-muted">אין מסמכים ממתינים</div>
            )}
            {waitingSign.map((doc) => (
              <Link
                key={doc.id}
                href={`/office/documents/${doc.id}`}
                className="flex items-center justify-between rounded-xl bg-navy px-3 py-2 text-sm hover:bg-navy-3"
              >
                <span>
                  {doc.title} · {doc.lead.fullName}
                </span>
                <StageBadge stage={doc.lead.stage} />
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-medium">פעילות אחרונה</h2>
          <ul className="space-y-2 text-sm">
            {activities.map((a) => (
              <li key={a.id} className="border-b border-line/50 pb-2">
                <div>{a.message}</div>
                <div className="text-xs text-muted">
                  {a.lead?.fullName} · {formatDateTime(a.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </Card>
  );
}
