import { COMPANY } from "@/lib/company";
import { formatDate, formatMoney } from "@/lib/utils";
import { BrandMark } from "./brand";

type Doc = {
  title: string;
  intro: string;
  body: string;
  footer: string;
  customNotes?: string | null;
  type: string;
  status: string;
  validUntil?: Date | string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  lineItems: {
    id?: string;
    title: string;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
  }[];
  signatures: {
    signerName: string;
    signedAt: Date | string;
    imageData: string;
    contentHash: string;
  }[];
  lead: {
    fullName: string;
    company?: string | null;
    email?: string | null;
    phone: string;
  };
};

export function DocumentView({ doc }: { doc: Doc & { locale?: string | null } }) {
  const dir = doc.locale === "en" ? "ltr" : "rtl";
  return (
    <article dir={dir} className="print-sheet mx-auto max-w-3xl rounded-2xl border border-line bg-navy-2 p-8 text-ink">
      <header className="mb-8 flex items-start justify-between gap-4 border-b border-line pb-6">
        <div className="flex items-center gap-3">
          <BrandMark size={64} />
          <div>
            <div className="text-2xl font-bold">{COMPANY.name}</div>
            <div className="text-sm text-cyan-2">{COMPANY.nameAr}</div>
            <div className="text-xs text-muted">{COMPANY.legalName}</div>
          </div>
        </div>
        <div className="text-left text-sm text-muted">
          <div className="text-lg font-semibold text-ink">{doc.title}</div>
          {doc.validUntil && <div>תוקף: {formatDate(doc.validUntil)}</div>}
          {doc.status === "SIGNED" && (
            <div className="mt-1 font-bold text-emerald-300">נחתם דיגיטלית</div>
          )}
        </div>
      </header>

      <section className="mb-6 grid gap-4 text-sm md:grid-cols-2">
        <div>
          <div className="text-xs text-muted">לכבוד</div>
          <div className="font-medium">{doc.lead.fullName}</div>
          {doc.lead.company && <div>{doc.lead.company}</div>}
          <div>{doc.lead.phone}</div>
          {doc.lead.email && <div>{doc.lead.email}</div>}
        </div>
        <div className="text-left">
          <div>{COMPANY.email}</div>
          <div>{COMPANY.phone}</div>
          <div>ח.פ {COMPANY.vatId}</div>
        </div>
      </section>

      <p className="mb-4 whitespace-pre-wrap text-sm leading-7">{doc.intro}</p>
      <p className="mb-6 whitespace-pre-wrap text-sm leading-7 text-ink/90">
        {doc.body}
      </p>
      {doc.customNotes && (
        <p className="mb-6 rounded-xl bg-navy p-3 text-sm">{doc.customNotes}</p>
      )}

      {doc.lineItems.length > 0 && (
        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 text-right font-normal">שירות</th>
              <th className="py-2 text-right font-normal">כמות</th>
              <th className="py-2 text-right font-normal">מחיר</th>
              <th className="py-2 text-left font-normal">סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {doc.lineItems.map((item, i) => (
              <tr key={item.id ?? i} className="border-b border-line/60">
                <td className="py-2">
                  <div>{item.title}</div>
                  {item.description && (
                    <div className="text-xs text-muted">{item.description}</div>
                  )}
                </td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{formatMoney(item.unitPrice)}</td>
                <td className="py-2 text-left">
                  {formatMoney(item.quantity * item.unitPrice - item.discount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {doc.total > 0 && (
        <div className="mb-8 text-left text-sm">
          <div>ביניים: {formatMoney(doc.subtotal)}</div>
          <div>
            מע״מ {doc.vatRate}%: {formatMoney(doc.vatAmount)}
          </div>
          <div className="text-xl font-bold text-cyan-2">
            סה״כ: {formatMoney(doc.total)}
          </div>
        </div>
      )}

      <footer className="border-t border-line pt-6">
        {doc.signatures.map((s) => (
          <div key={s.contentHash} className="mb-4">
            <div className="text-xs text-muted">חתימת {s.signerName}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.imageData}
              alt={`חתימה של ${s.signerName}`}
              width={240}
              height={90}
              className="my-2 rounded-lg border border-line bg-navy"
            />
            <div className="text-[11px] text-muted">
              נחתם ב-{formatDate(s.signedAt)} · hash {s.contentHash.slice(0, 16)}…
            </div>
          </div>
        ))}
        <div className="text-xs text-muted">{doc.footer}</div>
      </footer>
    </article>
  );
}
