import { notFound } from "next/navigation";
import { createFromTemplateAction } from "@/lib/actions/documents";
import { Button, Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { industryLabel } from "@/lib/industries";

const TYPE_LABEL: Record<string, string> = {
  QUOTE: "הצעת מחיר",
  CONTRACT: "הסכם",
  TERMS: "תקנון",
};

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; type?: string }>;
}) {
  const { leadId, type = "QUOTE" } = await searchParams;
  if (!leadId) notFound();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) notFound();

  const templates = await prisma.documentTemplate.findMany({
    where: { type },
    orderBy: [{ industry: "asc" }, { name: "asc" }],
  });
  const forIndustry = templates.filter((t) => t.industry === lead.industry);
  const others = templates.filter((t) => t.industry !== lead.industry);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">
          {TYPE_LABEL[type] ?? type} ל{lead.fullName}
        </h1>
        <p className="text-sm text-muted">
          בחר תבנית שמורה לפי ענף. הענף של הלקוח: {industryLabel(lead.industry)}
        </p>
      </div>
      <TemplateGroup title="תבניות לענף של הלקוח" templates={forIndustry} leadId={lead.id} type={type} />
      <TemplateGroup title="תבניות מענפים אחרים" templates={others} leadId={lead.id} type={type} />
    </div>
  );
}

function TemplateGroup({
  title,
  templates,
  leadId,
  type,
}: {
  title: string;
  templates: { id: string; name: string; industry: string; title: string }[];
  leadId: string;
  type: string;
}) {
  if (templates.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm text-muted">{title}</h2>
      {templates.map((tpl) => (
        <Card key={tpl.id} className="flex items-center justify-between p-4">
          <div>
            <div className="font-medium">{tpl.name}</div>
            <div className="text-sm text-muted">
              {industryLabel(tpl.industry)} · {tpl.title}
            </div>
          </div>
          <form action={createFromTemplateAction}>
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="templateId" value={tpl.id} />
            <Button type="submit">השתמש בתבנית</Button>
          </form>
        </Card>
      ))}
    </section>
  );
}
