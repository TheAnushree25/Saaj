import type { ContentfulStatusCode } from "hono/utils/http-status";

/** An error we expect and can explain to the person using the app. */
export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly details: unknown;

  constructor(status: ContentfulStatusCode, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);

export const unauthorized = (message = "Please sign in to continue.") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You do not have access to this.") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (what = "That item") => new AppError(404, "NOT_FOUND", `${what} was not found.`);

export const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details);

export const unprocessable = (code: string, message: string, details?: unknown) =>
  new AppError(422, code, message, details);
