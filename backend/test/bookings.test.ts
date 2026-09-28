import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/db/client.ts";
import { bookings, refunds } from "../src/db/schema/index.ts";
import { istDate } from "../src/lib/time.ts";
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

const book = (token: string, startsAt: string, body = bookingBody(artistId, offeringId, startsAt)) =>
  api("POST", "/v1/bookings", { token, body });

describe("slots", () => {
  it("shows free slots, and a booked one (with its buffer) as taken", async () => {
    const bride = await signUp();
    const startsAt = tenAm(5);
    const date = istDate(new Date(startsAt));
    await book(bride.tokens.accessToken, startsAt);

    const { body } = await api("GET", `/v1/artists/${artistId}/slots?date=${date}&services=${offeringId}`);
    const at = (label: string) => body.slots.find((slot: { label: string }) => slot.label === label);

    // The booking holds 10:00-12:00 (90 minutes of makeup + 30 minutes of buffer).
    expect(at("10:00 AM").available).toBe(false);
    expect(at("11:30 AM").available).toBe(false);
    expect(at("12:00 PM").available).toBe(true);
    // A new booking needs 2 hours too: 08:30 would run into 10:00, 08:00 just fits.
    expect(at("08:30 AM").available).toBe(false);
    expect(at("08:00 AM").available).toBe(true);
  });
});

describe("creating a booking", () => {
  it("holds the slot, prices it from the database and asks for a 20% advance", async () => {
    const bride = await signUp();
    const { status, body } = await book(bride.tokens.accessToken, tenAm(5), {
      ...bookingBody(artistId, offeringId, tenAm(5)),
      // @ts-expect-error: the app cannot choose its own price; unknown fields are dropped
      totalPaise: 100,
    });

    expect(status).toBe(201);
    expect(body.status).toBe("pending_payment");
    expect(body.totalPaise).toBe(2_500_000);
    expect(body.advancePaise).toBe(500_000);
    expect(body.canPay).toBe("advance");
  });

  it("lets exactly one of two brides racing for the same slot win", async () => {
    const first = await signUp();
    const second = await signUp();
    const startsAt = tenAm(6);

    const results = await Promise.all([book(first.tokens.accessToken, startsAt), book(second.tokens.accessToken, startsAt)]);
    const statuses = results.map((result) => result.status).sort();

    expect(statuses).toEqual([201, 409]);
    expect(results.find((result) => result.status === 409)?.body.error.code).toBe("SLOT_TAKEN");
    expect(await db.select().from(bookings)).toHaveLength(1);
  });

  it("returns the same booking when the app retries with the same key", async () => {
    const bride = await signUp();
    const body = bookingBody(artistId, offeringId, tenAm(7));
    const first = await book(bride.tokens.accessToken, body.startsAt, body);
    const retry = await book(bride.tokens.accessToken, body.startsAt, body);

    expect(retry.body.id).toBe(first.body.id);
    expect(await db.select().from(bookings)).toHaveLength(1);
  });

  it("frees a slot whose hold expired, for the next bride", async () => {
    const first = await signUp();
    const second = await signUp();
    const startsAt = tenAm(8);
    const held = await book(first.tokens.accessToken, startsAt);
    await db.update(bookings).set({ holdExpiresAt: new Date(Date.now() - 1000) }).where(eq(bookings.id, held.body.id));

    const next = await book(second.tokens.accessToken, startsAt);

    expect(next.status).toBe(201);
    const [old] = await db.select().from(bookings).where(eq(bookings.id, held.body.id));
    expect(old?.status).toBe("expired");
  });

  it("refuses a time outside the artist's working hours", async () => {
    const bride = await signUp();
    const lateNight = new Date(`${istDate(new Date(tenAm(5)))}T23:00:00+05:30`).toISOString();
    const { status, body } = await book(bride.tokens.accessToken, lateNight);

    expect(status).toBe(422);
    expect(body.error.code).toBe("OUTSIDE_HOURS");
  });

  it("does not let a bride see someone else's booking", async () => {
    const owner = await signUp();
    const stranger = await signUp();
    const created = await book(owner.tokens.accessToken, tenAm(5));
    const { status } = await api("GET", `/v1/bookings/${created.body.id}`, { token: stranger.tokens.accessToken });

    expect(status).toBe(404);
  });
});

describe("cancelling", () => {
  const paidBooking = async (days: number) => {
    const bride = await signUp();
    const created = await book(bride.tokens.accessToken, tenAm(days));
    await api("POST", `/v1/bookings/${created.body.id}/payments`, {
      token: bride.tokens.accessToken,
      body: { kind: "advance" },
    });
    await payByWebhook(created.body.id);
    return { token: bride.tokens.accessToken as string, id: created.body.id as string };
  };

  it("refunds the advance in full when cancelled well ahead", async () => {
    const { token, id } = await paidBooking(10);
    const { status, body } = await api("POST", `/v1/bookings/${id}/cancel`, { token, body: { reason: "Date moved" } });

    expect(status).toBe(200);
    expect(body.refundPaise).toBe(500_000);
    expect(body.booking.status).toBe("cancelled");
    expect(await db.select().from(refunds)).toHaveLength(1);
  });

  it("keeps the advance when the bride cancels within 72 hours", async () => {
    // Two days ahead is always inside the 72-hour window and past the 12-hour notice.
    const { token, id } = await paidBooking(2);
    const { body } = await api("POST", `/v1/bookings/${id}/cancel`, { token, body: { reason: "Changed plans" } });

    expect(body.refundPaise).toBe(0);
  });
});
