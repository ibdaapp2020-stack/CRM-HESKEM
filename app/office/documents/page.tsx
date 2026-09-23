import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { resendDocumentAction } from "@/lib/actions/documents";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  QUOTE: "הצעת מחיר",
  CONTRACT: "הסכם",
  TERMS: "תקנון",
};

export default async function DocumentsPage() {
  const docs = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
    include: { lead: true, signatures: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">מסמכים לחתימה</h1>
          <p className="text-sm text-muted">
            תבנית קבועה של IBDA, עם התאמה לכל לקוח.
          </p>
        </div>
        <Link href="/office/leads">
          <Button>צור מכרטיס ליד</Button>
        </Link>
      </div>
      <div className="space-y-2">
        {docs.map((doc) => (
          <Card key={doc.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <Link href={`/office/documents/${doc.id}`} className="min-w-[200px] flex-1">
              <div className="font-medium">{doc.title}</div>
              <div className="text-sm text-muted">
                {doc.lead.fullName} · {TYPE_LABEL[doc.type] ?? doc.type} ·{" "}
                {formatDate(doc.createdAt)}
              </div>
            </Link>
            <div className="flex items-center gap-3">
              {doc.total > 0 && (
                <span className="text-sm text-cyan-2">{formatMoney(doc.total)}</span>
              )}
              <Badge tone={doc.status === "SIGNED" ? "green" : "amber"}>
                {doc.status === "SIGNED" ? "נחתם" : doc.status}
              </Badge>
              {doc.status !== "DRAFT" && (
                <form action={resendDocumentAction}>
                  <input type="hidden" name="id" value={doc.id} />
                  <Button type="submit" variant="outline">
                    שלח שוב
                  </Button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
