import Link from "next/link";
import { refreshWhatsAppAccountAction } from "@/lib/actions/office";
import type { WhatsAppAccount } from "@/lib/whatsapp/account";
import { Badge, Button, Card } from "./ui";

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
            {account.connected ? (
              <Badge tone="green">מחובר</Badge>
            ) : (
              <Badge tone="rose">לא מחובר</Badge>
            )}
          </div>
          {account.connected ? (
            <div className="space-y-1 text-sm">
              <div className="text-lg font-semibold">{title}</div>
              {phone && <div className="text-cyan-2">{phone}</div>}
              {account.quality && (
                <div className="text-xs text-muted">איכות: {account.quality}</div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              שמרו Access Token ו-Phone Number ID בהגדרות כדי לראות כאן את המספר העסקי.
            </p>
          )}
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
        </div>
        <div className="flex gap-2">
          {account.connected && (
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
