import { Button, Card, Field, Input } from "@/components/ui";
import { saveWhatsAppSettingsAction, currentWhatsAppSettings } from "@/lib/actions/office";
import { getT } from "@/lib/locale";

export default async function SettingsPage() {
  const { t } = await getT();
  const cfg = await currentWhatsAppSettings();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://heskem--crm-heskem.europe-west4.hosted.app";
  const webhook = `${appUrl.replace(/\/$/, "")}/api/whatsapp/webhook`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
        <p className="text-sm text-muted">{t("whatsappSettings")}</p>
      </div>

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
            והוסיפו מוצר WhatsApp ל-WABA שלכם.
          </li>
          <li>
            צרו System User עם הרשאות whatsapp_business_messaging ו-whatsapp_business_management,
            והפיקו Permanent Access Token.
          </li>
          <li>העתיקו Phone Number ID (לא את מספר הטלפון עצמו).</li>
          <li>
            ב-Webhook הדביקו: <span className="break-all text-cyan-2">{webhook}</span>
          </li>
          <li>
            Verify Token: <span className="text-cyan-2">{cfg.verifyToken || "ibda-wa-verify"}</span>
            {" "}— Subscribe לאירוע messages.
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
