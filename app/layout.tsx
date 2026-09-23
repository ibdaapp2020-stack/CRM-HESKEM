import type { Metadata } from "next";
import { Cairo, Heebo } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/locale";
import { LOCALE_META } from "@/lib/i18n";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "IBDA CRM",
  description: "ניהול לידים, וואטסאפ, הצעות מחיר ופורטל לקוח",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dir = LOCALE_META[locale].dir;
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${heebo.variable} ${cairo.variable} h-full`}
    >
      <body className={`min-h-full font-sans antialiased ${locale === "ar" ? "font-[var(--font-cairo)]" : ""}`}>
        {children}
      </body>
    </html>
  );
}
