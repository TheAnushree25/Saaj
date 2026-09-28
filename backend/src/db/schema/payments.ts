import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { bookings } from "./bookings.ts";
import { id, timestamps, timestamptz } from "./columns.ts";
import { paymentKind, paymentStatus, refundStatus } from "./enums.ts";

/** One row per Razorpay order. The advance is a row, the balance is a row. */
export const payments = pgTable(
  "payments",
  {
    id: id(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    kind: paymentKind().notNull(),
    amountPaise: integer().notNull(),
    status: paymentStatus().notNull().default("created"),
    razorpayOrderId: text().notNull().unique(),
    razorpayPaymentId: text().unique(),
    method: text(),
    failureReason: text(),
    paidAt: timestamptz(),
    ...timestamps(),
  },
  (t) => [index().on(t.bookingId), check("payments_amount_check", sql`${t.amountPaise} > 0`)],
);

export const refunds = pgTable(
  "refunds",
  {
    id: id(),
    paymentId: uuid()
      .notNull()
      .references(() => payments.id),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    amountPaise: integer().notNull(),
    status: refundStatus().notNull().default("pending"),
    razorpayRefundId: text().unique(),
    reason: text(),
    ...timestamps(),
  },
  (t) => [index().on(t.paymentId), check("refunds_amount_check", sql`${t.amountPaise} > 0`)],
);

/** Every webhook Razorpay sends, keyed by its event id, so a retry is never processed twice. */
export const webhookEvents = pgTable("webhook_events", {
  id: text().primaryKey(),
  event: text().notNull(),
  payload: jsonb().notNull(),
  receivedAt: timestamptz().notNull().defaultNow(),
  processedAt: timestamptz(),
});
