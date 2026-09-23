import Link from "next/link";
import { StageTimeline } from "@/components/stage-timeline";
import { Badge, Button, Card } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { getClientLead } from "@/lib/client-lead";
import { STAGE_META, isStage } from "@/lib/pipeline";
import { formatDateTime } from "@/lib/utils";

export default async function PortalHomePage() {
  const user = await requireClient();
  const lead = await getClientLead(user);
  if (!lead) {
    return <p className="text-muted">לא נמצא תיק לקוח משויך למשתמש זה.</p>;
  }

  const openQuestions = lead.questions.filter((q) => !q.answer);
  const pendingDocs = lead.documents.filter((d) => d.status !== "SIGNED");
  const stageMeta = isStage(lead.stage) ? STAGE_META[lead.stage] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">שלום {lead.fullName}</h1>
        <p className="text-sm text-muted">
          כאן רואים איפה התהליך עומד, מה צריך ממך, ומה קורה בהקמה.
        </p>
      </div>
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">השלב הנוכחי</h2>
          {stageMeta && <Badge>{stageMeta.clientLabel}</Badge>}
        </div>
        <StageTimeline current={lead.stage} />
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-2 font-medium">מסמכים לחתימה</h2>
          {pendingDocs.length === 0 ? (
            <p className="text-sm text-muted">אין מסמכים ממתינים.</p>
          ) : (
            <ul className="space-y-2">
              {pendingDocs.map((d) => (
                <li key={d.id}>
                  <Link href={`/portal/documents/${d.id}`} className="text-cyan-2">
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-medium">שאלות שחייבים ממך</h2>
          {openQuestions.length === 0 ? (
            <p className="text-sm text-muted">אין שאלות פתוחות.</p>
          ) : (
            <div>
              <p className="mb-3 text-sm text-amber-200">
                {openQuestions.length} שאלות ממתינות לתשובה
              </p>
              <Link href="/portal/questions">
                <Button>למענה</Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
      {lead.appointments[0] && (
        <Card className="p-5">
          <h2 className="mb-2 font-medium">הפגישה הבאה</h2>
          <p>{lead.appointments[0].title}</p>
          <p className="text-sm text-muted">
            {formatDateTime(lead.appointments[0].scheduledAt)}{" "}
            {lead.appointments[0].location}
          </p>
        </Card>
      )}
      <div className="flex gap-2">
        <Link href="/portal/project">
          <Button variant="outline">התקדמות ההקמה</Button>
        </Link>
        <Link href="/portal/payment">
          <Button variant="outline">אשראי וסגירת חשבון</Button>
        </Link>
      </div>
    </div>
  );
}
