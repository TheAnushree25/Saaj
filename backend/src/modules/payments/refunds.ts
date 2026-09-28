import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { fromDrizzle } from "pg-boss";
import { db, type Transaction } from "../../db/client.ts";
import { one } from "../../db/helpers.ts";
import { bookings, payments, refunds } from "../../db/schema/index.ts";
import { Queue, boss } from "../../jobs/boss.ts";
import { createRefund, findRefund } from "./razorpay.ts";

/**
 * Records refunds worth `amountPaise` against a booking's paid payments (newest
 * first) and queues each one for Razorpay. Runs inside the caller's transaction,
 * so a cancellation and its refund are saved together or not at all.
 */
export async function queueRefunds(tx: Transaction, bookingId: string, amountPaise: number, reason: string) {
  const alreadyRefunded = sql<number>`coalesce((
    select sum(${refunds.amountPaise}) from ${refunds}
    where ${refunds.paymentId} = "payments"."id" and ${refunds.status} <> 'failed'
  ), 0)`.mapWith(Number);

  const paid = await tx
    .select({ id: payments.id, amountPaise: payments.amountPaise, refunded: alreadyRefunded })
    .from(payments)
    .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "paid")))
    .orderBy(desc(payments.paidAt));

  let remaining = amountPaise;
  const refundIds: string[] = [];
  for (const payment of paid) {
    const take = Math.min(remaining, payment.amountPaise - payment.refunded);
    if (take <= 0) continue;
    const refund = one(
      await tx
        .insert(refunds)
        .values({ paymentId: payment.id, bookingId, amountPaise: take, reason })
        .returning({ id: refunds.id }),
    );
    refundIds.push(refund.id);
    remaining -= take;
    if (remaining === 0) break;
  }

  const queued = amountPaise - remaining;
  if (refundIds.length > 0) {
    await boss.insert(
      Queue.refund,
      refundIds.map((refundId) => ({ data: { refundId } })),
      { db: fromDrizzle(tx, sql) },
    );
    await tx
      .update(bookings)
      .set({ refundedPaise: sql`${bookings.refundedPaise} + ${queued}` })
      .where(eq(bookings.id, bookingId));
  }
  return queued;
}

/** Background worker: sends one refund to Razorpay. The queue retries it if Razorpay is down. */
export async function processRefund(refundId: string) {
  const [row] = await db
    .select({ refund: refunds, razorpayPaymentId: payments.razorpayPaymentId })
    .from(refunds)
    .innerJoin(payments, eq(payments.id, refunds.paymentId))
    .where(eq(refunds.id, refundId));
  if (!row || row.refund.status !== "pending" || row.refund.razorpayRefundId) return;
  if (!row.razorpayPaymentId) throw new Error(`Refund ${refundId}: the payment has no Razorpay id`);

  // If a previous attempt reached Razorpay but crashed before saving, reuse that refund.
  const result =
    (await findRefund(row.razorpayPaymentId, refundId)) ??
    (await createRefund(row.razorpayPaymentId, row.refund.amountPaise, { refundId }));

  await db
    .update(refunds)
    .set({ razorpayRefundId: result.id, status: result.status === "failed" ? "failed" : result.status })
    .where(eq(refunds.id, refundId));
}

/** From the refund.processed / refund.failed webhooks. */
export async function settleRefund(razorpayRefundId: string, ourRefundId: string | undefined, status: "processed" | "failed") {
  await db
    .update(refunds)
    .set({ status, razorpayRefundId })
    .where(
      and(
        ne(refunds.status, status),
        ourRefundId
          ? or(eq(refunds.razorpayRefundId, razorpayRefundId), eq(refunds.id, ourRefundId))
          : eq(refunds.razorpayRefundId, razorpayRefundId),
      ),
    );
}
