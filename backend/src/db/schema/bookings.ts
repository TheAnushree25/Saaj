import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { artists } from "./artists.ts";
import { artistServices, services } from "./catalogue.ts";
import { createdAt, id, timestamps, timestamptz } from "./columns.ts";
import { bookingStatus } from "./enums.ts";
import { users } from "./users.ts";

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    ref: text().notNull().unique(),
    customerId: uuid()
      .notNull()
      .references(() => users.id),
    artistId: uuid()
      .notNull()
      .references(() => artists.id),
    status: bookingStatus().notNull().default("pending_payment"),
    title: text().notNull(),
    startsAt: timestamptz().notNull(),
    endsAt: timestamptz().notNull(),
    blockedUntil: timestamptz().notNull(),
    eventType: text().notNull(),
    venue: text().notNull(),
    contactName: text().notNull(),
    contactPhone: text().notNull(),
    notes: text(),
    subtotalPaise: integer().notNull(),
    totalPaise: integer().notNull(),
    advancePaise: integer().notNull(),
    paidPaise: integer().notNull().default(0),
    refundedPaise: integer().notNull().default(0),
    commissionPercent: smallint().notNull(),
    holdExpiresAt: timestamptz(),
    idempotencyKey: text(),
    reminderSentAt: timestamptz(),
    confirmedAt: timestamptz(),
    startedAt: timestamptz(),
    completedAt: timestamptz(),
    cancelledAt: timestamptz(),
    cancelledBy: uuid().references(() => users.id, { onDelete: "set null" }),
    cancelReason: text(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("bookings_customer_idempotency_idx").on(t.customerId, t.idempotencyKey),
    index().on(t.customerId, t.startsAt),
    index().on(t.artistId, t.startsAt),
    index().on(t.status, t.holdExpiresAt),
    check("bookings_time_check", sql`${t.endsAt} > ${t.startsAt} and ${t.blockedUntil} >= ${t.endsAt}`),
    check("bookings_money_check", sql`${t.advancePaise} between 0 and ${t.totalPaise}`),
  ],
);

/** A copy of each service as it was sold, so later price changes never rewrite history. */
export const bookingItems = pgTable(
  "booking_items",
  {
    id: id(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    artistServiceId: uuid().references(() => artistServices.id, { onDelete: "set null" }),
    serviceId: uuid()
      .notNull()
      .references(() => services.id),
    name: text().notNull(),
    pricePaise: integer().notNull(),
    durationMinutes: integer().notNull(),
  },
  (t) => [index().on(t.bookingId)],
);

/** Everything that happened to a booking, in order. Drives the tracking screen and audits. */
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: id(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    type: text().notNull(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.bookingId, t.createdAt)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    bookingId: uuid()
      .notNull()
      .unique()
      .references(() => bookings.id),
    customerId: uuid()
      .notNull()
      .references(() => users.id),
    artistId: uuid()
      .notNull()
      .references(() => artists.id),
    rating: smallint().notNull(),
    comment: text(),
    isPublished: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    index().on(t.artistId, t.createdAt),
    check("reviews_rating_check", sql`${t.rating} between 1 and 5`),
  ],
);
