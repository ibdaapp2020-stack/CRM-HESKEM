"use client";

import { setLocaleAction } from "@/lib/actions/locale";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  return (
    <form action={setLocaleAction}>
      <select
        name="locale"
        defaultValue={locale}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-line bg-navy px-2 py-1 text-xs text-ink"
        aria-label="language"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_META[code].label}
          </option>
        ))}
      </select>
    </form>
  );
}
