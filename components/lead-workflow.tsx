import Link from "next/link";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";
import {
  completeAppointmentAction,
  createAppointmentAction,
  moveLeadStageAction,
  saveQualificationAction,
} from "@/lib/actions/leads";
import { askClientQuestionAction } from "@/lib/actions/questions";
import { recordManualPaymentAction } from "@/lib/actions/payments";
import { createProjectAction } from "@/lib/actions/projects";
import { createFromTemplateAction, sendDocumentAction } from "@/lib/actions/documents";
import {
  BUDGET_OPTIONS,
  FIT_OPTIONS,
  SERVICE_OPTIONS,
  URGENCY_OPTIONS,
} from "@/lib/qualification";
import { INDUSTRIES, industryLabel } from "@/lib/industries";
import { WORK_STEPS, quoteOf, contractOf, termsOf, stepStatus, nextWorkAction } from "@/lib/workflow";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

type LeadBundle = {
  id: string;
  fullName: string;
  stage: string;
  score: number;
  industry: string;
  conversation: { id: string } | null;
  qualification: {
    budget: string | null;
    serviceType: string | null;
    urgency: string | null;
    fit: string | null;
    qualified: boolean;
    score: number;
  } | null;
  documents: { id: string; type: string; title: string; status: string }[];
  appointments: {
    id: string;
    type: string;
    title: string;
    scheduledAt: Date;
    location: string | null;
    completed: boolean;
  }[];
  questions: { id: string; question: string; answer: string | null; required: boolean }[];
  payments: { status: string; amount: number }[];
  project: { id: string; status: string; name: string } | null;
};

