import { z } from "zod";
import { phoneSchema } from "../../lib/phone.ts";

export const createBookingSchema = z.object({
  artistId: z.uuid(),
  artistServiceIds: z.array(z.uuid()).min(1, "Pick at least one service").max(6, "At most 6 services"),
  startsAt: z.iso.datetime({ offset: true }),
  eventType: z.string().trim().min(2, "What is the occasion?").max(40),
  venue: z.string().trim().min(3, "Where should the artist come?").max(200),
  contactName: z.string().trim().min(2, "Please enter a name").max(80),
  contactPhone: phoneSchema,
  notes: z.string().trim().max(1000).optional(),
  /** A random id the app makes once per booking attempt, so a retried request cannot book twice. */
  idempotencyKey: z.uuid(),
});

export const cancelSchema = z.object({
  reason: z.string().trim().min(3, "Tell us briefly why").max(300),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const paymentSchema = z.object({ kind: z.enum(["advance", "balance"]) });

export const bookingTabQuery = z.object({
  tab: z.enum(["upcoming", "completed", "cancelled"]).default("upcoming"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingTab = z.infer<typeof bookingTabQuery>["tab"];
