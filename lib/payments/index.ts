import { sandboxProvider } from "./sandbox";
import type { PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider {
  // Swap this file only when Cardcom / Tranzila / Meshulam is chosen.
  return sandboxProvider;
}

export type { PaymentProvider } from "./types";
