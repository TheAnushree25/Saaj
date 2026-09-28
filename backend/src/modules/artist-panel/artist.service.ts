import { and, asc, count, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { one } from "../../db/helpers.ts";
import {
  artistServices,
  artistTimeOff,
  artistWeeklyHours,
  artists,
  bookings,
  portfolioItems,
  serviceCategories,
  services,
  users,
} from "../../db/schema/index.ts";
import { PgCode, isPgError } from "../../lib/db-errors.ts";
import { conflict, notFound, unprocessable } from "../../lib/errors.ts";
import { addDays, istDate } from "../../lib/time.ts";
import { audit } from "../admin/audit.ts";
import { bookingCardColumns } from "../bookings/booking-detail.ts";
import { imageUrlFor } from "../uploads/cloudinary.ts";
import type {
  HoursInput,
  OfferingInput,
  PortfolioInput,
  TimeOffInput,
  UpdateOfferingInput,
  UpdatePortfolioInput,
  UpdateProfileInput,
} from "./artist.schemas.ts";

type Artist = typeof artists.$inferSelect;

/** Every panel request starts here: the artist profile of the signed-in user. */
export async function myArtist(userId: string): Promise<Artist> {
  const [artist] = await db.select().from(artists).where(eq(artists.userId, userId));
  if (!artist) throw notFound("Artist profile");
  return artist;
}

/** What still stops the artist from submitting for review. Empty means ready. */
export async function checklistFor(artist: Artist) {
  const [[photos], [offers], [windows]] = await Promise.all([
    db.select({ value: count() }).from(portfolioItems).where(eq(portfolioItems.artistId, artist.id)),
    db
      .select({ value: count() })
      .from(artistServices)
      .where(and(eq(artistServices.artistId, artist.id), eq(artistServices.isActive, true))),
    db.select({ value: count() }).from(artistWeeklyHours).where(eq(artistWeeklyHours.artistId, artist.id)),
  ]);

  const missing: string[] = [];
  if ((artist.bio ?? "").length < 40) missing.push("A bio of at least 40 characters");
  if (!artist.profileImageUrl) missing.push("A profile photo");
  if ((photos?.value ?? 0) < 3) missing.push("At least 3 portfolio photos");
  if ((offers?.value ?? 0) < 1) missing.push("At least one service with your price");
  if ((windows?.value ?? 0) < 1) missing.push("Your working hours");
  return missing;
}

export async function getProfile(userId: string) {
  const artist = await myArtist(userId);
  return { ...artist, checklist: await checklistFor(artist) };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const artist = await myArtist(userId);
  const { profilePublicId, coverPublicId, instagram, ...fields } = input;
  const image = (publicId: string | null | undefined, purpose: "artist-profile" | "artist-cover") =>
    publicId === undefined ? undefined : publicId === null ? null : imageUrlFor(publicId, purpose, userId);
  const profileImageUrl = image(profilePublicId, "artist-profile");
  const coverImageUrl = image(coverPublicId, "artist-cover");

  const updated = one(
    await db
      .update(artists)
      .set({
        ...fields,
        ...(instagram === undefined ? {} : { instagram: instagram?.replace(/^@/, "") ?? null }),
        ...(profileImageUrl === undefined ? {} : { profileImageUrl }),
        ...(coverImageUrl === undefined ? {} : { coverImageUrl }),
      })
      .where(eq(artists.id, artist.id))
      .returning(),
  );
  return { ...updated, checklist: await checklistFor(updated) };
}

/** Draft (or rejected) → waiting for the admin, once the checklist is complete. */
export async function submitForReview(userId: string) {
  const artist = await myArtist(userId);
  if (artist.status !== "draft" && artist.status !== "rejected") {
    throw conflict("WRONG_STATUS", "Your profile is not waiting to be submitted.");
  }
  const missing = await checklistFor(artist);
  if (missing.length > 0) throw unprocessable("PROFILE_INCOMPLETE", "Please finish your profile first.", missing);

  await db.transaction(async (tx) => {
    await tx
      .update(artists)
      .set({ status: "pending_review", submittedAt: new Date(), statusReason: null })
      .where(eq(artists.id, artist.id));
    await audit(tx, userId, "artist.submit", { type: "artist", id: artist.id });
  });
  return getProfile(userId);
}

/** The platform menu an artist picks from, and whether she already offers each one. */
export async function listOfferings(userId: string) {
  const artist = await myArtist(userId);
  return db
    .select({
      serviceId: services.id,
      name: services.name,
      category: serviceCategories.name,
      defaultDurationMinutes: services.defaultDurationMinutes,
      offering: {
        id: artistServices.id,
        pricePaise: artistServices.pricePaise,
        durationMinutes: artistServices.durationMinutes,
        bufferMinutes: artistServices.bufferMinutes,
        isActive: artistServices.isActive,
      },
    })
    .from(services)
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .leftJoin(artistServices, and(eq(artistServices.serviceId, services.id), eq(artistServices.artistId, artist.id)))
    .where(eq(services.isActive, true))
    .orderBy(asc(serviceCategories.sortOrder), asc(services.sortOrder));
}

export async function addOffering(userId: string, input: OfferingInput) {
  const artist = await myArtist(userId);
  try {
    return one(await db.insert(artistServices).values({ ...input, artistId: artist.id }).returning());
  } catch (error) {
    if (isPgError(error, PgCode.uniqueViolation)) {
      throw conflict("ALREADY_OFFERED", "You already offer this service. Edit its price instead.");
    }
    if (isPgError(error, PgCode.foreignKeyViolation)) throw notFound("Service");
    throw error;
  }
}

export async function updateOffering(userId: string, offeringId: string, input: UpdateOfferingInput) {
  const artist = await myArtist(userId);
  const [updated] = await db
    .update(artistServices)
    .set(input)
    .where(and(eq(artistServices.id, offeringId), eq(artistServices.artistId, artist.id)))
    .returning();
  if (!updated) throw notFound("Service");
  return updated;
}

export async function getHours(userId: string) {
  const artist = await myArtist(userId);
  const rows = await db
    .select({ weekday: artistWeeklyHours.weekday, startTime: artistWeeklyHours.startTime, endTime: artistWeeklyHours.endTime })
    .from(artistWeeklyHours)
    .where(eq(artistWeeklyHours.artistId, artist.id))
    .orderBy(asc(artistWeeklyHours.weekday), asc(artistWeeklyHours.startTime));
  // Postgres returns a time as "09:30:00"; send "09:30", the same form PUT /hours accepts.
  return rows.map((row) => ({ ...row, startTime: row.startTime.slice(0, 5), endTime: row.endTime.slice(0, 5) }));
}

/** Replaces the whole week in one transaction: never half old, half new. */
export async function replaceHours(userId: string, input: HoursInput) {
  const artist = await myArtist(userId);
  await db.transaction(async (tx) => {
    // Lock her profile row first, so two saves at the same moment run one after the other.
    await tx.select({ id: artists.id }).from(artists).where(eq(artists.id, artist.id)).for("update");
    await tx.delete(artistWeeklyHours).where(eq(artistWeeklyHours.artistId, artist.id));
    if (input.hours.length > 0) {
      await tx.insert(artistWeeklyHours).values(input.hours.map((slot) => ({ ...slot, artistId: artist.id })));
    }
  });
  return getHours(userId);
}

export async function listTimeOff(userId: string) {
  const artist = await myArtist(userId);
  return db
    .select()
    .from(artistTimeOff)
    .where(and(eq(artistTimeOff.artistId, artist.id), gt(artistTimeOff.endsAt, new Date())))
    .orderBy(asc(artistTimeOff.startsAt));
}

/** Blocks out a period. Refused if confirmed bookings fall inside it: those must be handled first. */
export async function addTimeOff(userId: string, input: TimeOffInput) {
  const artist = await myArtist(userId);
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  const clashes = await db
    .select({ ref: bookings.ref })
    .from(bookings)
    .where(
      and(
        eq(bookings.artistId, artist.id),
        inArray(bookings.status, ["pending_payment", "confirmed", "in_progress"]),
        lt(bookings.startsAt, endsAt),
        gt(bookings.blockedUntil, startsAt),
      ),
    );
  if (clashes.length > 0) {
    throw conflict(
      "HAS_BOOKINGS",
      "You have bookings in that period. Cancel or move them first.",
      clashes.map((clash) => clash.ref),
    );
  }
  return one(
    await db.insert(artistTimeOff).values({ artistId: artist.id, startsAt, endsAt, reason: input.reason }).returning(),
  );
}

export async function removeTimeOff(userId: string, timeOffId: string) {
  const artist = await myArtist(userId);
  const removed = await db
    .delete(artistTimeOff)
    .where(and(eq(artistTimeOff.id, timeOffId), eq(artistTimeOff.artistId, artist.id)))
    .returning({ id: artistTimeOff.id });
  if (removed.length === 0) throw notFound("Time off");
}

export async function listPortfolio(userId: string) {
  const artist = await myArtist(userId);
  return db
    .select()
    .from(portfolioItems)
    .where(eq(portfolioItems.artistId, artist.id))
    .orderBy(asc(portfolioItems.sortOrder), desc(portfolioItems.createdAt));
}

export async function addPortfolioItem(userId: string, input: PortfolioInput) {
  const artist = await myArtist(userId);
  const imageUrl = imageUrlFor(input.publicId, "portfolio", userId);
  return one(
    await db
      .insert(portfolioItems)
      .values({
        artistId: artist.id,
        imageUrl,
        publicId: input.publicId,
        width: input.width,
        height: input.height,
        occasion: input.occasion,
        caption: input.caption,
      })
      .returning(),
  );
}

export async function updatePortfolioItem(userId: string, itemId: string, input: UpdatePortfolioInput) {
  const artist = await myArtist(userId);
  const [updated] = await db
    .update(portfolioItems)
    .set(input)
    .where(and(eq(portfolioItems.id, itemId), eq(portfolioItems.artistId, artist.id)))
    .returning();
  if (!updated) throw notFound("Photo");
  return updated;
}

export async function removePortfolioItem(userId: string, itemId: string) {
  const artist = await myArtist(userId);
  const removed = await db
    .delete(portfolioItems)
    .where(and(eq(portfolioItems.id, itemId), eq(portfolioItems.artistId, artist.id)))
    .returning({ id: portfolioItems.id });
  if (removed.length === 0) throw notFound("Photo");
}

export async function listArtistBookings(userId: string, tab: "upcoming" | "past" | "cancelled") {
  const artist = await myArtist(userId);
  const where = {
    upcoming: inArray(bookings.status, ["confirmed", "in_progress"]),
    past: eq(bookings.status, "completed"),
    cancelled: eq(bookings.status, "cancelled"),
  }[tab];

  return db
    .select({ ...bookingCardColumns, customer: { fullName: users.fullName, phone: users.phone } })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.customerId))
    .where(and(eq(bookings.artistId, artist.id), where))
    .orderBy(tab === "upcoming" ? asc(bookings.startsAt) : desc(bookings.startsAt))
    .limit(200);
}

/** Completed work in a date range (default: the last 30 days), before and after commission. */
export async function earnings(userId: string, from?: string, to?: string) {
  const artist = await myArtist(userId);
  const start = from ?? istDate(addDays(new Date(), -30));
  const end = to ?? istDate(new Date());

  const [row] = await db
    .select({
      bookings: count(),
      grossPaise: sql<number>`coalesce(sum(${bookings.totalPaise}), 0)`.mapWith(Number),
      // ::bigint first: integer × smallint stays an integer in Postgres and would overflow above ₹14 lakh.
      commissionPaise: sql<number>`coalesce(sum(round(${bookings.totalPaise}::bigint * ${bookings.commissionPercent} / 100.0)), 0)`.mapWith(Number),
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.artistId, artist.id),
        eq(bookings.status, "completed"),
        gte(bookings.startsAt, new Date(`${start}T00:00:00+05:30`)),
        lt(bookings.startsAt, addDays(new Date(`${end}T00:00:00+05:30`), 1)),
      ),
    );
  const gross = row?.grossPaise ?? 0;
  const commission = row?.commissionPaise ?? 0;
  return { from: start, to: end, bookings: row?.bookings ?? 0, grossPaise: gross, commissionPaise: commission, netPaise: gross - commission };
}
