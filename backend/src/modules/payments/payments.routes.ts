import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv, AuthEnv } from "../../app-env.ts";
import { db } from "../../db/client.ts";
import { webhookEvents } from "../../db/schema/index.ts";
import { sha256 } from "../../lib/crypto.ts";
import { badRequest } from "../../lib/errors.ts";
import { validate } from "../../lib/validate.ts";
import { requireAuth, requireRole } from "../../middleware/auth.ts";
import { getBookingDetail } from "../bookings/booking-detail.ts";
import { checkoutSchema, devConfirmSchema } from "./payments.schemas.ts";
import { confirmDevPayment, handleRazorpayEvent, verifyCheckout, type RazorpayEvent } from "./payments.service.ts";
import { isValidWebhookSignature } from "./razorpay.ts";

export const paymentRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole("customer"))
  .post("/verify", validate("json", checkoutSchema), async (c) => {
    const bookingId = await verifyCheckout(c.var.auth.userId, c.req.valid("json"));
    return c.json(await getBookingDetail(c.var.auth, bookingId));
  })
  .post("/dev-confirm", validate("json", devConfirmSchema), async (c) => {
    const bookingId = await confirmDevPayment(c.var.auth.userId, c.req.valid("json").orderId);
    return c.json(await getBookingDetail(c.var.auth, bookingId));
  });

/**
 * Razorpay calls this server-to-server. It is the proof of payment that does not
 * depend on the bride's phone: even if she closes the app mid-payment, this arrives.
 */
export const webhookRoutes = new Hono<AppEnv>().post("/razorpay", async (c) => {
  // Hash the exact bytes Razorpay signed. Parsing to JSON first would change them.
  const rawBody = await c.req.text();
  if (!isValidWebhookSignature(rawBody, c.req.header("x-razorpay-signature") ?? "")) {
    throw badRequest("SIGNATURE_INVALID", "Invalid webhook signature.");
  }

  const event = JSON.parse(rawBody) as RazorpayEvent;
  const eventId = c.req.header("x-razorpay-event-id") ?? sha256(rawBody);

  // Razorpay retries until it gets a 2xx, so the same event can arrive many times.
  await db.insert(webhookEvents).values({ id: eventId, event: event.event, payload: event }).onConflictDoNothing();
  const [record] = await db
    .select({ processedAt: webhookEvents.processedAt })
    .from(webhookEvents)
    .where(eq(webhookEvents.id, eventId));
  if (record?.processedAt) return c.json({ ok: true, duplicate: true });

  await handleRazorpayEvent(event);
  await db.update(webhookEvents).set({ processedAt: new Date() }).where(eq(webhookEvents.id, eventId));
  return c.json({ ok: true });
});
