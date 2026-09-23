import { createLeadAction } from "@/lib/actions/leads";
import { IndustryField } from "@/components/lead-workflow";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";

export default function NewLeadPage() {
  return (
    <Card className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-bold">ליד חדש מוואטסאפ</h1>
      <form action={createLeadAction} className="space-y-4">
        <Field label="שם מלא">
          <Input name="fullName" required />
        </Field>
        <Field label="טלפון / וואטסאפ">
          <Input name="phone" required />
        </Field>
        <Field label="אימייל">
          <Input name="email" type="email" />
        </Field>
        <Field label="חברה">
          <Input name="company" />
        </Field>
        <Field label="ענף — תבנית הצעת המחיר">
          <IndustryField />
        </Field>
        <Field label="מקור">
          <Input name="source" defaultValue="whatsapp" />
        </Field>
        <Field label="הערות">
          <Textarea name="notes" rows={3} />
        </Field>
        <Button type="submit">צור ליד ופתח סדר עבודה</Button>
      </form>
    </Card>
  );
}
