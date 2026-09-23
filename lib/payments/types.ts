export type CheckoutInput = {
  leadId: string;
  amount: number;
  currency?: string;
  purpose?: string;
  customerName: string;
  customerEmail?: string | null;
  returnUrl: string;
};

export type CheckoutResult = {
  checkoutUrl: string;
  providerRef: string;
};

export type TokenizedCard = {
  token: string;
  last4: string;
  brand: string;
  expMonth?: number;
  expYear?: number;
};

export type ChargeInput = {
  token: string;
  amount: number;
  currency?: string;
  purpose?: string;
};

export interface PaymentProvider {
  id: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  saveToken(raw: unknown): TokenizedCard;
  charge(input: ChargeInput): Promise<{ ok: boolean; providerRef: string }>;
  parseWebhook?(payload: unknown): {
    providerRef: string;
    status: "COMPLETED" | "FAILED";
  } | null;
}
