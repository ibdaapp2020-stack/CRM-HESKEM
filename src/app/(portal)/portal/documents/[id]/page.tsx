import { notFound } from "next/navigation";
import { DocumentView } from "@/features/documents/components/document-view";
import { SignatureCanvas } from "@/features/documents/components/signature-canvas";
import { Button, Card, Field, Input } from "@/components/ui";
import { signDocumentAction } from "@/features/documents/actions";
import { requireClient } from "@/lib/auth";
import { getLeadIdForClient, getPortalDocument } from "@/services/database";

export default async function PortalDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClient();
  const { id } = await params;
  const lead = await getLeadIdForClient(user.id);
  const doc = await getPortalDocument(id);
  if (!lead || !doc || doc.leadId !== lead.id) notFound();

  return (
    <div className="space-y-5">
      <DocumentView doc={doc} />
      {doc.status !== "SIGNED" && (
        <Card className="no-print p-5">
          <h2 className="mb-3 font-medium">חתימה דיגיטלית</h2>
          <form action={signDocumentAction} className="space-y-3">
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="token" value={doc.signToken} />
            <Field label="שם מלא כפי שיופיע על המסמך">
              <Input name="signerName" defaultValue={lead.fullName} required />
            </Field>
            <SignatureCanvas />
            <Button type="submit">חתום ואשר</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
