import Link from "next/link";
import {
  FolderKanban,
  LayoutDashboard,
  MessageCircle,
  FileSignature,
  Users,
  Library,
  Settings,
} from "lucide-react";
import { BrandMark, BrandTitle } from "./brand";
import { LogoutButton } from "./logout-button";
import { LanguageSwitcher } from "./language-switcher";
import type { SessionUser } from "@/lib/session";
import type { Locale } from "@/lib/i18n";

export function OfficeShell({
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
    { href: "/office", label: labels.dashboard, icon: LayoutDashboard },
    { href: "/office/leads", label: labels.leads, icon: Users },
    { href: "/office/inbox", label: labels.inbox, icon: MessageCircle },
    { href: "/office/documents", label: labels.documents, icon: FileSignature },
    { href: "/office/templates", label: labels.templates, icon: Library },
    { href: "/office/projects", label: labels.projects, icon: FolderKanban },
    { href: "/office/settings", label: labels.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-line/70 bg-navy/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandMark size={42} />
            <BrandTitle />
          </div>
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-navy-3 hover:text-ink"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm text-muted">
            <LanguageSwitcher locale={locale} />
            <span>{user.name}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-line/50 px-3 py-2 lg:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-navy-3 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
