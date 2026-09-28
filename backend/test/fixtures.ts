import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { app } from "../src/app.ts";
import { db } from "../src/db/client.ts";
import { one } from "../src/db/helpers.ts";
import {
  artistServices,
  artistWeeklyHours,
  artists,
  payments,
  serviceCategories,
  services,
} from "../src/db/schema/index.ts";
import { hmacSha256 } from "../src/lib/crypto.ts";
import { addDays, istDate } from "../src/lib/time.ts";
import { api, nextPhone } from "./helpers.ts";

export async function createService() {
  const category = one(await db.insert(serviceCategories).values({ slug: "bridal", name: "Bridal" }).returning());
  return one(
    await db
      .insert(services)
      .values({ categoryId: category.id, slug: "bridal-makeup", name: "Bridal Makeup", defaultDurationMinutes: 90 })
      .returning(),
  );
}

/** An artist who signed up, was approved, offers the service for ₹25,000 and works 07:00-20:00 daily. */
export async function createApprovedArtist(serviceId: string) {
  const phone = nextPhone();
  const { body } = await api("POST", "/v1/auth/register/artist", {
    body: {
      fullName: "Test Artist",
      phone,
      password: "artist-pass-1",
      email: `${phone}@example.com`,
      studioName: "Test Studio",
      specialty: "Bridal Makeup",
      city: "Kolkata",
      experienceYears: 5,
    },
  });
  const artist = one(
    await db.update(artists).set({ status: "approved" }).where(eq(artists.userId, body.user.id)).returning(),
  );
  const offering = one(
    await db
      .insert(artistServices)
      .values({ artistId: artist.id, serviceId, pricePaise: 2_500_000, durationMinutes: 90, bufferMinutes: 30 })
      .returning(),
  );
  await db
    .insert(artistWeeklyHours)
    .values([0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ artistId: artist.id, weekday, startTime: "07:00", endTime: "20:00" })));
  return { artist, offering, token: body.tokens.accessToken as string };
}

/** 10:00 in India, `days` from today: always inside the test artist's hours. */
export const tenAm = (days: number) =>
  new Date(`${istDate(addDays(new Date(), days))}T10:00:00+05:30`).toISOString();

export const bookingBody = (artistId: string, artistServiceId: string, startsAt: string) => ({
  artistId,
  artistServiceIds: [artistServiceId],
  startsAt,
  eventType: "Wedding",
  venue: "The Oberoi Grand, Kolkata",
  contactName: "Test Bride",
  contactPhone: "9876543210",
  idempotencyKey: randomUUID(),
});

/** Sends a correctly signed Razorpay webhook, as if the bride paid the open order. */
export async function payByWebhook(bookingId: string, eventId = `evt_${randomUUID()}`) {
  const payment = one(
    await db
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "created"))),
  );
  const body = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: `pay_${randomUUID()}`, order_id: payment.razorpayOrderId, method: "upi" } } },
  });
  return app.request("/v1/webhooks/razorpay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": hmacSha256(process.env.RAZORPAY_WEBHOOK_SECRET ?? "", body),
      "x-razorpay-event-id": eventId,
    },
    body,
  });
}
