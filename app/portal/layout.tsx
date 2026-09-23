import { PortalShell } from "@/components/portal-shell";
import { requireClient } from "@/lib/auth";
import { getT } from "@/lib/locale";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireClient();
  const { locale, t } = await getT();
  return (
    <PortalShell
      user={user}
      locale={locale}
      labels={{
        portalHome: t("portalHome"),
        portalQuestions: t("portalQuestions"),
        portalProject: t("portalProject"),
        portalPayment: t("portalPayment"),
        hello: t("hello"),
      }}
    >
      {children}
    </PortalShell>
  );
}
