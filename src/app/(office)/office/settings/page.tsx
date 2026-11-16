import { WhatsAppAccountCard } from "@/features/inbox/components/whatsapp-account-card";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import {
  saveWhatsAppSettingsAction,
  currentWhatsAppSettings,
  saveInstagramSettingsAction,
  currentInstagramSettings,
  probeInstagramAction,
} from "@/features/clients/office-actions";
import { getStoredWhatsAppAccount } from "@/features/inbox/whatsapp/account";
import { getT } from "@/lib/locale";
import { getWhatsAppLastError } from "@/services/database";

export default async function SettingsPage() {
  const { t } = await getT();
  const [cfg, account, errorRow, instagram] = await Promise.all([
    currentWhatsAppSettings(),
    getStoredWhatsAppAccount(),
    getWhatsAppLastError(),
    currentInstagramSettings(),
  ]);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://heskem--crm-heskem.europe-west4.hosted.app";
  const webhook = `${appUrl.replace(/\/$/, "")}/api/whatsapp/webhook`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
        <p className="text-sm text-muted">ערוצי תקשורת — WhatsApp Business ו-Instagram</p>
      </div>
      <Card className="space-y-3 p-6 text-sm">
        <h2 className="font-medium">Instagram</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              instagram.connectionState === "connected"
                ? "green"
                : instagram.connectionState === "missing_permissions"
                  ? "amber"
                  : instagram.connectionState === "error"
                    ? "rose"
                    : "slate"
            }
          >
            {instagram.connectionState === "connected"
              ? "מחובר"
              : instagram.connectionState === "missing_permissions"
                ? "חסרות הרשאות"
                : instagram.connectionState === "error"
                  ? "שגיאת חיבור"
                  : "מנותק"}
          </Badge>
          {instagram.username && <span>@{instagram.username}</span>}
          {instagram.accountId && <span className="text-muted">{instagram.accountId}</span>}
        </div>
        {instagram.credentialsSaved && instagram.connectionState !== "connected" && (
          <p className="text-muted">הטוקן שמור בשרת. הסטטוס מתעדכן רק אחרי בדיקה מול Meta.</p>
        )}
        {instagram.error && <p className="text-rose-200">{instagram.error}</p>}
        <p className="text-muted">
          Webhook: <span className="break-all text-cyan-2">{webhook.replace("/api/whatsapp/webhook", "/api/meta/webhook")}</span>
        </p>
        <p className="text-muted">
          מסלול Instagram Login דורש instagram_business_basic ו-instagram_business_manage_messages. מסלול Facebook Login דורש
          instagram_manage_messages, pages_messaging, pages_manage_metadata ו-pages_show_list. Advanced Access ו-App Review
          נדרשים לחשבונות שמחוץ למשתמשי הבדיקה של האפליקציה.
        </p>
        <form action={probeInstagramAction}>
          <Button type="submit" variant="outline">בדיקת Instagram</Button>
        </form>
        <form action={saveInstagramSettingsAction} className="space-y-3">
          <Field label="מסלול חיבור">
            <select name="loginMode" defaultValue={instagram.loginMode} className="w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm">
              <option value="instagram">Instagram Login</option>
              <option value="facebook">Facebook Login</option>
            </select>
          </Field>
          <Field label="Access Token">
            <Input name="token" type="password" placeholder={instagram.credentialsSaved ? "שמור בשרת" : ""} />
          </Field>
          <Field label="Instagram Account ID">
            <Input name="accountId" defaultValue={instagram.accountId} />
          </Field>
          <Field label="App Secret">
            <Input name="appSecret" type="password" placeholder="אפשר להשתמש בסוד של אפליקציית Meta" />
          </Field>
          <Field label="Verify Token">
            <Input name="verifyToken" defaultValue={instagram.verifyToken} />
          </Field>
          <Field label="ליד חדש מהודעה לא מזוהה">
            <select name="autoLead" defaultValue={instagram.autoLead} className="w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm">
              <option value="yes">לפתוח ליד</option>
              <option value="no">לשמור שיחה בלי ליד</option>
            </select>
          </Field>
          <Button type="submit">שמירת Instagram</Button>
        </form>
      </Card>
      <WhatsAppAccountCard account={account} error={errorRow?.value} />

      <Card className="space-y-3 p-6 text-sm">
        <h2 className="font-medium">{t("whatsappMetaSteps")}</h2>
        <ol className="list-decimal space-y-2 ps-5 text-muted">
          <li>
            פתחו{" "}
            <a
              className="text-cyan-2 underline"
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noreferrer"
            >
              Meta for Developers
            </a>{" "}
            ← האפליקציה שלכם ← WhatsApp ← API Setup.
          </li>
          <li>
            העתיקו משם את Access Token (כפתור Generate access token), Phone number ID ו-WhatsApp
            Business Account ID — לא את מספר הטלפון עצמו. לשימוש קבוע הפיקו Token של System User
            עם whatsapp_business_messaging ו-whatsapp_business_management.
          </li>
          <li>
            הדביקו בטופס שלמטה ושמרו. המערכת מושכת את שם העסק והמספר, ורושמת את ה-Webhook ב-Meta
            באופן אוטומטי.
          </li>
          <li>
            אם בכרטיס החשבון מופיעה שגיאת Webhook, הגדירו ידנית ב-Meta: Callback URL{" "}
            <span className="break-all text-cyan-2">{webhook}</span>, Verify Token{" "}
            <span className="text-cyan-2">{cfg.verifyToken ? "מוגדר בשרת" : "חסר"}</span>, והירשמו
            לאירוע messages.
          </li>
          <li>{t("whatsappCoexistence")}</li>
        </ol>
      </Card>

      <Card className="p-6">
        <form action={saveWhatsAppSettingsAction} className="space-y-3">
          <Field label={t("provider")}>
            <select
              name="provider"
              defaultValue={cfg.provider}
              className="w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm"
            >
              <option value="inbox">{t("inboxOnly")}</option>
              <option value="cloud">{t("cloudApi")}</option>
            </select>
          </Field>
          <Field label="Access Token">
            <Input name="token" type="password" defaultValue={cfg.token} />
          </Field>
          <Field label="Phone Number ID">
            <Input name="phoneNumberId" defaultValue={cfg.phoneNumberId} />
          </Field>
          <Field label="WhatsApp Business Account ID (WABA)">
            <Input name="wabaId" defaultValue={account.wabaId} />
          </Field>
          <Field label="Verify Token">
            <Input name="verifyToken" defaultValue={cfg.verifyToken} />
          </Field>
          <Field label="App Secret">
            <Input name="appSecret" type="password" defaultValue={cfg.appSecret} />
          </Field>
          <Button type="submit">{t("save")}</Button>
        </form>
      </Card>
    </div>
  );
}
