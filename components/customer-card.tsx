import { Button, Card, Field, Input, Textarea, Badge } from "@/components/ui";
import {
  addReceiptAction,
  addSystemChangeAction,
  saveRetainerPlanAction,
  saveSystemAccessAction,
  updateRetainerEntryAction,
} from "@/lib/actions/office";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type Receipt = {
  id: string;
  method: string;
  amount: number;
  receivedAt: Date;
  reference: string | null;
  bank: string | null;
  checkNumber: string | null;
  notes: string | null;
};
type Access = {
  id: string;
  label: string;
  url: string | null;
  username: string | null;
  secret: string | null;
  version: string | null;
  notes: string | null;
  changes: { id: string; version: string; summary: string; changedAt: Date }[];
};
type Plan = {
  id: string;
  title: string;
  unitLabel: string;
  quotaPerPeriod: number;
  entries: { id: string; periodKey: string; delivered: number; notes: string | null; status: string }[];
};

const METHOD: Record<string, string> = {
  CASH: "cash",
  CHECK: "check",
  TRANSFER: "transfer",
  CARD: "card",
};

function periodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CustomerCard({
  leadId,
  locale,
  quotedTotal,
  receipts,
  accesses,
  plans,
}: {
  leadId: string;
  locale: Locale;
  quotedTotal: number;
  receipts: Receipt[];
  accesses: Access[];
  plans: Plan[];
}) {
  const received = receipts.reduce((sum, r) => sum + r.amount, 0);
  const tr = (key: string) => t(locale, key);
  const month = periodKey();

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 font-medium">{tr("customerCard")}</h2>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted">{tr("quoted")}</div>
            <div className="font-medium">{formatMoney(quotedTotal)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">{tr("received")}</div>
            <div className="font-medium text-emerald-200">{formatMoney(received)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">{tr("balance")}</div>
            <div className="font-medium text-cyan-2">{formatMoney(quotedTotal - received)}</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-medium">{tr("receipts")}</h2>
        <form action={addReceiptAction} className="grid gap-2 md:grid-cols-2">
          <input type="hidden" name="leadId" value={leadId} />
          <Field label={tr("amount")}>
            <Input name="amount" type="number" required />
          </Field>
          <Field label={tr("receipts")}>
            <select name="method" className="w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm">
              <option value="TRANSFER">{tr("transfer")}</option>
              <option value="CHECK">{tr("check")}</option>
              <option value="CASH">{tr("cash")}</option>
              <option value="CARD">{tr("card")}</option>
            </select>
          </Field>
          <Field label="תאריך">
            <Input name="receivedAt" type="date" />
          </Field>
          <Field label="אסמכתא / בנק / מספר צ׳ק">
            <Input name="reference" placeholder="אסמכתא" />
          </Field>
          <Field label="בנק">
            <Input name="bank" />
          </Field>
          <Field label="מספר צ׳ק">
            <Input name="checkNumber" />
          </Field>
          <div className="md:col-span-2">
            <Field label="הערה">
              <Input name="notes" />
            </Field>
          </div>
          <Button type="submit">{tr("addReceipt")}</Button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {receipts.map((r) => (
            <li key={r.id} className="rounded-xl bg-navy px-3 py-2">
              {formatMoney(r.amount)} · {tr(METHOD[r.method] ?? "transfer")} · {formatDate(r.receivedAt)}
              {r.checkNumber ? ` · צ׳ק ${r.checkNumber}` : ""}
              {r.bank ? ` · ${r.bank}` : ""}
              {r.reference ? ` · ${r.reference}` : ""}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-medium">{tr("systemAccess")}</h2>
        <form action={saveSystemAccessAction} className="grid gap-2">
          <input type="hidden" name="leadId" value={leadId} />
          <Field label="שם המערכת / האפליקציה">
            <Input name="label" defaultValue="אפליקציית הלקוח" />
          </Field>
          <Field label={tr("systemUrl")}>
            <Input name="url" placeholder="https://" />
          </Field>
          <Field label={tr("username")}>
            <Input name="username" />
          </Field>
          <Field label={tr("password")}>
            <Input name="secret" type="password" />
          </Field>
          <Field label={tr("version")}>
            <Input name="version" placeholder="1.0.0" />
          </Field>
          <Button type="submit">{tr("save")}</Button>
        </form>
        {accesses.map((a) => (
          <div key={a.id} className="mt-4 rounded-xl border border-line p-3 text-sm">
            <div className="font-medium">{a.label}</div>
            {a.url && (
              <a href={a.url} className="text-cyan-2" target="_blank" rel="noreferrer">
                {a.url}
              </a>
            )}
            <div className="text-muted">
              {a.username ? `${tr("username")}: ${a.username}` : ""}{" "}
              {a.secret ? `· ${tr("password")}: ${a.secret}` : ""}
            </div>
            {a.version && <Badge>{a.version}</Badge>}
            <form action={addSystemChangeAction} className="mt-3 space-y-2">
              <input type="hidden" name="accessId" value={a.id} />
              <input type="hidden" name="leadId" value={leadId} />
              <Field label={tr("version")}>
                <Input name="version" required />
              </Field>
              <Field label={tr("changelog")}>
                <Textarea name="summary" rows={2} required />
              </Field>
              <Button type="submit" variant="outline">
                {tr("addChange")}
              </Button>
            </form>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {a.changes.map((c) => (
                <li key={c.id}>
                  {c.version}: {c.summary} · {formatDate(c.changedAt)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-medium">{tr("monthlyFollowup")}</h2>
        <form action={saveRetainerPlanAction} className="grid gap-2 md:grid-cols-3">
          <input type="hidden" name="leadId" value={leadId} />
          <Field label="שם השירות">
            <Input name="title" defaultValue="שיווק חודשי — צילום סרטונים" />
          </Field>
          <Field label={tr("videos")}>
            <Input name="unitLabel" defaultValue="סרטונים" />
          </Field>
          <Field label={tr("quota")}>
            <Input name="quota" type="number" defaultValue={4} />
          </Field>
          <Button type="submit">{tr("save")}</Button>
        </form>
        {plans.map((plan) => {
          const entry = plan.entries.find((e) => e.periodKey === month);
          return (
            <div key={plan.id} className="mt-4 rounded-xl border border-line p-3">
              <div className="font-medium">{plan.title}</div>
              <div className="text-sm text-muted">
                {tr("thisMonth")} {month}: {entry?.delivered ?? 0}/{plan.quotaPerPeriod} {plan.unitLabel}
              </div>
              <form action={updateRetainerEntryAction} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="leadId" value={leadId} />
                <input type="hidden" name="periodKey" value={month} />
                <Field label={tr("delivered")}>
                  <Input
                    name="delivered"
                    type="number"
                    defaultValue={entry?.delivered ?? 0}
                    className="w-24"
                  />
                </Field>
                <Field label="הערה">
                  <Input name="notes" defaultValue={entry?.notes ?? ""} />
                </Field>
                <Button type="submit">עדכן חודש</Button>
              </form>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
