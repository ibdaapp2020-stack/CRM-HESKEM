import { loginAction } from "@/lib/actions/auth";
import { BrandMark, BrandTitle } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button, Card, Field, Input } from "@/components/ui";
import { getT } from "@/lib/locale";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const { locale, t } = await getT();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark size={56} />
            <BrandTitle />
          </div>
          <LanguageSwitcher locale={locale} />
        </div>
        <p className="mb-6 text-sm text-muted">
          {locale === "en"
            ? "Sign in to the office or client portal."
            : locale === "ar"
              ? "دخول للمكتب أو بوابة العميل."
              : "כניסה למשרד או לפורטל הלקוח לפי סוג המשתמש."}
        </p>
        {params.error && (
          <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {locale === "en"
              ? "Wrong email or password"
              : locale === "ar"
                ? "بريد أو كلمة مرور غير صحيحة"
                : "אימייל או סיסמה שגויים"}
          </div>
        )}
        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="next" value={params.next ?? ""} />
          <Field label={locale === "en" ? "Email" : locale === "ar" ? "البريد" : "אימייל"}>
            <Input name="email" type="email" required placeholder="admin@ibda.co.il" />
          </Field>
          <Field label={t("password")}>
            <Input name="password" type="password" required />
          </Field>
          <Button type="submit" className="w-full">
            {t("login")}
          </Button>
        </form>
        <div className="mt-6 space-y-1 text-xs text-muted">
          <div>משרד: admin@ibda.co.il / Ibda2026!</div>
          <div>לקוח: client@demo.co.il / Client2026!</div>
        </div>
      </Card>
    </div>
  );
}
