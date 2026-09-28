import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.ts";
import { db } from "../src/db/client.ts";
import { bookings, payments, refunds } from "../src/db/schema/index.ts";
import { hmacSha256 } from "../src/lib/crypto.ts";
import { bookingBody, createApprovedArtist, createService, payByWebhook, tenAm } from "./fixtures.ts";
import { api, resetDatabase, signUp } from "./helpers.ts";

let artistId: string;
let offeringId: string;

beforeEach(async () => {
  await resetDatabase();
  const service = await createService();
  const { artist, offering } = await createApprovedArtist(service.id);
  artistId = artist.id;
  offeringId = offering.id;
});

/** A bride with a held booking and an open Razorpay order for its advance. */
async function heldBooking(days = 5) {
  const bride = await signUp();
  const token = bride.tokens.accessToken as string;
  const created = await api("POST", "/v1/bookings", { token, body: bookingBody(artistId, offeringId, tenAm(days)) });
  const order = await api("POST", `/v1/bookings/${created.body.id}/payments`, { token, body: { kind: "advance" } });
  return { token, bookingId: created.body.id as string, orderId: order.body.orderId as string };
}

describe("Razorpay webhook", () => {
  it("rejects a webhook with a wrong signature", async () => {
    const response = await app.request("/v1/webhooks/razorpay", {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": "forged" },
      body: JSON.stringify({ event: "payment.captured", payload: {} }),
    });
    expect(response.status).toBe(400);
  });

  it("confirms the booking, and a repeated delivery changes nothing", async () => {
    const { token, bookingId } = await heldBooking();
    const first = await payByWebhook(bookingId, "evt_same");

    // Razorpay re-sends: same event id, same order (now paid, so build the body by hand).
    const [payment] = await db.select().from(payments).where(eq(payments.bookingId, bookingId));
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: payment?.razorpayPaymentId, order_id: payment?.razorpayOrderId } } },
    });
    const repeat = await app.request("/v1/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": hmacSha256(process.env.RAZORPAY_WEBHOOK_SECRET ?? "", body),
        "x-razorpay-event-id": "evt_same",
      },
      body,
    });
    const detail = await api("GET", `/v1/bookings/${bookingId}`, { token });

    expect(first.status).toBe(200);
    expect(await repeat.json()).toEqual({ ok: true, duplicate: true });
    expect(detail.body.status).toBe("confirmed");
    expect(detail.body.paidPaise).toBe(500_000);
  });
});

describe("checkout verification from the app", () => {
  it("confirms with Razorpay's signature and refuses a forged one", async () => {
    const { token, bookingId, orderId } = await heldBooking();
    const paymentId = "pay_test_123";

    const forged = await api("POST", "/v1/payments/verify", {
      token,
      body: { razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: "forged" },
    });
    const genuine = await api("POST", "/v1/payments/verify", {
      token,
      body: {
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: hmacSha256(process.env.RAZORPAY_KEY_SECRET ?? "", `${orderId}|${paymentId}`),
      },
    });

    expect(forged.status).toBe(400);
    expect(genuine.status).toBe(200);
    expect(genuine.body.id).toBe(bookingId);
    expect(genuine.body.status).toBe("confirmed");
  });
});

describe("a payment that arrives too late", () => {
  it("is refunded in full when someone else took the slot meanwhile", async () => {
    const late = await heldBooking(6);
    await db.update(bookings).set({ holdExpiresAt: new Date(Date.now() - 1000) }).where(eq(bookings.id, late.bookingId));
    const rival = await signUp();
    const taken = await api("POST", "/v1/bookings", {
      token: rival.tokens.accessToken,
      body: bookingBody(artistId, offeringId, tenAm(6)),
    });

    await payByWebhook(late.bookingId);
    const [lateBooking] = await db.select().from(bookings).where(eq(bookings.id, late.bookingId));
    const [refund] = await db.select().from(refunds);

    expect(taken.status).toBe(201);
    expect(lateBooking?.status).toBe("cancelled");
    expect(refund?.amountPaise).toBe(500_000);
  });
});
