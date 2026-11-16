import Link from "next/link";
import { refreshWhatsAppAccountAction } from "@/features/clients/office-actions";
import type { WhatsAppAccount } from "@/features/inbox/whatsapp/account";
import { Badge, Button, Card } from "@/components/ui";

export function WhatsAppAccountCard({
  account,
  error,
}: {
  account: WhatsAppAccount;
  error?: string;
}) {
  const title = account.displayName || "WhatsApp Business";
  const phone = account.displayPhone || account.phoneNumberId;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="font-medium">חשבון וואטסאפ</h2>
            <Badge
              tone={
                account.connectionState === "connected"
                  ? "green"
                  : account.connectionState === "missing_permissions"
                    ? "amber"
                    : account.connectionState === "error"
                      ? "rose"
                      : "slate"
              }
            >
              {account.connectionState === "connected"
                ? "מחובר"
                : account.connectionState === "missing_permissions"
                  ? "חסרות הרשאות"
                  : account.connectionState === "error"
                    ? "שגיאת חיבור"
                    : "מנותק"}
            </Badge>
          </div>
          {account.connected ? (
            <div className="space-y-1 text-sm">
              <div className="text-lg font-semibold">{title}</div>
              {phone && <div className="text-cyan-2">{phone}</div>}
              <div className="flex flex-wrap gap-2 pt-1">
                {account.quality && <Badge tone="slate">איכות: {account.quality}</Badge>}
                {account.phoneStatus && <Badge tone="slate">{account.phoneStatus}</Badge>}
                {account.webhookStatus === "ok" ? (
                  <Badge tone="green">Webhook פעיל</Badge>
                ) : account.webhookStatus ? (
                  <Badge tone="amber">Webhook לא נרשם</Badge>
                ) : null}
              </div>
              {account.webhookStatus && account.webhookStatus !== "ok" && (
                <p className="text-xs text-amber-200">{account.webhookStatus}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {account.credentialsSaved
                ? "הפרטים שמורים בשרת, אבל Meta עדיין לא אישרה את החיבור."
                : "שמרו Access Token ו-Phone Number ID, ואז הריצו בדיקת חיבור."}
            </p>
          )}
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
        </div>
        <div className="flex gap-2">
          {account.credentialsSaved && (
            <form action={refreshWhatsAppAccountAction}>
              <Button type="submit" variant="outline">
                רענן
              </Button>
            </form>
          )}
          <Link href="/office/settings">
            <Button variant={account.connected ? "ghost" : "primary"}>
              הגדרות
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
