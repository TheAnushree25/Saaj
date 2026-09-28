import { z } from "zod";

/**
 * Accepts what people actually type ("98765 43210", "+91 98765-43210",
 * "09876543210") and stores one canonical form: "+919876543210" (E.164).
 * The rule matches the app's own schema: 10 digits, starting 6 to 9.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/\D/g, "").replace(/^(?:91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"))
  .transform((tenDigits) => `+91${tenDigits}`);

/** "+919876543210" -> "98765 43210", for messages and admin screens. */
export function formatPhone(e164: string): string {
  const local = e164.replace(/^\+91/, "");
  return `${local.slice(0, 5)} ${local.slice(5)}`;
}
