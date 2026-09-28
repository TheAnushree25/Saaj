import { z } from "zod";
import { artistStatus, bookingStatus, paymentStatus } from "../../db/schema/index.ts";
import { pageQuery } from "../../lib/pagination.ts";
import { NOTHING_TO_CHANGE, hasSomethingToChange } from "../../lib/validate.ts";

const search = z.string().trim().min(1).max(80).optional();

export const customersQuery = pageQuery.extend({
  q: search,
  status: z.enum(["active", "suspended"]).optional(),
});

export const artistsAdminQuery = pageQuery.extend({
  q: search,
  status: z.enum(artistStatus.enumValues).optional(),
});

export const bookingsAdminQuery = pageQuery.extend({
  q: search,
  status: z.enum(bookingStatus.enumValues).optional(),
  artistId: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const paymentsAdminQuery = pageQuery.extend({
  status: z.enum(paymentStatus.enumValues).optional(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
});

export const artistFlagsSchema = z.object({ isFeatured: z.boolean() });

// Each record has one set of field rules. Creating adds defaults for the fields
// you may leave out. Editing uses the rules WITHOUT defaults: in Zod 4, .partial()
// still fills in .default() values, which would silently reset untouched fields.
const categoryFields = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, "Lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2).max(40),
  sortOrder: z.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

export const categorySchema = categoryFields.extend({
  sortOrder: categoryFields.shape.sortOrder.default(0),
  isActive: categoryFields.shape.isActive.default(true),
});

export const categoryUpdateSchema = categoryFields.partial().refine(hasSomethingToChange, NOTHING_TO_CHANGE);

const serviceFields = z.object({
  categoryId: z.uuid(),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "Lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(1000).optional(),
  inclusions: z.array(z.string().trim().min(1).max(60)).max(12),
  defaultDurationMinutes: z.number().int().min(15).max(720),
  sortOrder: z.number().int().min(0).max(1000),
  isActive: z.boolean(),
  imagePublicId: z.string().min(1).max(300).optional(),
});

export const serviceSchema = serviceFields.extend({
  inclusions: serviceFields.shape.inclusions.default([]),
  sortOrder: serviceFields.shape.sortOrder.default(0),
  isActive: serviceFields.shape.isActive.default(true),
});

export const serviceUpdateSchema = serviceFields.partial().refine(hasSomethingToChange, NOTHING_TO_CHANGE);

export const reviewModerationSchema = z.object({ isPublished: z.boolean() });
export const featureSchema = z.object({ isFeatured: z.boolean() });

export type CustomersQuery = z.infer<typeof customersQuery>;
export type ArtistsAdminQuery = z.infer<typeof artistsAdminQuery>;
export type BookingsAdminQuery = z.infer<typeof bookingsAdminQuery>;
export type PaymentsAdminQuery = z.infer<typeof paymentsAdminQuery>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
