import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { verifyPaymentWebhook } from "../lib/payments/verify-webhook";
import { verifyMetaSignature } from "../lib/whatsapp/verify-signature";

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

test("WhatsApp webhook is rejected when the app secret is missing", () => {
  assert.equal(verifyMetaSignature("{}", "sha256=abc", ""), false);
  assert.equal(verifyMetaSignature("{}", null, ""), false);
});

test("WhatsApp webhook accepts only a matching signature", () => {
  const body = '{"entry":[]}';
  const secret = "app-secret";
  assert.equal(verifyMetaSignature(body, `sha256=${sign(body, secret)}`, secret), true);
  assert.equal(verifyMetaSignature(body, `sha256=${sign(body, "other")}`, secret), false);
  assert.equal(verifyMetaSignature(body, "not-a-signature", secret), false);
});

test("payment webhook is rejected without a configured secret", () => {
  const body = '{"providerRef":"sbx_1","status":"COMPLETED"}';
  assert.equal(verifyPaymentWebhook(body, sign(body, "secret"), undefined), false);
  assert.equal(verifyPaymentWebhook(body, sign(body, "secret"), ""), false);
});

test("payment webhook accepts only a matching signature", () => {
  const body = '{"providerRef":"sbx_1","status":"COMPLETED"}';
  const secret = "payment-secret";
  assert.equal(verifyPaymentWebhook(body, sign(body, secret), secret), true);
  assert.equal(verifyPaymentWebhook(body, `sha256=${sign(body, secret)}`, secret), true);
  assert.equal(verifyPaymentWebhook(body, sign("other", secret), secret), false);
  assert.equal(verifyPaymentWebhook(body, null, secret), false);
});

test("the default JWT secret is not present in the middleware", () => {
  const source = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
  assert.equal(source.includes("ibda-crm-dev-secret"), false);
  assert.equal(source.includes("AUTH_SECRET"), true);
});
