import { aliasedTable, and, asc, count, desc, eq, gte, ilike, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { one } from "../../db/helpers.ts";
import {
  artistServices,
  artists,
  auditLogs,
  bookings,
  payments,
  portfolioItems,
  reviews,
  serviceCategories,
  services,
  users,
  type ArtistStatus,
} from "../../db/schema/index.ts";
import { PgCode, isPgError } from "../../lib/db-errors.ts";
import { conflict, notFound } from "../../lib/errors.ts";
import { offsetOf, paged, type PageQuery } from "../../lib/pagination.ts";
import { addDays, istDate } from "../../lib/time.ts";
import { revokeAllSessions } from "../auth/sessions.ts";
import type { AccessClaims } from "../auth/tokens.ts";
import { bookingCardColumns } from "../bookings/booking-detail.ts";
import { artistMenu, artistPortfolio } from "../catalogue/catalogue.service.ts";
import { ratingOf } from "../catalogue/artist-card.ts";
import { notify, type Message } from "../notifications/notify.ts";
import { imageUrlFor } from "../uploads/cloudinary.ts";
import { checklistFor } from "../artist-panel/artist.service.ts";
import type {
  ArtistsAdminQuery,
  BookingsAdminQuery,
  CategoryInput,
  CustomersQuery,
  PaymentsAdminQuery,
  ServiceInput,
} from "./admin.schemas.ts";
import { audit } from "./audit.ts";

const contains = (text: string) => `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

/** The first moment of this month, in Indian time. */
const monthStart = () => new Date(`${istDate(new Date()).slice(0, 7)}-01T00:00:00+05:30`);

export async function dashboard() {
  const since = monthStart();
  const [[customers], artistRows, bookingRows, [revenue], [upcoming]] = await Promise.all([
    db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, "customer"), eq(users.status, "active"))),
    db.select({ status: artists.status, value: count() }).from(artists).groupBy(artists.status),
    db
      .select({ status: bookings.status, value: count() })
      .from(bookings)
      .where(gte(bookings.createdAt, since))
      .groupBy(bookings.status),
    db
      .select({ value: sql<number>`coalesce(sum(${payments.amountPaise}), 0)`.mapWith(Number) })
      .from(payments)
      .where(and(eq(payments.status, "paid"), gte(payments.paidAt, since))),
    db
      .select({ value: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          gte(bookings.startsAt, new Date()),
          lt(bookings.startsAt, addDays(new Date(), 7)),
        ),
      ),
  ]);

  return {
    customers: customers?.value ?? 0,
    artistsByStatus: Object.fromEntries(artistRows.map((row) => [row.status, row.value])),
    bookingsThisMonthByStatus: Object.fromEntries(bookingRows.map((row) => [row.status, row.value])),
    collectedThisMonthPaise: revenue?.value ?? 0,
    confirmedNext7Days: upcoming?.value ?? 0,
  };
}

// ---------------------------------------------------------------- customers

export async function listCustomers(query: CustomersQuery) {
  const where = and(
    eq(users.role, "customer"),
    query.status ? eq(users.status, query.status) : ne(users.status, "deleted"),
    query.q ? or(ilike(users.fullName, contains(query.q)), ilike(users.phone, contains(query.q))) : undefined,
  );
  const bookingCount = sql<number>`(select count(*) from ${bookings} where ${bookings.customerId} = "users"."id")`.mapWith(Number);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        phone: users.phone,
        email: users.email,
        city: users.city,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        bookingCount,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db.select({ value: count() }).from(users).where(where),
  ]);
  return paged(rows, total?.value ?? 0, query);
}

export async function getCustomer(customerId: string) {
  const [customer] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      email: users.email,
      city: users.city,
      weddingDate: users.weddingDate,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(and(eq(users.id, customerId), eq(users.role, "customer")));
  if (!customer) throw notFound("Customer");

  const customerBookings = await db
    .select({ ...bookingCardColumns, studioName: artists.studioName })
    .from(bookings)
    .innerJoin(artists, eq(artists.id, bookings.artistId))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.startsAt))
    .limit(50);
  return { ...customer, bookings: customerBookings };
}

/** Suspending signs the person out everywhere; their next refresh fails. */
export async function setUserStatus(actor: AccessClaims, userId: string, status: "active" | "suspended", reason: string) {
  await db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ status })
      .where(and(eq(users.id, userId), ne(users.role, "admin"), ne(users.status, "deleted")))
      .returning({ id: users.id });
    if (!user) throw notFound("Account");
    if (status === "suspended") await revokeAllSessions(tx, userId);
    await audit(tx, actor.userId, `user.${status === "suspended" ? "suspend" : "reactivate"}`, { type: "user", id: userId }, { reason });
  });
}

// ---------------------------------------------------------------- artists

export async function listArtistsForAdmin(query: ArtistsAdminQuery) {
  const where = and(
    query.status ? eq(artists.status, query.status) : undefined,
    query.q
      ? or(
          ilike(artists.studioName, contains(query.q)),
          ilike(users.fullName, contains(query.q)),
          ilike(users.phone, contains(query.q)),
          ilike(artists.city, contains(query.q)),
        )
      : undefined,
  );

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: artists.id,
        slug: artists.slug,
        studioName: artists.studioName,
        artistName: users.fullName,
        phone: users.phone,
        email: users.email,
        city: artists.city,
        specialty: artists.specialty,
        status: artists.status,
        statusReason: artists.statusReason,
        isFeatured: artists.isFeatured,
        submittedAt: artists.submittedAt,
        createdAt: artists.createdAt,
        ratingSum: artists.ratingSum,
        ratingCount: artists.ratingCount,
      })
      .from(artists)
      .innerJoin(users, eq(users.id, artists.userId))
      .where(where)
      // Waiting for review first, oldest first: that is the admin's to-do list.
      .orderBy(sql`${artists.status} = 'pending_review' desc`, asc(artists.submittedAt), desc(artists.createdAt))
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db
      .select({ value: count() })
      .from(artists)
      .innerJoin(users, eq(users.id, artists.userId))
      .where(where),
  ]);

  const items = rows.map(({ ratingSum, ratingCount, ...artist }) => ({
    ...artist,
    rating: ratingOf(ratingSum, ratingCount),
    reviewCount: ratingCount,
  }));
  return paged(items, total?.value ?? 0, query);
}

export async function getArtistForAdmin(artistId: string) {
  const [row] = await db
    .select({ artist: artists, fullName: users.fullName, phone: users.phone, email: users.email, userStatus: users.status })
    .from(artists)
    .innerJoin(users, eq(users.id, artists.userId))
    .where(eq(artists.id, artistId));
  if (!row) throw notFound("Artist");

  const [menu, portfolio, checklist] = await Promise.all([
    artistMenu(artistId),
    artistPortfolio(artistId),
    checklistFor(row.artist),
  ]);
  return { ...row.artist, fullName: row.fullName, phone: row.phone, email: row.email, userStatus: row.userStatus, services: menu, portfolio, checklist };
}

/** Moves an artist between statuses, only from the statuses that make sense, with an audit entry and a message. */
async function moveArtist(
  actor: AccessClaims,
  artistId: string,
  allowedFrom: ArtistStatus[],
  to: ArtistStatus,
  reason: string | null,
  message: Message,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ status: artists.status }).from(artists).where(eq(artists.id, artistId)).for("update");
    if (!current) throw notFound("Artist");
    if (!allowedFrom.includes(current.status)) {
      throw conflict("WRONG_STATUS", `This artist is ${current.status.replace("_", " ")}.`);
    }

    const artist = one(
      await tx
        .update(artists)
        .set({
          status: to,
          statusReason: reason,
          ...(to === "approved" ? { approvedAt: new Date(), approvedBy: actor.userId } : {}),
        })
        .where(eq(artists.id, artistId))
        .returning(),
    );
    await audit(tx, actor.userId, `artist.${to}`, { type: "artist", id: artistId }, reason ? { reason } : undefined);
    await notify(tx, [artist.userId], message);
    return artist;
  });
}

export const approveArtist = (actor: AccessClaims, artistId: string) =>
  moveArtist(actor, artistId, ["pending_review"], "approved", null, {
    title: "You are live on Saaj",
    body: "Your profile was approved. Brides can now find and book you.",
  });

export const rejectArtist = (actor: AccessClaims, artistId: string, reason: string) =>
  moveArtist(actor, artistId, ["pending_review"], "rejected", reason, {
    title: "Your profile needs changes",
    body: reason,
  });

export const suspendArtist = (actor: AccessClaims, artistId: string, reason: string) =>
  moveArtist(actor, artistId, ["approved"], "suspended", reason, {
    title: "Your profile is paused",
    body: reason,
  });

export const reinstateArtist = (actor: AccessClaims, artistId: string) =>
  moveArtist(actor, artistId, ["suspended"], "approved", null, {
    title: "Your profile is live again",
    body: "Brides can find and book you again.",
  });

export async function setArtistFeatured(actor: AccessClaims, artistId: string, isFeatured: boolean) {
  await db.transaction(async (tx) => {
    const [artist] = await tx.update(artists).set({ isFeatured }).where(eq(artists.id, artistId)).returning({ id: artists.id });
    if (!artist) throw notFound("Artist");
    await audit(tx, actor.userId, "artist.feature", { type: "artist", id: artistId }, { isFeatured });
  });
}

// ---------------------------------------------------------------- catalogue

const slugTaken = (error: unknown) =>
  isPgError(error, PgCode.uniqueViolation) ? conflict("SLUG_TAKEN", "That slug or name is already used.") : error;

export const listAllCategories = () =>
  db.select().from(serviceCategories).orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));

export async function saveCategory(actor: AccessClaims, input: Partial<CategoryInput>, categoryId?: string) {
  try {
    return await db.transaction(async (tx) => {
      const [category] = categoryId
        ? await tx.update(serviceCategories).set(input).where(eq(serviceCategories.id, categoryId)).returning()
        : await tx.insert(serviceCategories).values(input as CategoryInput).returning();
      if (!category) throw notFound("Category");
      await audit(tx, actor.userId, categoryId ? "category.update" : "category.create", { type: "category", id: category.id }, input);
      return category;
    });
  } catch (error) {
    throw slugTaken(error);
  }
}

export function listAllServices() {
  const offeringCount = sql<number>`(select count(*) from ${artistServices} where ${artistServices.serviceId} = ${services.id} and ${artistServices.isActive})`.mapWith(Number);
  return db
    .select({ service: services, category: serviceCategories.name, offeringCount })
    .from(services)
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .orderBy(asc(serviceCategories.sortOrder), asc(services.sortOrder));
}

export async function saveService(actor: AccessClaims, input: Partial<ServiceInput>, serviceId?: string) {
  const { imagePublicId, ...fields } = input;
  const values = {
    ...fields,
    ...(imagePublicId ? { imageUrl: imageUrlFor(imagePublicId, "service", actor.userId) } : {}),
  };
  try {
    return await db.transaction(async (tx) => {
      const [service] = serviceId
        ? await tx.update(services).set(values).where(eq(services.id, serviceId)).returning()
        : await tx.insert(services).values(values as ServiceInput).returning();
      if (!service) throw notFound("Service");
      await audit(tx, actor.userId, serviceId ? "service.update" : "service.create", { type: "service", id: service.id }, fields);
      return service;
    });
  } catch (error) {
    if (isPgError(error, PgCode.foreignKeyViolation)) throw notFound("Category");
    throw slugTaken(error);
  }
}

// ---------------------------------------------------------------- bookings, payments, reviews

const customer = aliasedTable(users, "customer");

export async function listBookingsForAdmin(query: BookingsAdminQuery) {
  const conditions: (SQL | undefined)[] = [
    query.status ? eq(bookings.status, query.status) : undefined,
    query.artistId ? eq(bookings.artistId, query.artistId) : undefined,
    query.from ? gte(bookings.startsAt, new Date(`${query.from}T00:00:00+05:30`)) : undefined,
    query.to ? lt(bookings.startsAt, addDays(new Date(`${query.to}T00:00:00+05:30`), 1)) : undefined,
    query.q
      ? or(
          ilike(bookings.ref, contains(query.q)),
          ilike(customer.fullName, contains(query.q)),
          ilike(customer.phone, contains(query.q)),
        )
      : undefined,
  ];
  const where = and(...conditions);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        ...bookingCardColumns,
        customer: { id: customer.id, fullName: customer.fullName, phone: customer.phone },
        artist: { id: artists.id, studioName: artists.studioName },
      })
      .from(bookings)
      .innerJoin(customer, eq(customer.id, bookings.customerId))
      .innerJoin(artists, eq(artists.id, bookings.artistId))
      .where(where)
      .orderBy(desc(bookings.startsAt))
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db
      .select({ value: count() })
      .from(bookings)
      .innerJoin(customer, eq(customer.id, bookings.customerId))
      .where(where),
  ]);
  return paged(rows, total?.value ?? 0, query);
}

export async function listPaymentsForAdmin(query: PaymentsAdminQuery) {
  const where = query.status ? eq(payments.status, query.status) : undefined;
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: payments.id,
        kind: payments.kind,
        amountPaise: payments.amountPaise,
        status: payments.status,
        method: payments.method,
        razorpayOrderId: payments.razorpayOrderId,
        razorpayPaymentId: payments.razorpayPaymentId,
        failureReason: payments.failureReason,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        booking: { id: bookings.id, ref: bookings.ref, title: bookings.title },
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db.select({ value: count() }).from(payments).where(where),
  ]);
  return paged(rows, total?.value ?? 0, query);
}

export async function listReviewsForAdmin(query: PageQuery) {
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        isPublished: reviews.isPublished,
        createdAt: reviews.createdAt,
        customerName: users.fullName,
        artist: { id: artists.id, studioName: artists.studioName },
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.customerId))
      .innerJoin(artists, eq(artists.id, reviews.artistId))
      .orderBy(desc(reviews.createdAt))
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db.select({ value: count() }).from(reviews),
  ]);
  return paged(rows, total?.value ?? 0, query);
}

/** Hides or shows a review, then recounts the artist's rating from published reviews only. */
export async function moderateReview(actor: AccessClaims, reviewId: string, isPublished: boolean) {
  await db.transaction(async (tx) => {
    const [review] = await tx.update(reviews).set({ isPublished }).where(eq(reviews.id, reviewId)).returning();
    if (!review) throw notFound("Review");
    const published = and(eq(reviews.artistId, review.artistId), eq(reviews.isPublished, true));
    await tx
      .update(artists)
      .set({
        ratingSum: sql`(select coalesce(sum(${reviews.rating}), 0) from ${reviews} where ${published})`,
        ratingCount: sql`(select count(*) from ${reviews} where ${published})`,
      })
      .where(eq(artists.id, review.artistId));
    await audit(tx, actor.userId, isPublished ? "review.publish" : "review.hide", { type: "review", id: reviewId });
  });
}

export async function setPortfolioFeatured(actor: AccessClaims, itemId: string, isFeatured: boolean) {
  await db.transaction(async (tx) => {
    const [item] = await tx.update(portfolioItems).set({ isFeatured }).where(eq(portfolioItems.id, itemId)).returning();
    if (!item) throw notFound("Photo");
    await audit(tx, actor.userId, "portfolio.feature", { type: "portfolio_item", id: itemId }, { isFeatured });
  });
}

export async function listAuditLogs(query: PageQuery) {
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        meta: auditLogs.meta,
        createdAt: auditLogs.createdAt,
        actorName: users.fullName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db.select({ value: count() }).from(auditLogs),
  ]);
  return paged(rows, total?.value ?? 0, query);
}
