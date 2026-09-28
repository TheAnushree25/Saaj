import { z } from "zod";
import { phoneSchema } from "@/features/auth/schemas";

/** Step three of booking. The same rules as the API's, so most mistakes are caught before sending. */
export const bookingDetailsSchema = z.object({
  contactName: z.string().trim().min(2, "Please enter a name").max(80),
  contactPhone: phoneSchema,
  eventType: z.string().trim().min(2, "What is the occasion?").max(40),
  venue: z.string().trim().min(3, "Where should the artist come?").max(200),
  notes: z.string().trim().max(1000, "Please keep notes under 1000 characters"),
});

export type BookingDetailsInput = z.infer<typeof bookingDetailsSchema>;
