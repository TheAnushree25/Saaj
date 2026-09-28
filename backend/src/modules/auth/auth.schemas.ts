import { z } from "zod";
import { phoneSchema } from "../../lib/phone.ts";

// The same rules and messages as the app's src/features/auth/schemas.ts, so a
// form that passes on the phone also passes here. The server checks again
// because anyone can call the API without the app.
const fullName = z.string().trim().min(2, "Please enter your name").max(80, "That name is too long");
const password = z.string().min(8, "At least 8 characters").max(128, "At most 128 characters");
const email = z.string().trim().toLowerCase().pipe(z.email("That does not look like an email address"));

export const registerSchema = z.object({
  fullName,
  phone: phoneSchema,
  password,
  email: email.optional(),
});

export const artistRegisterSchema = z.object({
  fullName,
  phone: phoneSchema,
  password,
  email,
  studioName: z.string().trim().min(2, "Enter your studio or brand name").max(80),
  specialty: z.string().trim().min(2, "What do you specialise in?").max(60),
  city: z.string().trim().min(2, "Which city are you based in?").max(60),
  experienceYears: z.coerce.number().int().min(0).max(60),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

/** Mobile sends the refresh token in the body; web panels send it as a cookie instead. */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20).max(200).optional(),
});

export const forgotPasswordSchema = z.object({ phone: phoneSchema });

export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  newPassword: password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(128),
  newPassword: password,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ArtistRegisterInput = z.infer<typeof artistRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
