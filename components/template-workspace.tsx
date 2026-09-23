"use client";

import { useMemo, useState } from "react";
import { DocumentView } from "./document-view";
import { Button, Card, Field, Input, Textarea } from "./ui";
import {
  sendTemplateDirectAction,
  updateTemplateAction,
} from "@/lib/actions/documents";
import { calcTotals, lineTotal } from "@/lib/documents/calc";
import { formatMoney } from "@/lib/utils";
import { LOCALES, LOCALE_META } from "@/lib/i18n";

type Line = {
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export function TemplateWorkspace({
  template,
}: {
  template: {
    id: string;
    type: string;
    name: string;
    title: string;
    intro: string;
    body: string;
    footer: string;
    lineItems: Line[];
  };
}) {
  const [name, setName] = useState(template.name);
  const [title, setTitle] = useState(template.title);
  const [intro, setIntro] = useState(template.intro);
  const [body, setBody] = useState(template.body);
  const [footer, setFooter] = useState(template.footer);
  const [customNotes, setCustomNotes] = useState("");
  const [vatRate, setVatRate] = useState(17);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState("he");
  const [lines, setLines] = useState<Line[]>(
    template.lineItems.length
      ? template.lineItems
      : [{ title: "", description: "", quantity: 1, unitPrice: 0, discount: 0 }],
  );

  const totals = useMemo(() => calcTotals(lines, vatRate), [lines, vatRate]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  const previewLead = {
    fullName: fullName || "שם הלקוח",
    phone: phone || "050-0000000",
    email: null,
    company: null,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-3">
        <h2 className="text-sm text-muted">תצוגה מקדימה — כך ייראה המסמך לפני שליחה</h2>
        <DocumentView
          doc={{
            title,
            intro,
            body,
            footer,
            customNotes,
            type: template.type,
            status: "DRAFT",
            locale,
            vatRate: totals.vatRate,
            subtotal: totals.subtotal,
            vatAmount: totals.vatAmount,
            total: totals.total,
            lineItems: lines,
            signatures: [],
            lead: previewLead,
          }}
        />
      </div>

      <div className="space-y-5">
        <Card className="p-4">
          <h2 className="mb-3 font-medium">עריכת המסמך</h2>
          <form action={updateTemplateAction} className="space-y-3">
            <input type="hidden" name="id" value={template.id} />
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="intro" value={intro} />
            <input type="hidden" name="body" value={body} />
            <input type="hidden" name="footer" value={footer} />
            <input type="hidden" name="lineItems" value={JSON.stringify(lines)} />
            <Field label="שם התבנית במאגר">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="כותרת המסמך">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="פתיח">
              <Textarea rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} />
            </Field>
            <Field label="גוף המסמך">
              <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Field label="הערות ללקוח זה (רק לשליחה הנוכחית)">
              <Textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
              />
            </Field>
            {(template.type === "QUOTE" || template.type === "CONTRACT") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm">שורות שירות</h3>
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
                  <div key={index} className="grid gap-2 rounded-xl border border-line p-2 md:grid-cols-12">
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
                        onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between">
                      <span className="text-xs text-muted">{formatMoney(lineTotal(line))}</span>
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
                <div className="flex items-end justify-between">
                  <Field label="מע״מ %">
                    <Input
                      type="number"
                      className="w-24"
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                    />
                  </Field>
                  <div className="text-sm text-cyan-2">לתשלום: {formatMoney(totals.total)}</div>
                </div>
              </div>
            )}
            <Field label="כותרת תחתונה">
              <Input value={footer} onChange={(e) => setFooter(e.target.value)} />
            </Field>
            <Button type="submit" variant="outline">
              שמור שינויים בתבנית
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-medium">שליחה אחרי בדיקה</h2>
          <form action={sendTemplateDirectAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="templateId" value={template.id} />
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="intro" value={intro} />
            <input type="hidden" name="body" value={body} />
            <input type="hidden" name="footer" value={footer} />
            <input type="hidden" name="customNotes" value={customNotes} />
            <input type="hidden" name="vatRate" value={vatRate} />
            <input type="hidden" name="lineItems" value={JSON.stringify(lines)} />
            <Field label="שם הנמען">
              <Input name="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="טלפון / וואטסאפ">
              <Input name="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="שפת המסמך">
              <select
                name="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm"
              >
                {LOCALES.map((code) => (
                  <option key={code} value={code}>
                    {LOCALE_META[code].label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <Button type="submit">שלח לחתימה</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
