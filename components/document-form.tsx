"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDocumentAction,
  updateDocumentAction,
} from "@/lib/actions/documents";
import { calcTotals, lineTotal } from "@/lib/documents/calc";
import { formatMoney } from "@/lib/utils";
import { Button, Field, Input, Textarea } from "./ui";

type Line = {
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export function DocumentForm({
  leadId,
  documentId,
  type,
  defaults,
}: {
  leadId: string;
  documentId?: string;
  type: string;
  defaults: {
    title: string;
    intro: string;
    body: string;
    footer: string;
    customNotes?: string | null;
    vatRate: number;
    lineItems: Line[];
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(defaults.title);
  const [intro, setIntro] = useState(defaults.intro);
  const [body, setBody] = useState(defaults.body);
  const [footer, setFooter] = useState(defaults.footer);
  const [customNotes, setCustomNotes] = useState(defaults.customNotes ?? "");
  const [vatRate, setVatRate] = useState(defaults.vatRate);
  const [lines, setLines] = useState<Line[]>(
    defaults.lineItems.length
      ? defaults.lineItems
      : [{ title: "", description: "", quantity: 1, unitPrice: 0, discount: 0 }],
  );

  const totals = useMemo(() => calcTotals(lines, vatRate), [lines, vatRate]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function onSubmit(formData: FormData) {
    formData.set("lineItems", JSON.stringify(lines));
    if (documentId) {
      await updateDocumentAction(formData);
      router.refresh();
    } else {
      const id = await createDocumentAction(formData);
      router.push(`/office/documents/${id}`);
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="leadId" value={leadId} />
      {documentId && <input type="hidden" name="id" value={documentId} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="intro" value={intro} />
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="footer" value={footer} />
      <input type="hidden" name="customNotes" value={customNotes} />
      <input type="hidden" name="vatRate" value={vatRate} />

      <Field label="כותרת המסמך">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="פתיח">
        <Textarea rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} />
      </Field>
      <Field label="גוף המסמך (סעיפים קבועים — ניתן להתאים ללקוח)">
        <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Field label="הערות ללקוח זה">
        <Textarea
          rows={3}
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
        />
      </Field>

      {(type === "QUOTE" || type === "CONTRACT") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">שורות שירות</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { title: "", description: "", quantity: 1, unitPrice: 0, discount: 0 },
                ])
              }
            >
              הוסף שורה
            </Button>
          </div>
          {lines.map((line, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-line p-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <Input
                  placeholder="שירות"
                  value={line.title}
                  onChange={(e) => updateLine(index, { title: e.target.value })}
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  placeholder="תיאור"
                  value={line.description}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  type="number"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(index, { quantity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  type="number"
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateLine(index, { unitPrice: Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-between gap-2">
                <span className="text-sm text-muted">
                  {formatMoney(lineTotal(line))}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Field label="מע״מ %">
              <Input
                type="number"
                className="w-24"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
              />
            </Field>
            <div className="text-left text-sm">
              <div>ביניים: {formatMoney(totals.subtotal)}</div>
              <div>מע״מ: {formatMoney(totals.vatAmount)}</div>
              <div className="text-lg font-bold text-cyan-2">
                לתשלום: {formatMoney(totals.total)}
              </div>
            </div>
          </div>
        </div>
      )}

      <Field label="כותרת תחתונה">
        <Input value={footer} onChange={(e) => setFooter(e.target.value)} />
      </Field>
      <Button type="submit">{documentId ? "שמור שינויים" : "צור מסמך"}</Button>
    </form>
  );
}
