import { Button, Card, Field, Input } from "@/components/ui";
import { saveWhatsAppSettingsAction, currentWhatsAppSettings } from "@/lib/actions/office";
import { getT } from "@/lib/locale";

export default async function SettingsPage() {
  const { t } = await getT();
  const cfg = await currentWhatsAppSettings();
  const webhook = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/whatsapp/webhook`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
        <p className="text-sm text-muted">{t("whatsappSettings")}</p>
      </div>
      <Card className="p-6">
        <p className="mb-4 text-sm text-muted">
          חברו Meta WhatsApp Cloud API. אחרי שמירה, התיבה שולחת ומקבלת הודעות אמיתיות.
          Webhook: <span className="text-cyan-2">{webhook}</span>
        </p>
        <form action={saveWhatsAppSettingsAction} className="space-y-3">
          <Field label="ספק">
            <select
              name="provider"
              defaultValue={cfg.provider}
              className="w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm"
            >
              <option value="inbox">תיבה פנימית בלבד</option>
              <option value="cloud">WhatsApp Cloud API (אמיתי)</option>
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
          <Button type="submit">{t("save")}</Button>
        </form>
      </Card>
    </div>
  );
}
