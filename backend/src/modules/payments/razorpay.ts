import { env } from "../../config/env.ts";
import { hmacSha256, randomToken, safeEqual } from "../../lib/crypto.ts";
import { AppError } from "../../lib/errors.ts";
import { logger } from "../../lib/logger.ts";

const API = "https://api.razorpay.com/v1";

/**
 * With both keys we talk to Razorpay. Without them (development only: env.ts
 * refuses to start production without keys) orders are faked, so the rest of
 * the booking flow can be built and tried before Razorpay's KYC is done.
 */
export const razorpayLive = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

async function razorpay<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const credentials = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Basic ${credentials}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    logger.error({ path, status: response.status, detail: await response.text() }, "Razorpay call failed");
    throw new AppError(502, "PAYMENT_PROVIDER_ERROR", "The payment service had a problem. Please try again.");
  }
  return (await response.json()) as T;
}

export async function createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
  if (!razorpayLive) return { id: `order_dev_${randomToken(9)}` };
  return razorpay<{ id: string }>("POST", "/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes,
  });
}

type RazorpayRefund = { id: string; status: "pending" | "processed" | "failed"; notes?: Record<string, string> | [] };

export async function createRefund(paymentId: string, amountPaise: number, notes: Record<string, string>) {
  if (!razorpayLive) return { id: `rfnd_dev_${randomToken(9)}`, status: "processed" } as RazorpayRefund;
  return razorpay<RazorpayRefund>("POST", `/payments/${paymentId}/refund`, {
    amount: amountPaise,
    speed: "normal",
    notes,
  });
}

/** Finds a refund we already asked for (by our id in its notes), so a retry never refunds twice. */
export async function findRefund(paymentId: string, refundId: string) {
  if (!razorpayLive) return undefined;
  const list = await razorpay<{ items: RazorpayRefund[] }>("GET", `/payments/${paymentId}/refunds`);
  return list.items.find((refund) => !Array.isArray(refund.notes) && refund.notes?.refundId === refundId);
}

/** Razorpay signs the checkout result with our key secret: HMAC-SHA256 of "order_id|payment_id". */
export function isValidCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  return safeEqual(hmacSha256(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);
}

/** Webhooks are signed with the webhook secret: HMAC-SHA256 of the raw body, exactly as sent. */
export function isValidWebhookSignature(rawBody: string, signature: string) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  return safeEqual(hmacSha256(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);
}
