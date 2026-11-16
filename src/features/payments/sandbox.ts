import { nanoid } from "nanoid";
import type { PaymentProvider } from "./types";

export const sandboxProvider: PaymentProvider = {
  id: "sandbox",
  async createCheckout(input) {
    const providerRef = `sbx_${nanoid(10)}`;
    const url = new URL("/portal/payment/sandbox", input.returnUrl);
    url.searchParams.set("ref", providerRef);
    url.searchParams.set("amount", String(input.amount));
    url.searchParams.set("lead", input.leadId);
    return { checkoutUrl: `${url.pathname}${url.search}`, providerRef };
  },
  saveToken() {
    return {
      token: `tok_${nanoid(12)}`,
      last4: "4242",
      brand: "Visa",
      expMonth: 12,
      expYear: new Date().getFullYear() + 3,
    };
  },
  async charge() {
    return { ok: true, providerRef: `chg_${nanoid(10)}` };
  },
  parseWebhook(payload: unknown) {
    const data = payload as { providerRef?: string; status?: string };
    if (!data.providerRef) return null;
    return {
      providerRef: data.providerRef,
      status: data.status === "FAILED" ? "FAILED" : "COMPLETED",
    };
  },
};
