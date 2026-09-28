import { z } from "zod";
import { NOTHING_TO_CHANGE, hasSomethingToChange } from "../../lib/validate.ts";

export const updateMeSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your name").max(80),
    email: z.string().trim().toLowerCase().pipe(z.email("That does not look like an email address")).nullable(),
    city: z.string().trim().min(2).max(60).nullable(),
    weddingDate: z.iso.date().nullable(),
    /** Set after uploading a photo to Cloudinary; null removes the photo. */
    avatarPublicId: z.string().min(1).max(300).nullable(),
  })
  .partial()
  .refine(hasSomethingToChange, NOTHING_TO_CHANGE);

export const pushTokenSchema = z.object({
  token: z.string().min(10).max(300),
  platform: z.enum(["android", "ios", "web"]).optional(),
});

export const markReadSchema = z.object({
  /** Leave out to mark every notification read. */
  ids: z.array(z.uuid()).max(100).optional(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
