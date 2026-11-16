import { createHmac, timingSafeEqual } from "crypto";

/** Header the caller must send: hex HMAC-SHA256 of the raw body. */
export const PAYMENT_SIGNATURE_HEADER = "x-payment-signature";

/**
 * Verifies a payment webhook before any payment row is updated.
 * Returns false when the secret is missing or the signature does not match.
 * A real acquirer (Cardcom, Tranzila, Meshulam) must send this signature
 * with the shared PAYMENT_WEBHOOK_SECRET. Unsigned requests are rejected.
 */
export function verifyPaymentWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
) {
  if (!secret || !signatureHeader) return false;
  const received = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
