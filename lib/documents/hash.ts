import { createHash } from "crypto";

export function documentHash(parts: {
  title: string;
  intro: string;
  body: string;
  footer: string;
  customNotes?: string | null;
  subtotal: number;
  vatAmount: number;
  total: number;
  lineItems: { title: string; quantity: number; unitPrice: number; discount: number }[];
}) {
  const payload = JSON.stringify({
    title: parts.title,
    intro: parts.intro,
    body: parts.body,
    footer: parts.footer,
    customNotes: parts.customNotes ?? "",
    subtotal: parts.subtotal,
    vatAmount: parts.vatAmount,
    total: parts.total,
    lineItems: parts.lineItems,
  });
  return createHash("sha256").update(payload).digest("hex");
}
