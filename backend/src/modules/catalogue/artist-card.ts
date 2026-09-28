import { and, eq, min } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { artistServices, artists, services, users } from "../../db/schema/index.ts";

/** Brides only ever see approved artists whose accounts are active. */
export const isVisibleArtist = and(eq(artists.status, "approved"), eq(users.status, "active"));

/** Each artist's lowest active price: the "from ₹X" on her card. */
export const artistPrices = db
  .select({
    artistId: artistServices.artistId,
    fromPricePaise: min(artistServices.pricePaise).as("from_price_paise"),
  })
  .from(artistServices)
  .innerJoin(services, eq(services.id, artistServices.serviceId))
  .where(and(eq(artistServices.isActive, true), eq(services.isActive, true)))
  .groupBy(artistServices.artistId)
  .as("artist_prices");

/** The fields every artist card shows, in the app and the admin panel alike. */
export const artistCardColumns = {
  id: artists.id,
  slug: artists.slug,
  studioName: artists.studioName,
  artistName: users.fullName,
  specialty: artists.specialty,
  city: artists.city,
  experienceYears: artists.experienceYears,
  tagline: artists.tagline,
  profileImageUrl: artists.profileImageUrl,
  coverImageUrl: artists.coverImageUrl,
  isFeatured: artists.isFeatured,
  ratingSum: artists.ratingSum,
  ratingCount: artists.ratingCount,
  fromPricePaise: artistPrices.fromPricePaise,
};

/** Artists joined to their account and lowest price. Only artists with a bookable service appear. */
export const selectArtistCards = () =>
  db
    .select(artistCardColumns)
    .from(artists)
    .innerJoin(users, eq(users.id, artists.userId))
    .innerJoin(artistPrices, eq(artistPrices.artistId, artists.id));

/** 4.9, rounded to one decimal, or null when nobody has reviewed yet. */
export const ratingOf = (sum: number, count: number) =>
  count > 0 ? Math.round((sum / count) * 10) / 10 : null;

export function toArtistCard<T extends { ratingSum: number; ratingCount: number }>(row: T) {
  const { ratingSum, ratingCount, ...card } = row;
  return { ...card, rating: ratingOf(ratingSum, ratingCount), reviewCount: ratingCount };
}
