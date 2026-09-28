import { and, asc, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { env } from "../../config/env.ts";
import { db, type Executor, type Transaction } from "../../db/client.ts";
import { one } from "../../db/helpers.ts";
import {
  artistTimeOff,
  artists,
  bookingEvents,
  bookingItems,
  bookings,
  reviews,
} from "../../db/schema/index.ts";
import { readableCode } from "../../lib/crypto.ts";
import { PgCode, isPgError } from "../../lib/db-errors.ts";
import { conflict, notFound, unprocessable } from "../../lib/errors.ts";
import { formatRupees, percentOf } from "../../lib/money.ts";
import { IST, addDays, addMinutes, istDate, istLabel } from "../../lib/time.ts";
import type { AccessClaims } from "../auth/tokens.ts";
import { notify } from "../notifications/notify.ts";
import { queueRefunds } from "../payments/refunds.ts";
import { assertBookableArtist, loadSelection } from "./availability.ts";
import { bookingCardColumns, loadBookingFor } from "./booking-detail.ts";
import type { BookingTab, CreateBookingInput } from "./bookings.schemas.ts";

const HOUR = 3_600_000;

/** "SJ7K4Q2M": short enough to read over the phone, random so it cannot be guessed. */
const newBookingRef = () => `SJ${readableCode(6)}`;

/** Marks unpaid bookings whose hold ran out as expired, which frees their slots. */
export async function expireHolds(executor: Executor, artistId?: string) {
  const expired = await executor
    .update(bookings)
    .set({ status: "expired" })
    .where(
      and(
        eq(bookings.status, "pending_payment"),
        lt(bookings.holdExpiresAt, new Date()),
        artistId ? eq(bookings.artistId, artistId) : undefined,
      ),
    )
    .returning({ id: bookings.id });
  if (expired.length > 0) {
    await executor.insert(bookingEvents).values(expired.map(({ id }) => ({ bookingId: id, type: "expired" })));
  }
  return expired.length;
}

/** Does the whole appointment fall inside one of her working windows that day, in Indian time? */
async function fitsWorkingHours(tx: Transaction, artistId: string, startsAt: Date, endsAt: Date) {
  const start = startsAt.toISOString();
  const end = endsAt.toISOString();
  const result = await tx.execute<{ fits: boolean }>(sql`
    select exists (
      select 1 from artist_weekly_hours h
      where h.artist_id = ${artistId}
        and h.weekday = extract(dow from (${start}::timestamptz at time zone ${IST}))
        and (${start}::timestamptz at time zone ${IST})::date = (${end}::timestamptz at time zone ${IST})::date
        and (${start}::timestamptz at time zone ${IST})::time >= h.start_time
        and (${end}::timestamptz at time zone ${IST})::time <= h.end_time
    ) as fits
  `);
  return result.rows[0]?.fits === true;
}

async function isOnTimeOff(tx: Transaction, artistId: string, startsAt: Date, endsAt: Date) {
  const [clash] = await tx
    .select({ id: artistTimeOff.id })
    .from(artistTimeOff)
    .where(
      and(
        eq(artistTimeOff.artistId, artistId),
        lt(artistTimeOff.startsAt, endsAt),
        gt(artistTimeOff.endsAt, startsAt),
      ),
    )
    .limit(1);
  return clash !== undefined;
}

async function bookingIdForKey(customerId: string, idempotencyKey: string) {
  const [existing] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.customerId, customerId), eq(bookings.idempotencyKey, idempotencyKey)));
  return existing?.id;
}

/**
 * Holds a slot for the bride while she pays. The price comes from our database,
 * never from the app. Two brides racing for one slot: the database's
 * no-overlap rule lets exactly one insert succeed; the other gets SLOT_TAKEN.
 * Returns the booking id.
 */
