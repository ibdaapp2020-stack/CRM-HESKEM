import { notFound } from "next/navigation";
import { DocumentView } from "@/components/document-view";
import { SignatureCanvas } from "@/components/signature-canvas";
import { BrandMark, BrandTitle } from "@/components/brand";
import { Button, Card, Field, Input } from "@/components/ui";
import { signDocumentAction } from "@/lib/actions/documents";
import { prisma } from "@/lib/prisma";

export default async function PublicSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const doc = await prisma.document.findUnique({
    where: { signToken: token },
    include: { lead: true, lineItems: true, signatures: true },
  });
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="no-print mb-6 flex items-center gap-3">
        <BrandMark />
        <BrandTitle />
      </div>
      <DocumentView doc={doc} />
      {doc.status !== "SIGNED" ? (
        <Card className="no-print mt-6 p-5">
          <h2 className="mb-3 font-medium">חתימה דיגיטלית מאובטחת</h2>
          <p className="mb-4 text-sm text-muted">
            החתימה נשמרת עם חותמת זמן, כתובת IP וגיבוב של תוכן המסמך.
          </p>
          <form action={signDocumentAction} className="space-y-3">
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="token" value={token} />
            <Field label="שם החותם">
              <Input name="signerName" defaultValue={doc.lead.fullName} required />
            </Field>
            <SignatureCanvas />
            <Button type="submit">חתום על המסמך</Button>
          </form>
        </Card>
      ) : (
        <p className="no-print mt-6 text-center text-emerald-200">המסמך נחתם בהצלחה.</p>
      )}
    </div>
  );
}
