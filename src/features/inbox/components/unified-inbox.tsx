"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import {
  addInternalNoteAction,
  convertConversationToLeadAction,
  linkConversationLeadAction,
  markConversationReadAction,
  passThreadAction,
  retryMessageAction,
  sendMessageAction,
  updateConversationDeskAction,
} from "@/features/inbox/actions";
import { canSendFreeForm } from "@/features/inbox/meta/window";
import { CampaignBadge } from "@/components/shared/campaign-badge";
import { Button, Input, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

type Row = Record<string, unknown> & { id?: string };
type Pane = "list" | "chat" | "profile";
type Filter = "all" | "whatsapp" | "instagram" | "unread" | "open" | "closed";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "unread", label: "לא נקראו" },
  { id: "open", label: "פתוחות" },
  { id: "closed", label: "סגורות" },
];

const STATUS_LABEL: Record<string, string> = {
  new: "חדש",
  in_progress: "בטיפול",
  waiting: "ממתין ללקוח",
  closed: "סגור",
};

const DELIVERY_LABEL: Record<string, string> = {
  pending: "ממתין",
  sent: "נשלח",
  delivered: "נמסר",
  read: "נקרא",
  failed: "נכשל",
};

function channelOf(value: unknown) {
  const channel = String(value ?? "inbox");
  return channel === "cloud_api" ? "whatsapp" : channel;
}