export async function createBooking(customerId: string, input: CreateBookingInput): Promise<string> {
  // The same attempt sent twice (a flaky network retry) returns the first booking.
  const repeat = await bookingIdForKey(customerId, input.idempotencyKey);
  if (repeat) return repeat;

  const startsAt = new Date(input.startsAt);
  if (startsAt.getTime() < Date.now() + env.MIN_NOTICE_HOURS * HOUR) {
    throw unprocessable("TOO_SOON", `Please book at least ${env.MIN_NOTICE_HOURS} hours ahead.`);
  }
  if (istDate(startsAt) > istDate(addDays(new Date(), env.BOOKING_HORIZON_DAYS))) {
    throw unprocessable("TOO_FAR_AHEAD", `Bookings open ${env.BOOKING_HORIZON_DAYS} days ahead.`);
  }

  const artist = await assertBookableArtist(db, input.artistId);
  if (artist.userId === customerId) throw unprocessable("OWN_BOOKING", "You cannot book yourself.");

  const selection = await loadSelection(db, artist.id, input.artistServiceIds);
  const endsAt = addMinutes(startsAt, selection.durationMinutes);
  const blockedUntil = addMinutes(endsAt, selection.bufferMinutes);
  const totalPaise = selection.subtotalPaise;
  // Razorpay's smallest payment is ₹1 (100 paise).
  const advancePaise = Math.min(totalPaise, Math.max(100, percentOf(totalPaise, env.ADVANCE_PERCENT)));

  const insert = () =>
    db.transaction(async (tx) => {
      if (!(await fitsWorkingHours(tx, artist.id, startsAt, endsAt))) {
        throw unprocessable("OUTSIDE_HOURS", "The artist is not working at that time.");
      }
      if (await isOnTimeOff(tx, artist.id, startsAt, endsAt)) {
        throw conflict("SLOT_TAKEN", "Sorry, the artist is away at that time. Please choose another.");
      }
      // Clear this artist's abandoned holds first, so one can never block a real booking.
      await expireHolds(tx, artist.id);

      const booking = one(
        await tx
          .insert(bookings)
          .values({
            ref: newBookingRef(),
            customerId,
            artistId: artist.id,
            title: selection.title,
            startsAt,
            endsAt,
            blockedUntil,
            eventType: input.eventType,
            venue: input.venue,
            contactName: input.contactName,
            contactPhone: input.contactPhone,
            notes: input.notes,
            subtotalPaise: totalPaise,
            totalPaise,
            advancePaise,
            commissionPercent: env.COMMISSION_PERCENT,
            holdExpiresAt: addMinutes(new Date(), env.HOLD_MINUTES),
            idempotencyKey: input.idempotencyKey,
          })
          .returning({ id: bookings.id }),
      );
      await tx.insert(bookingItems).values(
        selection.items.map((item) => ({
          bookingId: booking.id,
          artistServiceId: item.artistServiceId,
          serviceId: item.serviceId,
          name: item.name,
          pricePaise: item.pricePaise,
          durationMinutes: item.durationMinutes,
        })),
      );
      await tx.insert(bookingEvents).values({ bookingId: booking.id, type: "created", actorId: customerId });
      return booking.id;
    });

  // A random ref can (very rarely) repeat; then we simply try again with a new one.
  for (let attempt = 1; ; attempt++) {
    try {
      return await insert();
    } catch (error) {
      if (isPgError(error, PgCode.exclusionViolation)) {
        throw conflict("SLOT_TAKEN", "Sorry, that time was just booked. Please choose another.");
      }
      if (isPgError(error, PgCode.uniqueViolation, "bookings_customer_idempotency_idx")) {
        const id = await bookingIdForKey(customerId, input.idempotencyKey);
        if (id) return id;
      }
      if (isPgError(error, PgCode.uniqueViolation, "bookings_ref_unique") && attempt < 3) continue;
      // Two inserts checking the no-overlap rule at the same instant can wait on each
      // other; Postgres then cancels one as a deadlock. Try again: one of them now wins.
      if (isPgError(error, PgCode.deadlock) && attempt < 3) continue;
      throw error;
    }
  }
}

