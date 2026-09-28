import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, timestamps, timestamptz } from "./columns.ts";
import { artistStatus, occasion } from "./enums.ts";
import { users } from "./users.ts";

export const artists = pgTable(
  "artists",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text().notNull().unique(),
    studioName: text().notNull(),
    specialty: text().notNull(),
    tagline: text(),
    bio: text(),
    city: text().notNull(),
    area: text(),
    experienceYears: integer().notNull().default(0),
    instagram: text(),
    profileImageUrl: text(),
    coverImageUrl: text(),
    travelsToVenue: boolean().notNull().default(true),
    status: artistStatus().notNull().default("draft"),
    statusReason: text(),
    submittedAt: timestamptz(),
    approvedAt: timestamptz(),
    approvedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    isFeatured: boolean().notNull().default(false),
    ratingSum: integer().notNull().default(0),
    ratingCount: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index().on(t.status, t.city),
    index("artists_studio_name_trgm_idx").using("gin", t.studioName.op("gin_trgm_ops")),
    check("artists_experience_check", sql`${t.experienceYears} between 0 and 60`),
  ],
);

/** The weekly pattern: "works Tuesdays 09:00 to 18:00". Several rows a day give split shifts. */
export const artistWeeklyHours = pgTable(
  "artist_weekly_hours",
  {
    id: id(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    weekday: smallint().notNull(),
    startTime: time().notNull(),
    endTime: time().notNull(),
  },
  (t) => [
    index().on(t.artistId, t.weekday),
    check("weekly_hours_weekday_check", sql`${t.weekday} between 0 and 6`),
    check("weekly_hours_order_check", sql`${t.endTime} > ${t.startTime}`),
  ],
);

export const artistTimeOff = pgTable(
  "artist_time_off",
  {
    id: id(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    startsAt: timestamptz().notNull(),
    endsAt: timestamptz().notNull(),
    reason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.artistId, t.startsAt),
    check("time_off_order_check", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: id(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    imageUrl: text().notNull(),
    publicId: text(),
    width: integer(),
    height: integer(),
    occasion: occasion(),
    caption: text(),
    sortOrder: integer().notNull().default(0),
    isFeatured: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.artistId, t.sortOrder), index().on(t.isFeatured)],
);

export const savedArtists = pgTable(
  "saved_artists",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.artistId] })],
);
