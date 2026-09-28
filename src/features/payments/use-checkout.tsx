import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import type { BookingDetail, PaymentOrder } from "@/lib/api-types";
import { keys } from "@/lib/queries";
import { RazorpayCheckout } from "./razorpay-checkout";
import type { RazorpayProof } from "./razorpay-options";
import { TestPaymentSheet } from "./test-payment-sheet";

type Proof = { kind: "test" } | { kind: "razorpay"; values: RazorpayProof };
type Pending = { order: PaymentOrder; finish: (proof: Proof | null) => void };

/** Orders a server makes without Razorpay keys (local testing) start with this. */
const isTestOrder = (order: PaymentOrder) => order.orderId.startsWith("order_dev_");

/**
 * Paying for a booking, start to finish:
 *   1. the server opens an order for what is owed (the amount is never sent from the phone);
 *   2. the bride pays in Razorpay's checkout (or the test sheet, locally);
 *   3. the server checks Razorpay's signature and confirms the booking.
 *
 * `pay` resolves with the updated booking, or null if she closed checkout
 * without paying. Render `sheet` somewhere on the screen.
 */
export function useCheckout() {
  const client = useQueryClient();
  const [pending, setPending] = useState<Pending | null>(null);

  const pay = useCallback(
    async (bookingId: string, kind: "advance" | "balance"): Promise<BookingDetail | null> => {
      const order = await api<PaymentOrder>(`/v1/bookings/${bookingId}/payments`, { body: { kind } });
      const proof = await new Promise<Proof | null>((finish) => setPending({ order, finish }));
      setPending(null);
      if (!proof) return null;

      const booking =
        proof.kind === "test"
          ? await api<BookingDetail>("/v1/payments/dev-confirm", { body: { orderId: order.orderId } })
          : await api<BookingDetail>("/v1/payments/verify", { body: proof.values });

      // Every screen showing this booking or a booking list is now out of date.
      client.setQueryData(keys.booking(booking.id), booking);
      void client.invalidateQueries({ queryKey: ["me", "bookings"] });
      return booking;
    },
    [client],
  );

  const sheet = !pending ? null : isTestOrder(pending.order) ? (
    <TestPaymentSheet
      key={pending.order.orderId}
      order={pending.order}
      onDone={(paid) => pending.finish(paid ? { kind: "test" } : null)}
    />
  ) : (
    <RazorpayCheckout
      key={pending.order.orderId}
      order={pending.order}
      onDone={(values) => pending.finish(values ? { kind: "razorpay", values } : null)}
    />
  );

  return { pay, sheet };
}
