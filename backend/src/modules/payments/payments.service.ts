import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { env, isLiveProduction } from "../../config/env.ts";
import { db, type Transaction } from "../../db/client.ts";
import { one } from "../../db/helpers.ts";
import { artists, bookingEvents, bookings, payments } from "../../db/schema/index.ts";
import { randomToken } from "../../lib/crypto.ts";
import { PgCode, isPgError } from "../../lib/db-errors.ts";
import { AppError, badRequest, conflict, notFound } from "../../lib/errors.ts";
import { logger } from "../../lib/logger.ts";
import { formatRupees } from "../../lib/money.ts";
import { istLabel } from "../../lib/time.ts";
import { notify } from "../notifications/notify.ts";
import type { CheckoutInput } from "./payments.schemas.ts";
import { createOrder, isValidCheckoutSignature, razorpayLive } from "./razorpay.ts";
import { queueRefunds, settleRefund } from "./refunds.ts";

/**
 * Opens a Razorpay order for what the bride owes: the advance while the slot
 * is held, the balance once confirmed. The amount is always read here, from
 * the booking, never taken from the app.
 */
export async function startPayment(customerId: string, bookingId: string, kind: "advance" | "balance") {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, customerId)));
  if (!booking) throw notFound("Booking");

  let amountPaise: number;
  if (kind === "advance") {
    if (booking.status !== "pending_payment") {
      throw conflict("NOT_PAYABLE", "This booking does not need an advance payment.");
    }
    if (!booking.holdExpiresAt || booking.holdExpiresAt < new Date()) {
      throw conflict("HOLD_EXPIRED", `We held this time for ${env.HOLD_MINUTES} minutes and it has been released. Please choose it again.`);
    }
    amountPaise = booking.advancePaise;
  } else {
    if (!["confirmed", "in_progress", "completed"].includes(booking.status)) {
      throw conflict("NOT_PAYABLE", "The balance can be paid once the booking is confirmed.");
    }
    amountPaise = booking.totalPaise - booking.paidPaise;
    if (amountPaise <= 0) throw conflict("NOTHING_DUE", "This booking is fully paid.");
  }

  // Reuse an open order for the same amount, so tapping Pay twice never makes two orders.
  const [open] = await db
    .select({ orderId: payments.razorpayOrderId })
    .from(payments)
    .where(
      and(
        eq(payments.bookingId, booking.id),
        eq(payments.kind, kind),
        eq(payments.status, "created"),
        eq(payments.amountPaise, amountPaise),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  let orderId = open?.orderId;
  if (!orderId) {
    const order = await createOrder({
      amountPaise,
      receipt: `${booking.ref}-${kind}`,
      notes: { bookingId: booking.id, kind },
    });
    await db.insert(payments).values({ bookingId: booking.id, kind, amountPaise, razorpayOrderId: order.id });
    orderId = order.id;
  }

  // Everything the app passes to Razorpay's checkout sheet.
  return {
    keyId: env.RAZORPAY_KEY_ID ?? "rzp_test_development",
    orderId,
    amountPaise,
    currency: "INR",
    name: "Saaj",
    description: `${booking.title} · ${booking.ref}`,
    prefill: { name: booking.contactName, contact: booking.contactPhone },
  };
}

/** Tries to move a booking to confirmed. False if its slot was taken meanwhile. */
async function tryConfirm(tx: Transaction, bookingId: string) {
  try {
    // A nested transaction is a SAVEPOINT: if the no-overlap rule refuses this
    // update, only the savepoint rolls back and the payment we just saved stays.
    await tx.transaction(async (savepoint) => {
      await savepoint
        .update(bookings)
        .set({ status: "confirmed", confirmedAt: new Date(), holdExpiresAt: null })
        .where(eq(bookings.id, bookingId));
    });
    return true;
  } catch (error) {
    if (isPgError(error, PgCode.exclusionViolation)) return false;
    throw error;
  }
}

/**
 * The one place a payment becomes "paid". Both the app (after checkout) and
 * Razorpay's webhook call it; whichever arrives second changes nothing.
 */
export async function markPaymentPaid(input: { orderId: string; paymentId: string; method?: string | undefined }) {
  await db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, input.orderId))
      .for("update");
    if (!payment) {
      logger.warn({ orderId: input.orderId }, "Payment for an order we did not create");
      return;
    }
    if (payment.status === "paid") return;

    await tx
      .update(payments)
      .set({
        status: "paid",
        razorpayPaymentId: input.paymentId,
        method: input.method ?? null,
        paidAt: new Date(),
        failureReason: null,
      })
      .where(eq(payments.id, payment.id));
    const booking = one(
      await tx
        .update(bookings)
        .set({ paidPaise: sql`${bookings.paidPaise} + ${payment.amountPaise}` })
        .where(eq(bookings.id, payment.bookingId))
        .returning(),
    );
    await tx.insert(bookingEvents).values({
      bookingId: booking.id,
      type: "payment_received",
      note: `${formatRupees(payment.amountPaise)} ${payment.kind}`,
    });
    const when = istLabel(booking.startsAt);
    const data = { bookingId: booking.id };

    if (payment.kind === "balance") {
      await notify(tx, [booking.customerId], {
        title: "Payment received",
        body: `${formatRupees(payment.amountPaise)} received for ${booking.title}. Thank you!`,
        data,
      });
      return;
    }

    if ((booking.status === "pending_payment" || booking.status === "expired") && (await tryConfirm(tx, booking.id))) {
      await tx.insert(bookingEvents).values({ bookingId: booking.id, type: "confirmed" });
      const [artist] = await tx.select({ userId: artists.userId }).from(artists).where(eq(artists.id, booking.artistId));
      await notify(tx, [booking.customerId], {
        title: "Your moment is booked",
        body: `${booking.title} on ${when} is confirmed.`,
        data,
      });
      if (artist) {
        await notify(tx, [artist.userId], {
          title: "New booking",
          body: `${booking.title} on ${when} · ${booking.venue}`,
          data,
        });
      }
      return;
    }

    // Paid, but the slot is gone (her hold lapsed and someone else booked it) or
    // the booking was already cancelled: give this payment back in full.
    if (booking.status === "pending_payment" || booking.status === "expired") {
      await tx
        .update(bookings)
        .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "Slot was taken before payment arrived" })
        .where(eq(bookings.id, booking.id));
    }
    const refunded = await queueRefunds(tx, booking.id, payment.amountPaise, "Payment arrived for an unavailable slot");
    await notify(tx, [booking.customerId], {
      title: "Payment refunded",
      body: `That time was no longer free, so we are refunding ${formatRupees(refunded)}. Please pick another slot.`,
      data,
    });
  });
}