export function listCustomerBookings(customerId: string, tab: BookingTab) {
  // A pending booking whose hold ran out is no longer "upcoming", even before the job marks it.
  const liveHold = or(ne(bookings.status, "pending_payment"), gt(bookings.holdExpiresAt, new Date()));
  const where = {
    upcoming: and(inArray(bookings.status, ["pending_payment", "confirmed", "in_progress"]), liveHold),
    completed: eq(bookings.status, "completed"),
    cancelled: inArray(bookings.status, ["cancelled", "expired"]),
  }[tab];

  return db
    .select({
      ...bookingCardColumns,
      artist: {
        id: artists.id,
        slug: artists.slug,
        studioName: artists.studioName,
        city: artists.city,
        profileImageUrl: artists.profileImageUrl,
      },
    })
    .from(bookings)
    .innerJoin(artists, eq(artists.id, bookings.artistId))
    .where(and(eq(bookings.customerId, customerId), where))
    .orderBy(tab === "upcoming" ? asc(bookings.startsAt) : desc(bookings.startsAt))
    .limit(100);
}

/** Who to tell about a booking: the bride and the artist's user account. */
async function participants(tx: Executor, artistId: string) {
  const [artist] = await tx.select({ userId: artists.userId }).from(artists).where(eq(artists.id, artistId));
  return artist?.userId;
}

/**
 * Cancels a booking and refunds by the rules: a bride cancelling at least
 * FREE_CANCELLATION_HOURS ahead gets her payment back; later, she does not.
 * When the artist or an admin cancels, the bride is always refunded in full.
 */
export async function cancelBooking(viewer: AccessClaims, bookingId: string, reason: string) {
  const { booking } = await loadBookingFor(viewer, bookingId);

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(bookings).where(eq(bookings.id, booking.id)).for("update");
    if (!current) throw notFound("Booking");
    if (current.status !== "pending_payment" && current.status !== "confirmed") {
      throw conflict("CANNOT_CANCEL", "This booking can no longer be cancelled.");
    }
    if (viewer.role === "customer" && current.startsAt <= new Date()) {
      throw conflict("CANNOT_CANCEL", "This appointment has already started.");
    }

    const refundable = current.paidPaise - current.refundedPaise;
    const hoursAhead = (current.startsAt.getTime() - Date.now()) / HOUR;
    const fullRefund = viewer.role !== "customer" || hoursAhead >= env.FREE_CANCELLATION_HOURS;
    const refundPaise = fullRefund ? refundable : 0;

    await tx
      .update(bookings)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: viewer.userId, cancelReason: reason })
      .where(eq(bookings.id, current.id));
    await tx.insert(bookingEvents).values({ bookingId: current.id, type: "cancelled", actorId: viewer.userId, note: reason });
    const refunded = refundPaise > 0 ? await queueRefunds(tx, current.id, refundPaise, reason) : 0;

    const when = istLabel(current.startsAt);
    const refundLine = refunded > 0 ? ` A refund of ${formatRupees(refunded)} is on its way.` : "";
    await notify(tx, [current.customerId], {
      title: "Booking cancelled",
      body: `${current.title} on ${when} is cancelled.${refundLine}`,
      data: { bookingId: current.id },
    });
    const artistUserId = await participants(tx, current.artistId);
    if (artistUserId && current.status === "confirmed" && artistUserId !== viewer.userId) {
      await notify(tx, [artistUserId], {
        title: "Booking cancelled",
        body: `${current.title} on ${when} was cancelled.`,
        data: { bookingId: current.id },
      });
    }
    return { refundPaise: refunded };
  });
}

