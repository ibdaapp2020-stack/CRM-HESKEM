import { CheckoutButton } from "@/components/checkout-button";
import { Badge, Card } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { getClientLead } from "@/lib/client-lead";
import { formatMoney } from "@/lib/utils";

export default async function PortalPaymentPage() {
  const user = await requireClient();
  const lead = await getClientLead(user);
  if (!lead) return null;

  const quote = lead.documents.find((d) => d.type === "QUOTE" && d.status === "SIGNED");
  const amount = quote?.total || lead.documents.find((d) => d.type === "QUOTE")?.total || 0;
  const method = lead.paymentMethods[0];
  const lastPayment = lead.payments[0];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">אשראי וסגירת חשבון</h1>
      <Card className="p-5">
        <p className="mb-3 text-sm text-muted">
          פרטי הכרטיס לא נשמרים אצל IBDA. בסנדבוקס זה דף דמה; כשתבחר ספק ישראלי
          יוחלף רק מחבר הסליקה.
        </p>
        <div className="mb-4 text-xl font-bold text-cyan-2">
          לתשלום: {formatMoney(amount)}
        </div>
        {method ? (
          <div className="text-sm">
            אמצעי שמור: {method.brand} •••• {method.last4}
            <div className="mt-2">
              <Badge tone="green">החשבון נסגר</Badge>
            </div>
          </div>
        ) : (
          <CheckoutButton amount={amount} />
        )}
        {lastPayment && (
          <p className="mt-4 text-xs text-muted">
            תשלום אחרון: {lastPayment.status} · {formatMoney(lastPayment.amount)}
          </p>
        )}
      </Card>
    </div>
  );
}
