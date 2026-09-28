import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { z } from "zod";
import { AppError } from "./errors.ts";

/**
 * Validates one part of the request (json body, query string, route params)
 * against a Zod schema. On failure every route answers the same way:
 * 422 with a list of { path, message } the app can show next to each field.
 */
export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      throw new AppError(422, "VALIDATION_FAILED", issues[0]?.message ?? "Check the form.", issues);
    }
  });

/**
 * For edits (PATCH): once Zod has dropped any unknown keys, at least one field
 * must be left. An empty edit has nothing to save, and the database refuses it.
 */
export const hasSomethingToChange = (value: object) => Object.keys(value).length > 0;
export const NOTHING_TO_CHANGE = "Send at least one field to change.";
