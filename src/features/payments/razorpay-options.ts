import type { PaymentOrder } from "@/lib/api-types";
import { colors } from "@/theme";

/** What Razorpay hands back after a successful payment. The server checks the signature. */
export type RazorpayProof = { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string };

/** Razorpay checkout options, built from the order the server made. */
export function checkoutOptions(order: PaymentOrder) {
  return {
    key: order.keyId,
    order_id: order.orderId,
    amount: order.amountPaise,
    currency: order.currency,
    name: order.name,
    description: order.description,
    prefill: order.prefill,
    theme: { color: colors.primary },
  };
}