function tagsOf(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function UnifiedInbox({
  conversations,
  templates,
  notes,
  documents,
  projects,
  staff,
  assignments,
  initialId,
}: {
  conversations: Row[];
  templates: Row[];
  notes: Row[];
  documents: Row[];
  projects: Row[];
  staff: Row[];
  assignments: Row[];
  initialId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pane, setPane] = useState<Pane>(initialId ? "chat" : "list");
  const [selectedId, setSelectedId] = useState(initialId || String(conversations[0]?.id || ""));

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const channel = channelOf(conversation.channel);
      const status = String(conversation.status ?? "new");
      if (filter === "whatsapp" && channel !== "whatsapp") return false;
      if (filter === "instagram" && channel !== "instagram") return false;
      if (filter === "unread" && Number(conversation.unread ?? 0) < 1) return false;
      if (filter === "open" && status === "closed") return false;
      if (filter === "closed" && status !== "closed") return false;
      if (!needle) return true;
      const lead = (conversation.lead ?? {}) as Row;
      return [lead.fullName, lead.phone, conversation.phone, conversation.instagramUsername, conversation.externalUserId]
        .some((value) => String(value ?? "").toLowerCase().includes(needle));
    });
  }, [conversations, filter, query]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? visible[0];
  const lead = (selected?.lead ?? null) as Row | null;
  const messages = Array.isArray(selected?.messages) ? (selected.messages as Row[]) : [];
  const selectedNotes = notes.filter((note) => note.conversationId === selected?.id);
  const selectedDocs = documents.filter((document) => document.leadId && document.leadId === lead?.id);
  const project = projects.find((item) => item.leadId && item.leadId === lead?.id);
  const history = assignments.filter((item) => item.conversationId === selected?.id);
  const siblingChannels = conversations.filter(
    (conversation) => lead?.id && (conversation.lead as Row | null)?.id === lead.id && conversation.id !== selected?.id,
  );
  const channel = channelOf(selected?.channel);
  const windowOpen = channel === "inbox" || canSendFreeForm(selected?.customerWindowExpiresAt as string | null);

  function openConversation(id: string) {
    setSelectedId(id);
    setPane("chat");
    start(() => markConversationReadAction(id));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-navy-2">
      <div className="flex gap-2 border-b border-line p-2 lg:hidden">
        {(["list", "chat", "profile"] as Pane[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPane(item)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm ${pane === item ? "bg-cyan text-navy" : "bg-navy-3 text-muted"}`}
          >
            {item === "list" ? "שיחות" : item === "chat" ? "שיחה" : "לקוח"}
          </button>
        ))}
      </div>
      <div className="grid min-h-[75vh] lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <aside className={`${pane === "list" ? "flex" : "hidden"} min-h-0 flex-col border-l border-line lg:flex`}>
          <div className="space-y-2 border-b border-line p-3">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש שם, טלפון או משתמש" />
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full px-2.5 py-1 text-xs ${filter === item.id ? "bg-cyan text-navy" : "bg-navy-3 text-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {visible.length === 0 && <p className="p-4 text-sm text-muted">אין שיחות להצגה</p>}
            {visible.map((conversation) => {
              const person = (conversation.lead ?? {}) as Row;
              const itemChannel = channelOf(conversation.channel);
              return (
                <button
                  key={String(conversation.id)}
                  type="button"
                  onClick={() => openConversation(String(conversation.id))}
                  className={`flex w-full flex-col gap-1 border-b border-line/60 px-3 py-3 text-right hover:bg-navy-3 ${
                    selected?.id === conversation.id ? "bg-navy-3" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      <MessageCircle className={`h-4 w-4 ${itemChannel === "instagram" ? "text-pink-300" : "text-emerald-300"}`} />
                      <span className="text-[10px] text-muted">{itemChannel === "instagram" ? "IG" : "WA"}</span>
                      {String(person.fullName || conversation.instagramUsername || conversation.phone || "לקוח")}
                    </span>
                    {Number(conversation.unread ?? 0) > 0 && (
                      <span className="rounded-full bg-cyan px-2 text-xs text-navy">{String(conversation.unread)}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {itemChannel === "instagram"
                      ? `@${String(conversation.instagramUsername || conversation.externalUserId || "")}`
                      : String(person.phone || conversation.phone || "")}
                  </span>
                  <span className="line-clamp-1 text-xs text-muted">{String(conversation.lastMessagePreview || "")}</span>
                  <span className="text-[10px] text-muted">{formatDateTime(conversation.lastAt as string)}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`${pane === "chat" ? "flex" : "hidden"} min-h-[70vh] flex-col lg:flex`}>
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <div className="font-medium">{String(lead?.fullName || selected.instagramUsername || selected.phone || "שיחה")}</div>
                  <div className="text-xs text-muted">
                    {channel === "instagram" ? "Instagram" : channel === "whatsapp" ? "WhatsApp" : "תיבה פנימית"} · {STATUS_LABEL[String(selected.status ?? "new")] || "חדש"}
                  </div>
                </div>
                <span className={`text-xs ${windowOpen ? "text-emerald-300" : "text-amber-200"}`}>
                  {windowOpen ? "חלון מענה פתוח" : "חלון המענה סגור"}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_40%)] p-4">
                {messages.length === 0 && <p className="text-center text-sm text-muted">אין הודעות בשיחה</p>}
                {messages.map((message) => {
                  const outbound = message.direction === "outbound";
                  const mediaUrl = String(message.mediaUrl || "");
                  const mediaId = String(message.mediaId || "");
                  return (
                    <div key={String(message.id)} className={`flex ${outbound ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${outbound ? "bg-cyan/15" : "bg-navy-3"}`}>
                        <div className="whitespace-pre-wrap">{String(message.body || "")}</div>
                        {mediaUrl.startsWith("http") && String(message.messageType).includes("image") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl} alt="" className="mt-2 max-h-48 rounded-xl" />
                        ) : mediaId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/inbox/media?mediaId=${encodeURIComponent(mediaId)}`} alt="" className="mt-2 max-h-48 rounded-xl" />
                        ) : mediaUrl.startsWith("http") ? (
                          <a className="mt-2 block text-xs text-cyan-2 underline" href={mediaUrl} target="_blank" rel="noreferrer">
                            קובץ מצורף
                          </a>
                        ) : null}
                        <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-muted">
                          <span>{formatDateTime(message.createdAt as string)}</span>
                          {outbound && <span>{DELIVERY_LABEL[String(message.status ?? "sent")] || ""}</span>}
                        </div>
                        {message.status === "failed" && (
                          <form action={retryMessageAction} className="mt-2">
                            <input type="hidden" name="messageId" value={String(message.id)} />
                            <input type="hidden" name="conversationId" value={String(selected.id)} />
                            <Button type="submit" variant="outline">
                              נסו שוב
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                action={sendMessageAction}
                className="space-y-2 border-t border-line p-3"
                onSubmit={(event) => {
                  const input = event.currentTarget.elements.namedItem("clientRequestId");
                  if (input instanceof HTMLInputElement) input.value = crypto.randomUUID();
                  start(() => router.refresh());
                }}
              >
                <input type="hidden" name="conversationId" value={String(selected.id)} />
                <input type="hidden" name="clientRequestId" defaultValue="" />
                <div className="flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <button
                      key={String(template.key || template.id)}
                      type="submit"
                      name="templateKey"
                      value={String(template.key || template.id)}
                      className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-cyan/50 hover:text-cyan-2"
                    >
                      {String(template.title || template.key)}
                    </button>
                  ))}
                </div>
                {!windowOpen && channel === "whatsapp" && (
                  <Input name="metaTemplate" placeholder="שם תבנית מאושרת ב-Meta" />
                )}
                <Textarea name="body" rows={3} placeholder={windowOpen ? "כתבו הודעה ללקוח" : "מחוץ לחלון המענה"} />
                <Button type="submit" disabled={pending}>
                  שליחה
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">בחרו שיחה</div>
          )}
        </section>

        <aside className={`${pane === "profile" ? "block" : "hidden"} border-r border-line p-4 lg:block`}>
          {selected ? (
            <div className="space-y-4 text-sm">
              <div>
                <h2 className="text-base font-semibold">{String(lead?.fullName || "ללא לקוח מקושר")}</h2>
                <p className="text-muted">{String(lead?.phone || selected.phone || "אין טלפון")}</p>
                <p className="text-muted">
                  Instagram: {selected.instagramUsername ? `@${String(selected.instagramUsername)}` : "לא מקושר"}
                </p>
                <p className="mt-2 text-muted">סטטוס ליד: {String(lead?.stage || "—")}</p>
                <p className="text-muted">אחראי: {String(selected.assigneeName || "לא שויך")}</p>
                <p className="text-muted">פרויקט: {project ? String(project.name) : "אין"}</p>
                <CampaignBadge source={lead?.source as string | undefined} headline={lead?.campaignHeadline as string | undefined} />
              </div>
              {lead?.id ? (
                <Link href={`/office/leads/${String(lead.id)}`}>
                  <Button variant="outline" className="w-full">
                    כרטיס הלקוח
                  </Button>
                </Link>
              ) : (
                <form action={convertConversationToLeadAction}>
                  <input type="hidden" name="conversationId" value={String(selected.id)} />
                  <Button type="submit" className="w-full">
                    המרה לליד
                  </Button>
                </form>
              )}
              {siblingChannels.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted">ערוצים נוספים של אותו לקוח</div>
                  {siblingChannels.map((conversation) => (
                    <button
                      key={String(conversation.id)}
                      type="button"
                      className="block text-cyan-2"
                      onClick={() => openConversation(String(conversation.id))}
                    >
                      {channelOf(conversation.channel) === "instagram" ? "Instagram" : "WhatsApp"}
                    </button>
                  ))}
                </div>
              )}
              <form action={updateConversationDeskAction} className="space-y-2">
                <input type="hidden" name="conversationId" value={String(selected.id)} />
                <select name="status" defaultValue={String(selected.status ?? "new")} className="w-full rounded-xl border border-line bg-navy px-3 py-2">
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select name="priority" defaultValue={String(selected.priority ?? "normal")} className="w-full rounded-xl border border-line bg-navy px-3 py-2">
                  <option value="low">עדיפות נמוכה</option>
                  <option value="normal">עדיפות רגילה</option>
                  <option value="high">עדיפות גבוהה</option>
                </select>
                <select name="assigneeId" defaultValue={String(selected.assigneeId ?? "")} className="w-full rounded-xl border border-line bg-navy px-3 py-2">
                  <option value="">ללא אחראי</option>
                  {staff.map((person) => (
                    <option key={String(person.id)} value={String(person.id)}>{String(person.name)}</option>
                  ))}
                </select>
                <Input name="tags" defaultValue={tagsOf(selected.tags).join(", ")} placeholder="תגיות, מופרדות בפסיק" />
                <Button type="submit" variant="outline" className="w-full">שמירת טיפול</Button>
              </form>
              <form action={linkConversationLeadAction} className="flex gap-2">
                <input type="hidden" name="conversationId" value={String(selected.id)} />
                <Input name="query" placeholder="קישור ידני לפי שם או טלפון" />
                <Button type="submit" variant="outline">קשר</Button>
              </form>
              {channel === "instagram" && (
                <form action={passThreadAction} className="flex gap-2">
                  <input type="hidden" name="conversationId" value={String(selected.id)} />
                  <Input name="targetAppId" placeholder="העברת שליטה — App ID" />
                  <Button type="submit" variant="outline">העבר</Button>
                </form>
              )}
              <div>
                <div className="mb-2 text-xs text-muted">מסמכים</div>
                {selectedDocs.length === 0 && <p className="text-xs text-muted">אין מסמכים</p>}
                {selectedDocs.slice(0, 5).map((document) => (
                  <Link key={String(document.id)} href={`/office/documents/${String(document.id)}`} className="block text-cyan-2">
                    {String(document.title || document.type || "מסמך")}
                  </Link>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted">הערות פנימיות</div>
                {selectedNotes.map((note) => (
                  <div key={String(note.id)} className="rounded-xl bg-navy-3 px-3 py-2">
                    <div>{String(note.body)}</div>
                    <div className="text-[10px] text-muted">{String(note.authorName || "")} · {formatDateTime(note.createdAt as string)}</div>
                  </div>
                ))}
                <form action={addInternalNoteAction} className="space-y-2">
                  <input type="hidden" name="conversationId" value={String(selected.id)} />
                  <Textarea name="body" rows={2} placeholder="הערה פנימית, לא נשלחת ללקוח" />
                  <Button type="submit" variant="ghost">שמירת הערה</Button>
                </form>
              </div>
              {history.length > 0 && (
                <div className="text-xs text-muted">
                  {history.slice(0, 4).map((item) => (
                    <div key={String(item.id)}>הועבר אל {String(item.toName || "ללא אחראי")} · {formatDateTime(item.createdAt as string)}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">אין פרטי לקוח</p>
          )}
        </aside>
      </div>
    </div>
  );
}
