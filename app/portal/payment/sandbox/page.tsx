import { completeSandboxPaymentAction } from "@/lib/actions/payments";
import { Button, Card, Field, Input } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function SandboxCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; amount?: string }>;
}) {
  const { ref, amount } = await searchParams;
  return (
    <Card className="p-6">
      <h1 className="mb-2 text-2xl font-bold">סליקה — Sandbox</h1>
      <p className="mb-4 text-sm text-muted">
        דף דמה בלבד. לא מועבר כרטיס אמיתי. הזן כל ערך ולחץ אישור.
      </p>
      <div className="mb-4 text-lg text-cyan-2">
        סכום: {formatMoney(Number(amount || 0))}
      </div>
      <form action={completeSandboxPaymentAction} className="space-y-3">
        <input type="hidden" name="ref" value={ref ?? ""} />
        <input type="hidden" name="amount" value={amount ?? "0"} />
        <Field label="שם על הכרטיס">
          <Input defaultValue="JOSEPH COHEN" />
        </Field>
        <Field label="מספר כרטיס (תצוגה בלבד, לא נשלח לשרת)">
          <Input defaultValue="4580 0000 0000 4242" autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="תוקף">
            <Input defaultValue="12/29" />
          </Field>
          <Field label="CVV">
            <Input defaultValue="123" />
          </Field>
        </div>
        <Button type="submit">אשר ושמור טוקן</Button>
      </form>
    </Card>
  );
}
