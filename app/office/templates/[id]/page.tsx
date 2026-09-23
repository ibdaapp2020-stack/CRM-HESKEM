import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateWorkspace } from "@/components/template-workspace";
import { Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { industryLabel } from "@/lib/industries";
import type { TemplateLine } from "@/lib/industries";

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tpl = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!tpl) notFound();

  let lineItems: TemplateLine[] = [];
  try {
    lineItems = JSON.parse(tpl.lineItemsJson) as TemplateLine[];
  } catch {
    lineItems = [];
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{tpl.name}</h1>
          <p className="text-sm text-muted">
            {industryLabel(tpl.industry)} · צפו במסמך, עדכנו, ואז שלחו
          </p>
        </div>
        <Link href="/office/templates">
          <Button variant="ghost">חזרה לתבניות</Button>
        </Link>
      </div>
      <TemplateWorkspace
        template={{
          id: tpl.id,
          type: tpl.type,
          name: tpl.name,
          title: tpl.title,
          intro: tpl.intro,
          body: tpl.body,
          footer: tpl.footer,
          lineItems: lineItems.map((l) => ({
            title: l.title,
            description: l.description ?? "",
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
          })),
        }}
      />
    </div>
  );
}
