import { z } from "zod";

// One definition drives the form errors now and can validate on the server later.

/** Ten digits starting 6–9: an Indian mobile number without the +91. */
export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number");

const passwordSchema = z.string().min(8, "At least 8 characters");

export const signInSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name"),
  phone: phoneSchema,
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
