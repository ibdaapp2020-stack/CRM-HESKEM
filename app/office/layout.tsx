import { OfficeShell } from "@/components/office-shell";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/locale";

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();
  const { locale, t } = await getT();
  return (
    <OfficeShell
      user={user}
      locale={locale}
      labels={{
        dashboard: t("dashboard"),
        leads: t("leads"),
        inbox: t("inbox"),
        documents: t("documents"),
        templates: t("templates"),
        projects: t("projects"),
        settings: t("settings"),
      }}
    >
      {children}
    </OfficeShell>
  );
}
