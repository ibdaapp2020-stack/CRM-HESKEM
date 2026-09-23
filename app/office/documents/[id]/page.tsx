import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentForm } from "@/components/document-form";
import { DocumentView } from "@/components/document-view";
import { Button, Card } from "@/components/ui";
import { sendDocumentAction, saveDocumentAsTemplateAction, resendDocumentAction } from "@/lib/actions/documents";
import { INDUSTRIES, industryLabel } from "@/lib/industries";
import { prisma } from "@/lib/prisma";

export default async function OfficeDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { lead: true, lineItems: { orderBy: { sortOrder: "asc" } }, signatures: true },
  });
  if (!doc) notFound();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const signUrl = `${appUrl}/sign/${doc.signToken}`;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <Link href={`/office/leads/${doc.leadId}`} className="text-sm text-cyan-2">
            {doc.lead.fullName}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {doc.status !== "SIGNED" && (
            <form action={sendDocumentAction}>
              <input type="hidden" name="id" value={doc.id} />
              <Button type="submit">שלח לחתימה</Button>
            </form>
          )}
          {doc.status !== "DRAFT" && (
            <form action={resendDocumentAction}>
              <input type="hidden" name="id" value={doc.id} />
              <Button type="submit" variant="outline">
                שלח שוב לחתימה
              </Button>
            </form>
          )}
          <a href={signUrl} target="_blank" rel="noreferrer">
            <Button variant="outline">קישור חתימה</Button>
          </a>
        </div>
      </div>
      <DocumentView doc={doc} />
      {doc.status !== "SIGNED" && (
        <Card className="no-print p-6">
          <h2 className="mb-4 font-medium">עריכה לפי לקוח</h2>
          <DocumentForm
            leadId={doc.leadId}
            documentId={doc.id}
            type={doc.type}
            defaults={{
              title: doc.title,
              intro: doc.intro,
              body: doc.body,
              footer: doc.footer,
              customNotes: doc.customNotes,
              vatRate: doc.vatRate,
              lineItems: doc.lineItems.map((l) => ({
                title: l.title,
                description: l.description ?? "",
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                discount: l.discount,
              })),
            }}
          />
        </Card>
      )}
      <Card className="no-print p-6">
        <h2 className="mb-3 font-medium">שמור כתבנית לפי ענף</h2>
        <p className="mb-3 text-sm text-muted">
          אחרי שהתאמת מחירים וסעיפים ללקוח, אפשר לשמור כתבנית לענף דומה.
        </p>
        <form action={saveDocumentAsTemplateAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={doc.id} />
          <div>
            <label className="mb-1 block text-xs text-muted">שם התבנית</label>
            <input
              name="name"
              defaultValue={`${doc.title} — ${industryLabel(doc.lead.industry)}`}
              className="rounded-xl border border-line bg-navy px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">ענף</label>
            <select
              name="industry"
              defaultValue={doc.lead.industry}
              className="rounded-xl border border-line bg-navy px-3 py-2 text-sm"
            >
              {INDUSTRIES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="outline">
            שמור תבנית
          </Button>
        </form>
      </Card>
    </div>
  );
}
