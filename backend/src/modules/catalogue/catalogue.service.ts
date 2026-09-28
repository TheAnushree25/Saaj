import { and, asc, count, desc, eq, gte, ilike, inArray, min, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.ts";
import {
  artistServices,
  artists,
  bookingItems,
  bookings,
  portfolioItems,
  reviews,
  serviceCategories,
  services,
  users,
} from "../../db/schema/index.ts";
import { notFound } from "../../lib/errors.ts";
import { offsetOf, paged, type PageQuery } from "../../lib/pagination.ts";
import { IST } from "../../lib/time.ts";
import {
  artistCardColumns,
  artistPrices,
  isVisibleArtist,
  selectArtistCards,
  toArtistCard,
} from "./artist-card.ts";
import type { ArtistsQuery, LooksQuery, ServicesQuery } from "./catalogue.schemas.ts";

/** "rhea" -> "%rhea%" for ILIKE, with % and _ in the input treated as plain characters. */
const contains = (text: string) => `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

/** Highest average rating first; artists nobody has reviewed yet go last. */
const byRating = sql`${artists.ratingSum}::float / nullif(${artists.ratingCount}, 0) desc nulls last`;

export function listCategories() {
  return db
    .select({ slug: serviceCategories.slug, name: serviceCategories.name })
    .from(serviceCategories)
    .where(eq(serviceCategories.isActive, true))
    .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));
}

/** For each service: its cheapest price among visible artists, and how many offer it. */
const serviceOffers = db
  .select({
    serviceId: artistServices.serviceId,
    fromPricePaise: min(artistServices.pricePaise).as("from_price_paise"),
    artistCount: count().as("artist_count"),
  })
  .from(artistServices)
  .innerJoin(artists, eq(artists.id, artistServices.artistId))
  .innerJoin(users, eq(users.id, artists.userId))
  .where(and(eq(artistServices.isActive, true), isVisibleArtist))
  .groupBy(artistServices.serviceId)
  .as("service_offers");

/** Bookings per service over the last 180 days: what "Popular" sorts by. */
const servicePopularity = db
  .select({ serviceId: bookingItems.serviceId, bookingCount: count().as("booking_count") })
  .from(bookingItems)
  .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
  .where(
    and(
      inArray(bookings.status, ["confirmed", "in_progress", "completed"]),
      gte(bookings.createdAt, sql`now() - interval '180 days'`),
    ),
  )
  .groupBy(bookingItems.serviceId)
  .as("service_popularity");

const bookingCount = sql<number>`coalesce(${servicePopularity.bookingCount}, 0)`.mapWith(Number);

const serviceColumns = {
  id: services.id,
  slug: services.slug,
  name: services.name,
  description: services.description,
  inclusions: services.inclusions,
  imageUrl: services.imageUrl,
  durationMinutes: services.defaultDurationMinutes,
  category: { slug: serviceCategories.slug, name: serviceCategories.name },
  fromPricePaise: serviceOffers.fromPricePaise,
  artistCount: serviceOffers.artistCount,
  bookingCount,
};

/** Services that at least one visible artist offers. The rest cannot be booked, so they are hidden. */
const selectServices = () =>
  db
    .select(serviceColumns)
    .from(services)
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .innerJoin(serviceOffers, eq(serviceOffers.serviceId, services.id))
    .leftJoin(servicePopularity, eq(servicePopularity.serviceId, services.id));

export function listServices(query: ServicesQuery) {
  const order = {
    popular: [desc(bookingCount), asc(services.sortOrder)],
    price_low: [asc(serviceOffers.fromPricePaise)],
    price_high: [desc(serviceOffers.fromPricePaise)],
  }[query.sort];

  return selectServices()
    .where(
      and(
        eq(services.isActive, true),
        eq(serviceCategories.isActive, true),
        query.category ? eq(serviceCategories.slug, query.category) : undefined,
      ),
    )
    .orderBy(...order, asc(services.name));
}

export async function getService(slug: string) {
  const [service] = await selectServices().where(and(eq(services.slug, slug), eq(services.isActive, true)));
  if (!service) throw notFound("Service");

  const offering = await db
    .select({
      ...artistCardColumns,
      artistServiceId: artistServices.id,
      pricePaise: artistServices.pricePaise,
      durationMinutes: artistServices.durationMinutes,
    })
    .from(artistServices)
    .innerJoin(artists, eq(artists.id, artistServices.artistId))
    .innerJoin(users, eq(users.id, artists.userId))
    .innerJoin(artistPrices, eq(artistPrices.artistId, artists.id))
    .where(and(eq(artistServices.serviceId, service.id), eq(artistServices.isActive, true), isVisibleArtist))
    .orderBy(desc(artists.isFeatured), byRating)
    .limit(20);

  return { ...service, artists: offering.map(toArtistCard) };
}

export async function listArtists(query: ArtistsQuery) {
  const offersService = (slug: string) =>
    inArray(
      artists.id,
      db
        .select({ id: artistServices.artistId })
        .from(artistServices)
        .innerJoin(services, eq(services.id, artistServices.serviceId))
        .where(and(eq(services.slug, slug), eq(artistServices.isActive, true))),
    );

  const filters = and(
    isVisibleArtist,
    query.city ? ilike(artists.city, contains(query.city)) : undefined,
    query.q
      ? or(
          ilike(artists.studioName, contains(query.q)),
          ilike(users.fullName, contains(query.q)),
          ilike(artists.specialty, contains(query.q)),
          ilike(artists.city, contains(query.q)),
        )
      : undefined,
    query.service ? offersService(query.service) : undefined,
  );

  const order = {
    recommended: [desc(artists.isFeatured), byRating, desc(artists.ratingCount)],
    rating: [byRating, desc(artists.ratingCount)],
    price_low: [asc(artistPrices.fromPricePaise)],
    price_high: [desc(artistPrices.fromPricePaise)],
    experience: [desc(artists.experienceYears)],
  }[query.sort];

  const [rows, [total]] = await Promise.all([
    selectArtistCards()
      .where(filters)
      .orderBy(...order, asc(artists.studioName))
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db
      .select({ value: count() })
      .from(artists)
      .innerJoin(users, eq(users.id, artists.userId))
      .innerJoin(artistPrices, eq(artistPrices.artistId, artists.id))
      .where(filters),
  ]);

  return paged(rows.map(toArtistCard), total?.value ?? 0, query);
}

/** The artist's own menu: each service she offers, at her price and duration. */
export function artistMenu(artistId: string) {
  return db
    .select({
      artistServiceId: artistServices.id,
      serviceId: services.id,
      slug: services.slug,
      name: services.name,
      description: services.description,
      inclusions: services.inclusions,
      imageUrl: services.imageUrl,
      category: serviceCategories.name,
      pricePaise: artistServices.pricePaise,
      durationMinutes: artistServices.durationMinutes,
    })
    .from(artistServices)
    .innerJoin(services, eq(services.id, artistServices.serviceId))
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .where(
      and(
        eq(artistServices.artistId, artistId),
        eq(artistServices.isActive, true),
        eq(services.isActive, true),
      ),
    )
    .orderBy(asc(services.sortOrder), asc(artistServices.pricePaise));
}

export function artistPortfolio(artistId: string) {
  return db
    .select({
      id: portfolioItems.id,
      imageUrl: portfolioItems.imageUrl,
      width: portfolioItems.width,
      height: portfolioItems.height,
      occasion: portfolioItems.occasion,
      caption: portfolioItems.caption,
    })
    .from(portfolioItems)
    .where(eq(portfolioItems.artistId, artistId))
    .orderBy(asc(portfolioItems.sortOrder), desc(portfolioItems.createdAt))
    .limit(60);
}

export async function getArtist(idOrSlug: string) {
  const byId = z.uuid().safeParse(idOrSlug).success;
  const [row] = await db
    .select({
      ...artistCardColumns,
      bio: artists.bio,
      area: artists.area,
      instagram: artists.instagram,
      travelsToVenue: artists.travelsToVenue,
    })
    .from(artists)
    .innerJoin(users, eq(users.id, artists.userId))
    .innerJoin(artistPrices, eq(artistPrices.artistId, artists.id))
    .where(and(isVisibleArtist, byId ? eq(artists.id, idOrSlug) : eq(artists.slug, idOrSlug)));
  if (!row) throw notFound("Artist");

  const [menu, portfolio, latest] = await Promise.all([
    artistMenu(row.id),
    artistPortfolio(row.id),
    listReviews(row.id, { page: 1, pageSize: 3 }),
  ]);
  return { ...toArtistCard(row), services: menu, portfolio, reviews: latest.items };
}

const monthName = new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: IST });

/** "Mira Sharma" -> "Mira S.": enough to feel real, without publishing a full name. */
function shortName(fullName: string) {
  const [first = "", last = ""] = fullName.trim().split(/\s+/);
  return last ? `${first} ${last.charAt(0)}.` : first;
}

export async function listReviews(artistId: string, query: PageQuery) {
  const where = and(eq(reviews.artistId, artistId), eq(reviews.isPublished, true));
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        customerName: users.fullName,
        eventDate: bookings.startsAt,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.customerId))
      .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
      .where(where)
      .orderBy(desc(reviews.createdAt))
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db.select({ value: count() }).from(reviews).where(where),
  ]);

  const items = rows.map(({ customerName, eventDate, ...review }) => ({
    ...review,
    author: shortName(customerName),
    occasion: `${monthName.format(eventDate)} bride`,
  }));
  return paged(items, total?.value ?? 0, query);
}

/** Portfolio photos across artists, for Trending looks and the Explore reels. */
export async function listLooks(query: LooksQuery) {
  const columns = {
    id: portfolioItems.id,
    imageUrl: portfolioItems.imageUrl,
    width: portfolioItems.width,
    height: portfolioItems.height,
    occasion: portfolioItems.occasion,
    caption: portfolioItems.caption,
    isFeatured: portfolioItems.isFeatured,
    artist: {
      id: artists.id,
      slug: artists.slug,
      studioName: artists.studioName,
      city: artists.city,
      tagline: artists.tagline,
      profileImageUrl: artists.profileImageUrl,
      ratingSum: artists.ratingSum,
      ratingCount: artists.ratingCount,
    },
  };
  const filters = and(isVisibleArtist, query.occasion ? eq(portfolioItems.occasion, query.occasion) : undefined);

  const rows = query.onePerArtist
    ? await db
        .selectDistinctOn([portfolioItems.artistId], columns)
        .from(portfolioItems)
        .innerJoin(artists, eq(artists.id, portfolioItems.artistId))
        .innerJoin(users, eq(users.id, artists.userId))
        .where(filters)
        .orderBy(portfolioItems.artistId, desc(portfolioItems.isFeatured), asc(portfolioItems.sortOrder))
        .limit(query.limit)
    : await db
        .select(columns)
        .from(portfolioItems)
        .innerJoin(artists, eq(artists.id, portfolioItems.artistId))
        .innerJoin(users, eq(users.id, artists.userId))
        .where(filters)
        .orderBy(desc(portfolioItems.isFeatured), desc(portfolioItems.createdAt))
        .limit(query.limit);

  return rows
    .map(({ artist, ...look }) => ({ ...look, artist: toArtistCard(artist) }))
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
}

export async function search(q: string) {
  const like = contains(q);
  const [artistsFound, servicesFound] = await Promise.all([
    selectArtistCards()
      .where(
        and(
          isVisibleArtist,
          or(
            ilike(artists.studioName, like),
            ilike(users.fullName, like),
            ilike(artists.specialty, like),
            ilike(artists.city, like),
          ),
        ),
      )
      .orderBy(byRating)
      .limit(5),
    selectServices()
      .where(and(eq(services.isActive, true), ilike(services.name, like)))
      .orderBy(desc(bookingCount))
      .limit(5),
  ]);
  return { artists: artistsFound.map(toArtistCard), services: servicesFound };
}
