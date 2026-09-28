import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../app-env.ts";
import { PgCode, pgError } from "../lib/db-errors.ts";
import { AppError } from "../lib/errors.ts";
import { logger } from "../lib/logger.ts";

/**
 * The one place every thrown error ends up. Expected errors become a clear JSON
 * answer; anything unexpected is logged in full and the app gets a safe message.
 * Every error body has the same shape: { error: { code, message, details? } }.
 */
export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof AppError) {
    return c.json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
  }

  if (error instanceof HTTPException) {
    // Thrown by Hono itself, e.g. malformed JSON or a body over the size limit.
    return c.json({ error: { code: "BAD_REQUEST", message: error.message } }, error.status);
  }

  if (pgError(error)?.code === PgCode.exclusionViolation) {
    return c.json(
      { error: { code: "SLOT_TAKEN", message: "That time was just booked. Please pick another." } },
      409,
    );
  }

  (c.var.log ?? logger).error({ err: error }, "Unhandled error");
  return c.json(
    {
      error: {
        code: "INTERNAL",
        message: "Something went wrong on our side. Please try again.",
        requestId: c.var.requestId,
      },
    },
    500,
  );
};
