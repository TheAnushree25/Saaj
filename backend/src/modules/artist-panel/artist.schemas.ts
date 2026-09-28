import { z } from "zod";
import { occasion } from "../../db/schema/index.ts";
import { NOTHING_TO_CHANGE, hasSomethingToChange } from "../../lib/validate.ts";

const publicId = z.string().min(1).max(300);

export const updateProfileSchema = z
  .object({
    studioName: z.string().trim().min(2).max(80),
    specialty: z.string().trim().min(2).max(60),
    tagline: z.string().trim().max(120).nullable(),
    bio: z.string().trim().max(2000).nullable(),
    city: z.string().trim().min(2).max(60),
    area: z.string().trim().max(80).nullable(),
    experienceYears: z.number().int().min(0).max(60),
    instagram: z.string().trim().regex(/^@?[A-Za-z0-9._]{1,30}$/, "Enter an Instagram handle").nullable(),
    travelsToVenue: z.boolean(),
    profilePublicId: publicId.nullable(),
    coverPublicId: publicId.nullable(),
  })
  .partial()
  .refine(hasSomethingToChange, NOTHING_TO_CHANGE);

const offeringFields = z.object({
  serviceId: z.uuid(),
  pricePaise: z.number().int().min(100, "The lowest price is ₹1").max(100_000_000),
  durationMinutes: z.number().int().min(15).max(720),
  bufferMinutes: z.number().int().min(0).max(240),
});

/** Adding a service: the travel buffer defaults to 30 minutes. */
export const offeringSchema = offeringFields.extend({
  bufferMinutes: offeringFields.shape.bufferMinutes.default(30),
});

// Editing starts from the fields WITHOUT defaults: in Zod 4, .partial() still fills
// in .default() values, so changing only the price would reset the buffer to 30.
export const updateOfferingSchema = offeringFields
  .omit({ serviceId: true })
  .extend({ isActive: z.boolean() })
  .partial()
  .refine(hasSomethingToChange, NOTHING_TO_CHANGE);

// Accepts "09:30" (and "09:30:00", the form Postgres uses) and keeps "09:30".
const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/, "Use 24-hour time like 09:30")
  .transform((time) => time.slice(0, 5));

export const hoursSchema = z
  .object({
    hours: z
      .array(z.object({ weekday: z.number().int().min(0).max(6), startTime: clock, endTime: clock }))
      .max(21),
  })
  .superRefine(({ hours }, ctx) => {
    hours.forEach((slot, i) => {
      if (slot.endTime <= slot.startTime) {
        ctx.addIssue({ code: "custom", path: ["hours", i, "endTime"], message: "Must end after it starts" });
      }
      // "HH:MM" strings compare correctly as text, so overlaps can be checked directly.
      const overlaps = hours.some(
        (other, j) => j !== i && other.weekday === slot.weekday && other.startTime < slot.endTime && slot.startTime < other.endTime,
      );
      if (overlaps) {
        ctx.addIssue({ code: "custom", path: ["hours", i], message: "Overlaps another window that day" });
      }
    });
  });

export const timeOffSchema = z
  .object({
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "Must end after it starts",
    path: ["endsAt"],
  });

export const portfolioSchema = z.object({
  publicId,
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  occasion: z.enum(occasion.enumValues).optional(),
  caption: z.string().trim().max(200).optional(),
});

export const updatePortfolioSchema = z
  .object({
    occasion: z.enum(occasion.enumValues).nullable(),
    caption: z.string().trim().max(200).nullable(),
    sortOrder: z.number().int().min(0).max(10_000),
  })
  .partial()
  .refine(hasSomethingToChange, NOTHING_TO_CHANGE);

export const artistBookingsQuery = z.object({
  tab: z.enum(["upcoming", "past", "cancelled"]).default("upcoming"),
});

export const earningsQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type OfferingInput = z.infer<typeof offeringSchema>;
export type UpdateOfferingInput = z.infer<typeof updateOfferingSchema>;
export type HoursInput = z.infer<typeof hoursSchema>;
export type TimeOffInput = z.infer<typeof timeOffSchema>;
export type PortfolioInput = z.infer<typeof portfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
