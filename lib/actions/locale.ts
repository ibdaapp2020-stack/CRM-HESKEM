"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isLocale } from "../i18n";
import { localeCookieName } from "../locale";

export async function setLocaleAction(formData: FormData) {
  const locale = String(formData.get("locale") || "he");
  if (!isLocale(locale)) return;
  const jar = await cookies();
  jar.set(localeCookieName(), locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
