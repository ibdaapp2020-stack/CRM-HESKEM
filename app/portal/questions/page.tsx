import { Button, Card, Field, Textarea } from "@/components/ui";
import { answerQuestionAction } from "@/lib/actions/questions";
import { requireClient } from "@/lib/auth";
import { getClientLead } from "@/lib/client-lead";

export default async function PortalQuestionsPage() {
  const user = await requireClient();
  const lead = await getClientLead(user);
  if (!lead) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">שאלות מהמשרד</h1>
      {lead.questions.length === 0 && (
        <p className="text-sm text-muted">אין שאלות כרגע.</p>
      )}
      {lead.questions.map((q) => (
        <Card key={q.id} className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-medium">{q.question}</h2>
            {q.required && !q.answer && (
              <span className="text-xs text-amber-200">חובה</span>
            )}
          </div>
          {q.answer ? (
            <p className="text-sm text-emerald-200">נענה: {q.answer}</p>
          ) : (
            <form action={answerQuestionAction} className="space-y-3">
              <input type="hidden" name="id" value={q.id} />
              <Field label="התשובה שלך">
                <Textarea name="answer" rows={3} required />
              </Field>
              <Button type="submit">שלח תשובה</Button>
            </form>
          )}
        </Card>
      ))}
    </div>
  );
}
