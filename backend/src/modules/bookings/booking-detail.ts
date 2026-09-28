import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import {
  artists,
  bookingEvents,
  bookingItems,
  bookings,
  payments,
  reviews,
  users,
} from "../../db/schema/index.ts";
import { notFound } from "../../lib/errors.ts";
import type { AccessClaims } from "../auth/tokens.ts";

type Booking = typeof bookings.$inferSelect;

const HOUR = 3_600_000;

/**
 * Loads a booking the caller may see: a bride her own, an artist the ones made
 * with her, an admin any. Anyone else gets "not found", not "forbidden", so the
 * answer does not even reveal that the booking exists.
 */
export async function loadBookingFor(viewer: AccessClaims, bookingId: string) {
  const [row] = await db
    .select({ booking: bookings, artistUserId: artists.userId })
    .from(bookings)
    .innerJoin(artists, eq(artists.id, bookings.artistId))
    .where(eq(bookings.id, bookingId));

  const allowed =
    row !== undefined &&
    (viewer.role === "admin" ||
      (viewer.role === "customer" && row.booking.customerId === viewer.userId) ||
      (viewer.role === "artist" && row.artistUserId === viewer.userId));
  if (!row || !allowed) throw notFound("Booking");
  return row;
}

/** The five steps of the app's "Booking status" screen, worked out from the booking. */
export function timelineOf(booking: Booking) {
  const withinADay = booking.startsAt.getTime() - Date.now() < 24 * HOUR;
  return [
    { key: "confirmed", label: "Booking confirmed", done: booking.confirmedAt !== null, at: booking.confirmedAt },
    { key: "assigned", label: "Artist assigned", done: booking.confirmedAt !== null, at: booking.confirmedAt },
    {
      key: "upcoming",
      label: "Upcoming appointment",
      done: booking.startedAt !== null || (booking.status === "confirmed" && withinADay),
      at: null,
    },
    { key: "in_progress", label: "Service in progress", done: booking.startedAt !== null, at: booking.startedAt },
    { key: "completed", label: "Completed", done: booking.completedAt !== null, at: booking.completedAt },
  ];
}

/** What the caller can do next, so every app shows the same buttons for the same state. */
function actionsFor(viewer: AccessClaims, booking: Booking, hasReview: boolean) {
  const holdLive = booking.holdExpiresAt !== null && booking.holdExpiresAt > new Date();
  const balance = booking.totalPaise - booking.paidPaise;
  const isCustomer = viewer.role === "customer";

  let canPay: "advance" | "balance" | null = null;
  if (isCustomer && booking.status === "pending_payment" && holdLive) canPay = "advance";
  if (isCustomer && ["confirmed", "in_progress", "completed"].includes(booking.status) && balance > 0) {
    canPay = "balance";
  }

  return {
    canPay,
    canCancel:
      ["pending_payment", "confirmed"].includes(booking.status) &&
      (!isCustomer || booking.startsAt > new Date()),
    canReview: isCustomer && booking.status === "completed" && !hasReview,
  };
}

export async function getBookingDetail(viewer: AccessClaims, bookingId: string) {
  const { booking } = await loadBookingFor(viewer, bookingId);

  const [[artist], [customer], items, paymentRows, events, [review]] = await Promise.all([
    db
      .select({
        id: artists.id,
        slug: artists.slug,
        studioName: artists.studioName,
        city: artists.city,
        profileImageUrl: artists.profileImageUrl,
        phone: users.phone,
      })
      .from(artists)
      .innerJoin(users, eq(users.id, artists.userId))
      .where(eq(artists.id, booking.artistId)),
    db
      .select({ id: users.id, fullName: users.fullName, phone: users.phone })
      .from(users)
      .where(eq(users.id, booking.customerId)),
    db
      .select({ name: bookingItems.name, pricePaise: bookingItems.pricePaise, durationMinutes: bookingItems.durationMinutes })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, booking.id)),
    db
      .select({
        id: payments.id,
        kind: payments.kind,
        amountPaise: payments.amountPaise,
        status: payments.status,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(eq(payments.bookingId, booking.id))
      .orderBy(asc(payments.createdAt)),
    db
      .select({ type: bookingEvents.type, note: bookingEvents.note, at: bookingEvents.createdAt })
      .from(bookingEvents)
      .where(eq(bookingEvents.bookingId, booking.id))
      .orderBy(asc(bookingEvents.createdAt)),
    db
      .select({ rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt })
      .from(reviews)
      .where(eq(reviews.bookingId, booking.id)),
  ]);

  // A bride sees the artist's number only once the booking is confirmed.
  const showArtistPhone =
    viewer.role !== "customer" || ["confirmed", "in_progress", "completed"].includes(booking.status);

  return {
    id: booking.id,
    ref: booking.ref,
    status: booking.status,
    title: booking.title,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    eventType: booking.eventType,
    venue: booking.venue,
    contactName: booking.contactName,
    contactPhone: booking.contactPhone,
    notes: booking.notes,
    totalPaise: booking.totalPaise,
    advancePaise: booking.advancePaise,
    paidPaise: booking.paidPaise,
    refundedPaise: booking.refundedPaise,
    balancePaise: booking.totalPaise - booking.paidPaise,
    holdExpiresAt: booking.holdExpiresAt,
    cancelReason: booking.cancelReason,
    createdAt: booking.createdAt,
    artist: artist ? { ...artist, phone: showArtistPhone ? artist.phone : null } : null,
    customer: viewer.role === "customer" ? null : (customer ?? null),
    items,
    payments: paymentRows,
    events,
    timeline: timelineOf(booking),
    review: review ?? null,
    ...actionsFor(viewer, booking, review !== undefined),
  };
}

/** The short form used in lists. */
export const bookingCardColumns = {
  id: bookings.id,
  ref: bookings.ref,
  title: bookings.title,
  status: bookings.status,
  startsAt: bookings.startsAt,
  endsAt: bookings.endsAt,
  venue: bookings.venue,
  totalPaise: bookings.totalPaise,
  paidPaise: bookings.paidPaise,
  holdExpiresAt: bookings.holdExpiresAt,
};