export async function markPaymentFailed(orderId: string, reason: string | null | undefined) {
  await db
    .update(payments)
    .set({ status: "failed", failureReason: reason ?? "Payment failed" })
    .where(and(eq(payments.razorpayOrderId, orderId), eq(payments.status, "created")));
}

/** Called by the app right after checkout succeeds. Returns the booking id. */
export async function verifyCheckout(customerId: string, input: CheckoutInput) {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, "PAYMENTS_NOT_CONFIGURED", "Payments are not set up on this server yet.");
  }
  if (!isValidCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
    throw badRequest(
      "SIGNATURE_INVALID",
      "We could not verify this payment. If money left your account, it will be confirmed or refunded automatically.",
    );
  }

  const [owned] = await db
    .select({ bookingId: payments.bookingId })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(and(eq(payments.razorpayOrderId, input.razorpayOrderId), eq(bookings.customerId, customerId)));
  if (!owned) throw notFound("Payment");

  await markPaymentPaid({ orderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId });
  return owned.bookingId;
}

/**
 * Development only. Without Razorpay keys the API fakes its orders, so there is
 * no real checkout to pay them; this marks one paid, the same way the webhook
 * would. On a live production server, or once Razorpay keys are set, it does not exist.
 */
export async function confirmDevPayment(customerId: string, orderId: string) {
  if (isLiveProduction || razorpayLive) throw notFound("Endpoint");

  const [owned] = await db
    .select({ bookingId: payments.bookingId })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(and(eq(payments.razorpayOrderId, orderId), eq(bookings.customerId, customerId)));
  if (!owned) throw notFound("Payment");

  await markPaymentPaid({ orderId, paymentId: `pay_dev_${randomToken(9)}`, method: "test" });
  return owned.bookingId;
}

/** The parts of Razorpay's webhook body we read. */
export type RazorpayEvent = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; method?: string; error_description?: string | null } };
    refund?: { entity: { id: string; notes?: Record<string, string> | [] } };
  };
};

export async function handleRazorpayEvent(event: RazorpayEvent) {
  const payment = event.payload.payment?.entity;
  const refund = event.payload.refund?.entity;

  switch (event.event) {
    case "payment.captured":
    case "order.paid":
      if (payment) await markPaymentPaid({ orderId: payment.order_id, paymentId: payment.id, method: payment.method });
      break;
    case "payment.failed":
      if (payment) await markPaymentFailed(payment.order_id, payment.error_description);
      break;
    case "refund.processed":
    case "refund.failed": {
      if (!refund) break;
      const noted = Array.isArray(refund.notes) ? undefined : refund.notes?.refundId;
      const ourId = z.uuid().safeParse(noted).success ? noted : undefined;
      await settleRefund(refund.id, ourId, event.event === "refund.processed" ? "processed" : "failed");
      break;
    }
    default:
      break; // other events are acknowledged and ignored
  }
}