/** The artist (or an admin) marks the appointment started. Allowed from 3 hours before. */
export async function startBooking(viewer: AccessClaims, bookingId: string) {
  const { booking } = await loadBookingFor(viewer, bookingId);
  if (booking.status !== "confirmed") throw conflict("WRONG_STATUS", "Only a confirmed booking can be started.");
  if (booking.startsAt.getTime() - Date.now() > 3 * HOUR) {
    throw conflict("TOO_EARLY", "You can start the appointment up to 3 hours before its time.");
  }

  await db.transaction(async (tx) => {
    await tx.update(bookings).set({ status: "in_progress", startedAt: new Date() }).where(eq(bookings.id, booking.id));
    await tx.insert(bookingEvents).values({ bookingId: booking.id, type: "started", actorId: viewer.userId });
    await notify(tx, [booking.customerId], {
      title: "Your artist has begun",
      body: `${booking.title} is in progress. Enjoy every moment.`,
      data: { bookingId: booking.id },
    });
  });
}

export async function completeBooking(viewer: AccessClaims, bookingId: string) {
  const { booking } = await loadBookingFor(viewer, bookingId);
  if (booking.status !== "in_progress" && booking.status !== "confirmed") {
    throw conflict("WRONG_STATUS", "Only a confirmed or started booking can be completed.");
  }
  if (booking.startsAt > new Date()) throw conflict("TOO_EARLY", "This appointment has not started yet.");

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({ status: "completed", startedAt: booking.startedAt ?? booking.startsAt, completedAt: new Date() })
      .where(eq(bookings.id, booking.id));
    await tx.insert(bookingEvents).values({ bookingId: booking.id, type: "completed", actorId: viewer.userId });
    await notify(tx, [booking.customerId], {
      title: "How was your look?",
      body: `Tell other brides about ${booking.title}. It takes a minute.`,
      data: { bookingId: booking.id },
    });
  });
}

export async function createReview(customerId: string, bookingId: string, input: { rating: number; comment?: string | undefined }) {
  try {
    return await db.transaction(async (tx) => {
      const [booking] = await tx
        .select({ id: bookings.id, customerId: bookings.customerId, artistId: bookings.artistId, status: bookings.status })
        .from(bookings)
        .where(eq(bookings.id, bookingId));
      if (!booking || booking.customerId !== customerId) throw notFound("Booking");
      if (booking.status !== "completed") {
        throw conflict("NOT_COMPLETED", "You can leave a review once the appointment is complete.");
      }

      const review = one(
        await tx
          .insert(reviews)
          .values({ bookingId, customerId, artistId: booking.artistId, rating: input.rating, comment: input.comment })
          .returning({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt }),
      );
      // Keep the artist's running totals in step, so listing artists never has to average reviews.
      await tx
        .update(artists)
        .set({
          ratingSum: sql`${artists.ratingSum} + ${input.rating}`,
          ratingCount: sql`${artists.ratingCount} + 1`,
        })
        .where(eq(artists.id, booking.artistId));
      return review;
    });
  } catch (error) {
    if (isPgError(error, PgCode.uniqueViolation, "reviews_bookingId_unique")) {
      throw conflict("ALREADY_REVIEWED", "You have already reviewed this booking.");
    }
    throw error;
  }
}

/** Hourly job: a reminder about 24 hours ahead, sent once per booking. */
export async function sendReminders() {
  await db.transaction(async (tx) => {
    const due = await tx
      .update(bookings)
      .set({ reminderSentAt: new Date() })
      .where(
        and(
          eq(bookings.status, "confirmed"),
          isNull(bookings.reminderSentAt),
          gt(bookings.startsAt, sql`now() + interval '20 hours'`),
          lt(bookings.startsAt, sql`now() + interval '26 hours'`),
        ),
      )
      .returning();

    for (const booking of due) {
      const when = istLabel(booking.startsAt);
      await notify(tx, [booking.customerId], {
        title: "See you tomorrow",
        body: `${booking.title} · ${when} at ${booking.venue}.`,
        data: { bookingId: booking.id },
      });
      const artistUserId = await participants(tx, booking.artistId);
      if (artistUserId) {
        await notify(tx, [artistUserId], {
          title: "Tomorrow's booking",
          body: `${booking.title} · ${when} · ${booking.venue}`,
          data: { bookingId: booking.id },
        });
      }
    }
  });
}
