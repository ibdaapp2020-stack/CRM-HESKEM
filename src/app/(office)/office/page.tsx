import Link from "next/link";
import { Card } from "@/components/ui";
import { StageBadge } from "@/components/shared/stage-badge";
import { WhatsAppAccountCard } from "@/features/inbox/components/whatsapp-account-card";
import { getOfficeDashboard } from "@/services/database";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { getStoredWhatsAppAccount } from "@/features/inbox/whatsapp/account";
import { STAGE_META, type Stage } from "@/features/leads/pipeline";
import { formatDateTime } from "@/lib/utils";

const emptyAccount = {
  connected: false,
  connectionState: "disconnected" as const,
  credentialsSaved: false,
  provider: "inbox",
  phoneNumberId: "",
  displayPhone: "",
  displayName: "",
  quality: "",
  wabaId: "",
  phoneStatus: "",
  webhookStatus: "",
};

function shownDate(value: unknown) {
  if (value instanceof Date || typeof value === "string") {
    try {
      return formatDateTime(value);
    } catch {
      return "—";
    }
  }
  return "—";
}

function safeLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : "קריאת הנתונים נכשלה";
  if (/private key|begin |secret|token|password/i.test(message)) return "קריאת הנתונים נכשלה";
  return message.slice(0, 180);
}

export default async function OfficeDashboardPage() {
  let dashboard: Awaited<ReturnType<typeof getOfficeDashboard>> = [[], [], [], [], [], null];
  let whatsapp: Awaited<ReturnType<typeof getStoredWhatsAppAccount>> = emptyAccount;
  let loadError: string | null = null;
  try {
    const loaded = await Promise.all([getOfficeDashboard(), getStoredWhatsAppAccount()]);
    dashboard = loaded[0];
    whatsapp = loaded[1];
  } catch (error) {
    console.error("[office] dashboard read failed:", safeLoadError(error));
    loadError = safeLoadError(error);
  }
  const [leads, waitingSign, waitingPay, projects, activities, errorRow] = dashboard;

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
      {(!isAdminConfigured() || loadError) && (
        <Card className="border border-amber-400/40 p-4 text-sm">
          החשבון נכנס.{" "}
          {loadError
            ? `הנתונים לא נטענו: ${loadError}`
            : "מסד הנתונים עדיין לא מחובר לשרת, ולכן הרשימות ריקות. ב-Vercel חסר האימייל האמיתי של חשבון השירות: FIREBASE_CLIENT_EMAIL."}
        </Card>
      )}
      <WhatsAppAccountCard account={whatsapp} error={errorRow?.value} />
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
                  {doc.title} · {doc.lead?.fullName ?? ""}
                </span>
                <StageBadge stage={doc.lead?.stage ?? "NEW_LEAD"} />
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
                  {a.lead?.fullName} · {shownDate(a.createdAt)}
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
