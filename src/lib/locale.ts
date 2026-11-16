import { cookies } from "next/headers";
import { isLocale, t as translate, type Locale } from "./i18n";

const COOKIE = "ibda_lang";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  return isLocale(value) ? value : "he";
}

export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: string) => translate(locale, key),
  };
}

export function localeCookieName() {
  return COOKIE;
}
