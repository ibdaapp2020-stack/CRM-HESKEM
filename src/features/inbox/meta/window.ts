const DAY_MS = 24 * 60 * 60 * 1000;

export function customerWindowExpiry(inboundAt: Date) {
  return new Date(inboundAt.getTime() + DAY_MS);
}

export function canSendFreeForm(expiresAt: Date | string | null | undefined, now = new Date()) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > now.getTime();
}
