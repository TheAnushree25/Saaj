import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { artists } from "./artists.ts";
import { createdAt, id, timestamps } from "./columns.ts";

export const serviceCategories = pgTable("service_categories", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull().unique(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
});

/** The platform's menu, managed by the admin: "Bridal Makeup", "Saree Draping"... */
export const services = pgTable(
  "services",
  {
    id: id(),
    categoryId: uuid()
      .notNull()
      .references(() => serviceCategories.id),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text(),
    inclusions: text().array().notNull().default(sql`'{}'::text[]`),
    imageUrl: text(),
    defaultDurationMinutes: integer().notNull(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    index().on(t.categoryId),
    check("services_duration_check", sql`${t.defaultDurationMinutes} > 0`),
  ],
);

/** What one artist offers from that menu, at her own price and pace. */
export const artistServices = pgTable(
  "artist_services",
  {
    id: id(),
    artistId: uuid()
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    serviceId: uuid()
      .notNull()
      .references(() => services.id),
    pricePaise: integer().notNull(),
    durationMinutes: integer().notNull(),
    bufferMinutes: integer().notNull().default(30),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex().on(t.artistId, t.serviceId),
    index().on(t.serviceId),
    check("artist_services_price_check", sql`${t.pricePaise} >= 0`),
    check("artist_services_duration_check", sql`${t.durationMinutes} > 0`),
    check("artist_services_buffer_check", sql`${t.bufferMinutes} >= 0`),
  ],
);