function SelectField({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  value?: string | null;
}) {
  return (
    <Field label={label}>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm"
      >
        <option value="">בחירה</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function DocButtons({
  doc,
  editLabel,
  sendLabel,
}: {
  doc: { id: string; status: string } | null;
  editLabel: string;
  sendLabel: string;
}) {
  if (!doc) return null;
  return (
    <>
      <Link href={`/office/documents/${doc.id}`}>
        <Button type="button" variant={doc.status === "SIGNED" ? "outline" : "primary"}>
          {doc.status === "SIGNED" ? "צפה במסמך" : editLabel}
        </Button>
      </Link>
      {doc.status !== "SIGNED" && (
        <form action={sendDocumentAction}>
          <input type="hidden" name="id" value={doc.id} />
          <Button type="submit" variant="outline">
            {sendLabel}
          </Button>
        </form>
      )}
    </>
  );
}

function TemplateCreateButton({
  leadId,
  type,
  label,
}: {
  leadId: string;
  type: string;
  label: string;
}) {
  return (
    <form action={createFromTemplateAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="type" value={type} />
      <Button type="submit">{label}</Button>
    </form>
  );
}

export function LeadWorkflow({ lead }: { lead: LeadBundle }) {
  const quote = quoteOf(lead);
  const contract = contractOf(lead);
  const terms = termsOf(lead);
  const openQuestions = lead.questions.filter((q) => q.required && !q.answer).length;
  const next = nextWorkAction(lead);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">סדר עבודה</h2>
          <p className="text-sm text-muted">
            ענף: {industryLabel(lead.industry)} · כל שלב עם כפתורי ביצוע
          </p>
        </div>
        {lead.conversation && (
          <Link href={`/office/inbox?c=${lead.conversation.id}`}>
            <Button variant="outline">פתח וואטסאפ</Button>
          </Link>
        )}
      </div>
      <Link href={next.href}>
        <Button className="w-full md:w-auto">הפעולה הבאה: {next.label}</Button>
      </Link>

      {openQuestions > 0 && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
          {openQuestions} שאלות חובה ממתינות לתשובת הלקוח
        </div>
      )}

      <ol className="space-y-3">
        {WORK_STEPS.map((step, index) => {
          const status = stepStatus(lead, step.id);
          const current = status === "current";
          return (
            <li key={step.id} id={`step-${step.id}`} className="scroll-mt-24">
              <Card
                className={cn(
                  "p-4",
                  current && "border-cyan/60 shadow-[0_0_24px_rgba(34,211,238,0.12)]",
                  status === "done" && "border-emerald-400/25",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-sm text-cyan-2">
                        {index + 1}
                      </span>
                      <h3 className="font-medium">{step.title}</h3>
                      {status === "done" && <Badge tone="green">הושלם</Badge>}
                      {current && <Badge>עכשיו</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted">{step.goal}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {step.id === "NEW_LEAD" && lead.conversation && (
                    <Link href={`/office/inbox?c=${lead.conversation.id}`}>
                      <Button>פתח שיחה ראשונה</Button>
                    </Link>
                  )}

                  {step.id === "QUALIFYING" && (
                    <form action={saveQualificationAction} className="grid w-full gap-3 md:grid-cols-2">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <SelectField name="budget" label="תקציב" options={BUDGET_OPTIONS} value={lead.qualification?.budget} />
                      <SelectField name="serviceType" label="סוג שירות" options={SERVICE_OPTIONS} value={lead.qualification?.serviceType} />
                      <SelectField name="urgency" label="דחיפות" options={URGENCY_OPTIONS} value={lead.qualification?.urgency} />
                      <SelectField name="fit" label="התאמה" options={FIT_OPTIONS} value={lead.qualification?.fit} />
                      <div className="md:col-span-2">
                        <Button type="submit">חשב ציון והמשך</Button>
                      </div>
                    </form>
                  )}

                  {step.id === "VOICE_CALL" && (
                    <ScheduleBlock
                      leadId={lead.id}
                      type="VOICE"
                      title="שיחת היכרות קולית"
                      appointments={lead.appointments.filter((a) => a.type === "VOICE")}
                    />
                  )}

                  {step.id === "MEETING" && (
                    <ScheduleBlock
                      leadId={lead.id}
                      type="ZOOM"
                      title="פגישת אפיון בזום"
                      extraType="IN_PERSON"
                      extraTitle="פגישה פרונטלית"
                      appointments={lead.appointments.filter((a) => a.type === "ZOOM" || a.type === "IN_PERSON")}
                    />
                  )}

                  {step.id === "QUOTE_SENT" && (
                    <>
                      {!quote && (
                        <>
                          <TemplateCreateButton
                            leadId={lead.id}
                            type="QUOTE"
                            label={`צור הצעה לפי ${industryLabel(lead.industry)}`}
                          />
                          <Link href={`/office/documents/new?leadId=${lead.id}&type=QUOTE`}>
                            <Button variant="outline">בחר תבנית אחרת</Button>
                          </Link>
                        </>
                      )}
                      <DocButtons doc={quote} editLabel="ערוך הצעת מחיר" sendLabel="שלח הצעה לחתימה" />
                      {quote && quote.status !== "SIGNED" && (
                        <Link href={`/office/documents/new?leadId=${lead.id}&type=QUOTE`}>
                          <Button variant="ghost">הצעה חדשה מתבנית</Button>
                        </Link>
                      )}
                    </>
                  )}

                  {step.id === "QUOTE_SIGNED" && quote?.status === "SIGNED" && (
                    <Link href={`/office/documents/${quote.id}`}>
                      <Button variant="outline">צפה בהצעה החתומה</Button>
                    </Link>
                  )}

                  {step.id === "CONTRACT" && (
                    <>
                      {!contract && (
                        <TemplateCreateButton
                          leadId={lead.id}
                          type="CONTRACT"
                          label={`צור הסכם — ${industryLabel(lead.industry)}`}
                        />
                      )}
                      <DocButtons doc={contract} editLabel="ערוך הסכם" sendLabel="שלח הסכם לחתימה" />
                      {!terms && (
                        <TemplateCreateButton leadId={lead.id} type="TERMS" label="צור תקנון" />
                      )}
                      <DocButtons doc={terms} editLabel="ערוך תקנון" sendLabel="שלח תקנון לחתימה" />
                    </>
                  )}

                  {step.id === "PAYMENT" && (
                    <form action={recordManualPaymentAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <Field label="סכום לסגירת חשבון">
                        <Input name="amount" type="number" placeholder="סכום" className="w-40" />
                      </Field>
                      <Button type="submit">סגור חשבון</Button>
                    </form>
                  )}

                  {step.id === "ONBOARDING" &&
                    (lead.project ? (
                      <Link href={`/office/projects/${lead.project.id}`}>
                        <Button>עדכן התקדמות הקמה</Button>
                      </Link>
                    ) : (
                      <form action={createProjectAction} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="leadId" value={lead.id} />
                        <Field label="שם הפרויקט">
                          <Input name="name" defaultValue={`הקמה — ${lead.fullName}`} />
                        </Field>
                        <Button type="submit">פתח הקמת מערכת</Button>
                      </form>
                    ))}

                  {step.id === "UPDATES" && (
                    <ScheduleBlock
                      leadId={lead.id}
                      type="UPDATE"
                      title="שיחת עדכון"
                      appointments={lead.appointments.filter((a) => a.type === "UPDATE")}
                    />
                  )}
                </div>

                {step.id === "QUALIFYING" && current && lead.score > 0 && (
                  <p className="mt-2 text-sm text-cyan-2">ציון נוכחי: {lead.score}</p>
                )}
              </Card>
            </li>
          );
        })}
      </ol>

      <Card className="p-4">
        <h3 className="mb-3 font-medium">שאלה ללקוח</h3>
        <form action={askClientQuestionAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <div className="min-w-[240px] flex-1">
            <Field label="מה חייבים ממנו עכשיו?">
              <Textarea name="question" rows={2} required />
            </Field>
          </div>
          <Button type="submit">שלח לפורטל</Button>
        </form>
        {lead.questions.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {lead.questions.slice(0, 5).map((q) => (
              <li key={q.id}>
                {q.question} — {q.answer ? `נענה: ${q.answer}` : "ממתין"}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {lead.stage !== "LOST" && (
        <form action={moveLeadStageAction} className="flex justify-end">
          <input type="hidden" name="id" value={lead.id} />
          <input type="hidden" name="stage" value="LOST" />
          <Button type="submit" variant="ghost">
            סמן כלא רלוונטי
          </Button>
        </form>
      )}
    </div>
  );
}

function ScheduleBlock({
  leadId,
  type,
  title,
  extraType,
  extraTitle,
  appointments,
}: {
  leadId: string;
  type: string;
  title: string;
  extraType?: string;
  extraTitle?: string;
  appointments: LeadBundle["appointments"];
}) {
  return (
    <div className="w-full space-y-3">
      <form action={createAppointmentAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="leadId" value={leadId} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="title" value={title} />
        <Field label="מועד">
          <Input name="scheduledAt" type="datetime-local" required />
        </Field>
        <Field label="מיקום / קישור">
          <Input name="location" placeholder="זום / כתובת" />
        </Field>
        <Button type="submit">קבע {title}</Button>
      </form>
      {extraType && extraTitle && (
        <form action={createAppointmentAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="type" value={extraType} />
          <input type="hidden" name="title" value={extraTitle} />
          <Field label="מועד">
            <Input name="scheduledAt" type="datetime-local" required />
          </Field>
          <Field label="כתובת">
            <Input name="location" />
          </Field>
          <Button type="submit" variant="outline">
            קבע {extraTitle}
          </Button>
        </form>
      )}
      {appointments.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-xl bg-navy px-3 py-2 text-sm">
          <span>
            {a.title} · {formatDateTime(a.scheduledAt)} {a.location}
          </span>
          {a.completed ? (
            <Badge tone="green">הושלם</Badge>
          ) : (
            <form action={completeAppointmentAction}>
              <input type="hidden" name="id" value={a.id} />
              <Button type="submit" variant="ghost">
                סמן הושלם והמשך
              </Button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

export function IndustryField({ value }: { value?: string | null }) {
  return (
    <select
      name="industry"
      defaultValue={value ?? "general"}
      className="w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm"
    >
      {INDUSTRIES.map((i) => (
        <option key={i.id} value={i.id}>
          {i.label}
        </option>
      ))}
    </select>
  );
}
