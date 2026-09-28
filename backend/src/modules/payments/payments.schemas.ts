import { z } from "zod";

/** What Razorpay's checkout hands the app on success; the app forwards it here. */
export const checkoutSchema = z.object({
  razorpayOrderId: z.string().min(1).max(100),
  razorpayPaymentId: z.string().min(1).max(100),
  razorpaySignature: z.string().min(1).max(200),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Development only: a fake order to mark paid (see confirmDevPayment). */
export const devConfirmSchema = z.object({ orderId: z.string().startsWith("order_dev_").max(100) });
