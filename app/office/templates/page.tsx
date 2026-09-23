import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { resendDocumentAction } from "@/lib/actions/documents";
import { prisma } from "@/lib/prisma";
import { INDUSTRIES, industryLabel } from "@/lib/industries";
import { getT } from "@/lib/locale";
import { formatDateTime } from "@/lib/utils";

const TYPE_LABEL: Record<string, { he: string; ar: string; en: string }> = {
  QUOTE: { he: "הצעת מחיר", ar: "عرض سعر", en: "Quote" },
  CONTRACT: { he: "הסכם", ar: "اتفاقية", en: "Agreement" },
  TERMS: { he: "תקנון", ar: "شروط", en: "Terms" },
};

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  const { locale, t } = await getT();
  const [templates, sentDocs] = await Promise.all([
    prisma.documentTemplate.findMany({
      orderBy: [{ industry: "asc" }, { type: "asc" }, { name: "asc" }],
    }),
    prisma.document.findMany({
      where: { status: { in: ["SENT", "SIGNED", "VIEWED"] } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: { lead: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("templates")}</h1>
        <p className="text-sm text-muted">
          לחצו על תבנית כדי לראות את המסמך, לערוך, ורק אז לשלוח.
        </p>
        {sent && (
          <p className="mt-2 text-sm text-emerald-200">
            נשלח לחתימה. אפשר לפתוח מהמאגר ולשלוח שוב.
          </p>
        )}
      </div>

      {INDUSTRIES.map((industry) => {
        const group = templates.filter((tpl) => tpl.industry === industry.id);
        if (group.length === 0) return null;
        return (
          <section key={industry.id} className="space-y-2">
            <h2 className="text-lg font-medium">
              {industry.label}
              <span className="ms-2 text-sm font-normal text-muted">{industry.hint}</span>
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {group.map((tpl) => {
                let lines = 0;
                try {
                  lines = (JSON.parse(tpl.lineItemsJson) as unknown[]).length;
                } catch {
                  lines = 0;
                }
                const typeName = TYPE_LABEL[tpl.type]?.[locale] ?? tpl.type;
                return (
                  <Link key={tpl.id} href={`/office/templates/${tpl.id}`}>
                    <Card className="h-full p-4 hover:border-cyan/50">
                      <div className="text-xs text-cyan-2">{typeName}</div>
                      <div className="font-medium">{tpl.name}</div>
                      <p className="mt-2 line-clamp-3 text-sm text-muted">{tpl.intro}</p>
                      <div className="mt-3 text-xs text-muted">
                        {industryLabel(tpl.industry)}
                        {lines > 0 ? ` · ${lines} שורות` : ""}
                      </div>
                      <div className="mt-4 text-sm text-cyan-2">צפה וערוך ←</div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("sentDocs")}</h2>
        {sentDocs.map((doc) => (
          <Card key={doc.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="font-medium">{doc.title}</div>
              <div className="text-sm text-muted">
                {doc.lead.fullName} · {doc.lead.phone} · {doc.status} · {formatDateTime(doc.updatedAt)}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/office/documents/${doc.id}`}>
                <Button variant="outline" type="button">
                  צפה במסמך
                </Button>
              </Link>
              <form action={resendDocumentAction}>
                <input type="hidden" name="id" value={doc.id} />
                <input type="hidden" name="stay" value="templates" />
                <Button type="submit">{t("resend")}</Button>
              </form>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
