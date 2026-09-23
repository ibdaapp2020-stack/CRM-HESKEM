"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markConversationReadAction,
  receiveInboxMessageAction,
  sendMessageAction,
} from "@/lib/actions/messages";
import { formatDateTime } from "@/lib/utils";
import { Button, Input, Textarea } from "./ui";

type Template = { key: string; title: string; body: string };
type Message = {
  id: string;
  direction: string;
  body: string;
  createdAt: Date | string;
};
type ConversationRow = {
  id: string;
  unread: number;
  lastAt: Date | string;
  lead: { id: string; fullName: string; phone: string; stage: string };
  messages: Message[];
};

export function InboxApp({
  conversations,
  templates,
  initialId,
}: {
  conversations: ConversationRow[];
  templates: Template[];
  initialId?: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(
    initialId || conversations[0]?.id || "",
  );
  const [pending, start] = useTransition();
  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  return (
    <div className="grid min-h-[70vh] overflow-hidden rounded-2xl border border-line bg-navy-2 md:grid-cols-[320px_1fr]">
      <aside className="border-l border-line">
        <div className="border-b border-line px-4 py-3 text-sm text-muted">
          תיבת וואטסאפ פנימית
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedId(c.id);
                start(() => markConversationReadAction(c.id));
              }}
              className={`flex w-full flex-col items-start gap-1 border-b border-line/60 px-4 py-3 text-right hover:bg-navy-3 ${
                selectedId === c.id ? "bg-navy-3" : ""
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">{c.lead.fullName}</span>
                {c.unread > 0 && (
                  <span className="rounded-full bg-cyan px-2 text-xs text-navy">
                    {c.unread}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">{c.lead.phone}</span>
              <span className="line-clamp-1 text-xs text-muted">
                {c.messages.at(-1)?.body}
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className="flex min-h-[70vh] flex-col">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <div className="font-medium">{selected.lead.fullName}</div>
                <div className="text-xs text-muted">{selected.lead.phone}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/office/leads/${selected.lead.id}`)}
              >
                כרטיס ליד
              </Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {selected.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.direction === "outbound"
                      ? "mr-auto bg-cyan/15 text-ink"
                      : "ml-auto bg-navy-3"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className="mt-1 text-[10px] text-muted">
                    {formatDateTime(m.createdAt)}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-line p-3">
              <form
                action={sendMessageAction}
                className="space-y-2"
                onSubmit={() => start(() => router.refresh())}
              >
                <input type="hidden" name="conversationId" value={selected.id} />
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.key}
                      type="submit"
                      name="templateKey"
                      value={t.key}
                      className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-cyan/50 hover:text-cyan-2"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
                <Textarea name="body" rows={3} placeholder="כתוב הודעה..." />
                <div className="flex justify-between gap-2">
                  <Button type="submit" disabled={pending}>
                    שלח
                  </Button>
                </div>
              </form>
              <form
                action={receiveInboxMessageAction}
                className="flex gap-2"
                onSubmit={() => start(() => router.refresh())}
              >
                <input type="hidden" name="conversationId" value={selected.id} />
                <Input name="body" placeholder="סימולציה: הודעה נכנסת מהלקוח" />
                <Button type="submit" variant="outline">
                  קבל
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted">
            אין שיחות
          </div>
        )}
      </section>
    </div>
  );
}
