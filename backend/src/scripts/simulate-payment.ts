import { and, desc, eq } from "drizzle-orm";
import { env, isLiveProduction } from "../config/env.ts";
import { db, pool } from "../db/client.ts";
import { bookings, payments } from "../db/schema/index.ts";
import { hmacSha256, randomToken } from "../lib/crypto.ts";

/*
 * Development only: pretends to be Razorpay. Finds the booking's unpaid order
 * and sends your local server a correctly signed "payment.captured" webhook,
 * exactly the way Razorpay would after a real UPI or card payment.
 *
 *   npm run pay:simulate SJF8QHR4
 */
const ref = process.argv[2];

if (isLiveProduction) throw new Error("Never simulate payments in production.");
if (!ref) throw new Error("Usage: npm run pay:simulate <booking ref>, for example: npm run pay:simulate SJF8QHR4");
if (!env.RAZORPAY_WEBHOOK_SECRET) throw new Error("Set RAZORPAY_WEBHOOK_SECRET in .env first.");

const [open] = await db
  .select({ orderId: payments.razorpayOrderId, amountPaise: payments.amountPaise })
  .from(payments)
  .innerJoin(bookings, eq(bookings.id, payments.bookingId))
  .where(and(eq(bookings.ref, ref.toUpperCase()), eq(payments.status, "created")))
  .orderBy(desc(payments.createdAt))
  .limit(1);
await pool.end();
if (!open) throw new Error(`No unpaid order for ${ref}. Start the payment in the app first.`);

const body = JSON.stringify({
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: `pay_dev_${randomToken(9)}`,
        order_id: open.orderId,
        amount: open.amountPaise,
        method: "upi",
        status: "captured",
      },
    },
  },
});

const response = await fetch(`http://localhost:${env.PORT}/v1/webhooks/razorpay`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-razorpay-signature": hmacSha256(env.RAZORPAY_WEBHOOK_SECRET, body),
    "x-razorpay-event-id": `evt_dev_${randomToken(9)}`,
  },
  body,
});
console.log(`Webhook answered ${response.status}: ${await response.text()}`);
