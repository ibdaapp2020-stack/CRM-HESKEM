import { BrandMark, BrandTitle } from "@/components/shared/brand";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
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
            {params.error === "server"
              ? locale === "en"
                ? "Server error: Firebase Auth or the session secret is not available."
                : locale === "ar"
                  ? "خطأ في الخادم: Firebase Auth أو سر الجلسة غير متاح."
                  : "שגיאת שרת: Firebase Auth או סוד ההתחברות לא זמינים."
              : locale === "en"
                ? "Wrong email or password"
                : locale === "ar"
                  ? "بريد أو كلمة مرور غير صحيحة"
                  : "אימייל או סיסמה שגויים"}
          </div>
        )}
        <form action="/api/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={params.next ?? ""} />
          <Field label={locale === "en" ? "Email" : locale === "ar" ? "البريد" : "אימייל"}>
            <Input name="email" type="email" required />
          </Field>
          <Field label={t("password")}>
            <Input name="password" type="password" required />
          </Field>
          <Button type="submit" className="w-full">
            {t("login")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
