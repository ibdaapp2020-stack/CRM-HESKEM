import { createHmac, timingSafeEqual } from "crypto";

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
) {
  if (!appSecret) return true;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
