import Link from "next/link";
import { BrandMark, BrandTitle } from "./brand";
import { LogoutButton } from "./logout-button";
import { LanguageSwitcher } from "./language-switcher";
import type { SessionUser } from "@/lib/session";
import type { Locale } from "@/lib/i18n";

export function PortalShell({
  user,
  locale,
  labels,
  children,
}: {
  user: SessionUser;
  locale: Locale;
  labels: Record<string, string>;
  children: React.ReactNode;
}) {
  const links = [
    { href: "/portal", label: labels.portalHome },
    { href: "/portal/questions", label: labels.portalQuestions },
    { href: "/portal/project", label: labels.portalProject },
    { href: "/portal/payment", label: labels.portalPayment },
  ];

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-line/70 bg-navy/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandMark size={42} />
            <BrandTitle compact />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <LanguageSwitcher locale={locale} />
            <span>
              {labels.hello}, {user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-xl px-3 py-1.5 text-sm text-muted hover:bg-navy-3 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
