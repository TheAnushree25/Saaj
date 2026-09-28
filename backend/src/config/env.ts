import { z } from "zod";

const list = z
  .string()
  .transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean));

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /**
     * A production server for testing and demos (the build a client or boss
     * tries out). Payment, photo and SMS keys may be missing, test payments
     * are allowed while Razorpay is not set up, and the demo seed may run.
     */
    STAGING: z.stringbool().default(false),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    TRUST_PROXY: z.stringbool().default(false),
    CORS_ORIGINS: list.default([]),

    DATABASE_URL: z.string().startsWith("postgres", "DATABASE_URL must be a postgres:// URL"),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    JOBS_ENABLED: z.stringbool().default(true),

    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    SMS_PROVIDER: z.enum(["console", "msg91"]).default("console"),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_OTP_TEMPLATE_ID: z.string().optional(),
    EXPO_ACCESS_TOKEN: z.string().optional(),

    ADVANCE_PERCENT: z.coerce.number().int().min(1).max(100).default(20),
    COMMISSION_PERCENT: z.coerce.number().int().min(0).max(100).default(15),
    HOLD_MINUTES: z.coerce.number().int().min(5).default(15),
    FREE_CANCELLATION_HOURS: z.coerce.number().int().min(0).default(72),
    MIN_NOTICE_HOURS: z.coerce.number().int().min(0).default(12),
    SLOT_STEP_MINUTES: z.coerce.number().int().min(15).default(30),
    BOOKING_HORIZON_DAYS: z.coerce.number().int().min(1).default(365),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production" || env.STAGING) return;
    const required = [
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_WEBHOOK_SECRET",
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ] as const;
    for (const key of required) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "Required in production" });
    }
    if (env.SMS_PROVIDER === "console") {
      ctx.addIssue({ code: "custom", path: ["SMS_PROVIDER"], message: "Use a real SMS provider in production" });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(`\nInvalid environment variables:\n${z.prettifyError(parsed.error)}\n`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
/** A real production server, where test shortcuts must never work. */
export const isLiveProduction = isProduction && !env.STAGING;
