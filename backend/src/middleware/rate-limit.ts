import { rateLimiter } from "hono-rate-limiter";
import { env } from "../config/env.ts";
import { AppError } from "../lib/errors.ts";
import { clientIp } from "../lib/http.ts";

/**
 * Counts requests per IP address in memory. Enough for one server; when you run
 * several, give each limiter a shared store (Redis) so they count together.
 */
const limit = (windowMinutes: number, max: number) =>
  rateLimiter({
    windowMs: windowMinutes * 60_000,
    limit: max,
    standardHeaders: "draft-7",
    keyGenerator: (c) => clientIp(c),
    skip: () => env.NODE_ENV === "test",
    handler: () => {
      throw new AppError(429, "TOO_MANY_REQUESTS", "Too many attempts. Please wait a few minutes.");
    },
  });

/** Sign-in, sign-up and password reset: 30 tries per 15 minutes per network. */
export const authLimiter = limit(15, 30);

/** Texting codes costs money: 5 per hour per network. */
export const otpLimiter = limit(60, 5);
