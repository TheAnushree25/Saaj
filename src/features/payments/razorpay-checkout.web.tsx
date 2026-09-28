import { useEffect, useRef } from "react";
import type { PaymentOrder } from "@/lib/api-types";
import { checkoutOptions, type RazorpayProof } from "./razorpay-options";

type Props = { order: PaymentOrder; onDone: (proof: RazorpayProof | null) => void };

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

/** Loads Razorpay's checkout script once per page. */
function loadRazorpay(): Promise<RazorpayConstructor> {
  const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.onload = () => {
      const loaded = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
      if (loaded) resolve(loaded);
      else reject(new Error("Razorpay did not load"));
    };
    script.onerror = () => reject(new Error("Razorpay did not load"));
    document.body.appendChild(script);
  });
}

/** In a browser (the web build), Razorpay's own script opens its checkout over the page. */
export function RazorpayCheckout({ order, onDone }: Props) {
  // The latest onDone, without re-opening checkout each time the parent re-renders.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let finished = false;
    const finish = (proof: RazorpayProof | null) => {
      if (finished) return;
      finished = true;
      done.current(proof);
    };

    loadRazorpay()
      .then((Razorpay) => {
        new Razorpay({
          ...checkoutOptions(order),
          handler: (response: RazorpayResponse) =>
            finish({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          modal: { ondismiss: () => finish(null), confirm_close: true },
        }).open();
      })
      .catch(() => finish(null));
  }, [order]);

  return null;
}
