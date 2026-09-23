"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startCheckoutAction } from "@/lib/actions/payments";
import { Button } from "./ui";

export function CheckoutButton({ amount }: { amount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      action={(formData) => {
        start(async () => {
          const url = await startCheckoutAction(formData);
          router.push(url);
        });
      }}
    >
      <input type="hidden" name="amount" value={amount} />
      <Button type="submit" disabled={pending}>
        {pending ? "פותח סליקה..." : "עדכון אשראי וסגירת חשבון"}
      </Button>
    </form>
  );
}
