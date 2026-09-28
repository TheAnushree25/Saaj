import { z } from "zod";
import { occasion } from "../../db/schema/index.ts";
import { pageQuery } from "../../lib/pagination.ts";

const text = (max: number) => z.string().trim().min(1).max(max);

export const servicesQuery = z.object({
  category: text(60).optional(),
  sort: z.enum(["popular", "price_low", "price_high"]).default("popular"),
});

export const artistsQuery = pageQuery.extend({
  q: text(60).optional(),
  city: text(60).optional(),
  service: text(80).optional(),
  sort: z.enum(["recommended", "rating", "price_low", "price_high", "experience"]).default("recommended"),
});

export const looksQuery = z.object({
  occasion: z.enum(occasion.enumValues).optional(),
  onePerArtist: z.stringbool().default(false),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export const searchQuery = z.object({
  q: z.string().trim().min(2, "Type at least 2 letters").max(60),
});

export const idParam = z.object({ id: z.uuid("That is not a valid id") });

/** "?services=<id>,<id>": the artist's services the bride has picked. */
const serviceIds = z
  .string()
  .transform((value) => value.split(",").filter(Boolean))
  .pipe(z.array(z.uuid()).min(1, "Pick at least one service").max(6, "At most 6 services"));

export const slotsQuery = z.object({ date: z.iso.date(), services: serviceIds });

export const calendarQuery = z.object({
  from: z.iso.date(),
  days: z.coerce.number().int().min(1).max(31).default(14),
  services: serviceIds,
});

export type ArtistsQuery = z.infer<typeof artistsQuery>;
export type ServicesQuery = z.infer<typeof servicesQuery>;
export type LooksQuery = z.infer<typeof looksQuery>;
