import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyGraphFailure, parseMetaWebhook, webhookEventId } from "../src/features/inbox/meta/parse";
import { canSendFreeForm, customerWindowExpiry } from "../src/features/inbox/meta/window";

test("whatsapp text, image, status, and echo stay distinct", () => {
  const events = parseMetaWebhook({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: "972501234567", profile: { name: "דנה" } }],
              messages: [
                { id: "wamid.1", from: "972501234567", type: "text", text: { body: "שלום" } },
                { id: "wamid.2", from: "972501234567", type: "image", image: { id: "media-1", mime_type: "image/jpeg", caption: "צילום" } },
                { id: "wamid.3", from: "972501234567", type: "audio", audio: { id: "media-2" } },
              ],
              message_echoes: [{ id: "wamid.4", to: "972501234567", type: "text", text: { body: "נשלח מהנייד" } }],
              statuses: [{ id: "wamid.4", status: "delivered", timestamp: "10", recipient_id: "972501234567" }],
            },
          },
        ],
      },
    ],
  });

  assert.equal(events.length, 5);
  assert.equal(events[0].profileName, "דנה");
  assert.equal(events[1].mediaId, "media-1");
  assert.equal(events[2].body, "הודעה קולית");
  assert.equal(events[3].direction, "outbound");
  assert.equal(events[4].kind, "status");
  assert.equal(events[4].status, "delivered");
  assert.equal(webhookEventId("whatsapp", ["wamid.1", "message"]), events[0].eventId);
});

test("instagram messages are not matched to a phone number", () => {
  const events = parseMetaWebhook({
    object: "instagram",
    entry: [
      {
        id: "1789",
        messaging: [
          {
            sender: { id: "ig-user" },
            recipient: { id: "1789" },
            timestamp: 1_700_000_000_000,
            message: {
              mid: "mid.1",
              text: "היי",
              reply_to: { story: { url: "https://cdn.example/story.jpg", id: "story-1" } },
            },
          },
          {
            sender: { id: "1789" },
            recipient: { id: "ig-user" },
            timestamp: 1_700_000_000_100,
            message: { mid: "mid.2", text: "תשובה מהעסק", is_echo: true },
          },
          {
            sender: { id: "ig-user" },
            recipient: { id: "1789" },
            timestamp: 1_700_000_000_200,
            pass_thread_control: { new_owner_app_id: "999" },
          },
        ],
      },
    ],
  });

  const inbound = events.find((event) => event.externalId === "mid.1");
  const echo = events.find((event) => event.externalId === "mid.2");
  const routing = events.find((event) => event.kind === "routing");
  assert.equal(inbound?.channel, "instagram");
  assert.equal(inbound?.externalUserId, "ig-user");
  assert.equal(inbound?.messageType, "story_reply");
  assert.equal(inbound?.externalUserId?.includes("972"), false);
  assert.equal(echo?.direction, "outbound");
  assert.equal(echo?.externalUserId, "ig-user");
  assert.equal(routing?.routingState, "passed");
});

test("the customer care window lasts 24 hours", () => {
  const inbound = new Date("2026-11-16T10:00:00.000Z");
  const expiry = customerWindowExpiry(inbound);
  assert.equal(canSendFreeForm(expiry, new Date("2026-11-17T09:59:00.000Z")), true);
  assert.equal(canSendFreeForm(expiry, new Date("2026-11-17T10:01:00.000Z")), false);
  assert.equal(canSendFreeForm(null), false);
});

test("graph permission failures are not reported as a successful connection", () => {
  assert.equal(classifyGraphFailure("(#200) missing permission"), "missing_permissions");
  assert.equal(classifyGraphFailure("Token expired"), "error");
});

test("inbox rules keep notes and webhook events away from clients", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const notes = rules.indexOf("match /internalNotes/{noteId}");
  const events = rules.indexOf("match /webhookEvents/{eventId}");
  assert.equal(notes > 0, true);
  assert.equal(rules.slice(notes, notes + 120).includes("if isStaff()"), true);
  assert.equal(events > 0, true);
  assert.equal(rules.slice(events, events + 180).includes("allow write: if false"), true);
  assert.equal(rules.includes("allow read, write: if true"), false);
});
