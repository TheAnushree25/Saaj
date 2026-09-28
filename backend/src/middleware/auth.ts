import { createMiddleware } from "hono/factory";
import { errors } from "jose";
import type { AuthEnv } from "../app-env.ts";
import type { Role } from "../db/schema/index.ts";
import { AppError, forbidden, unauthorized } from "../lib/errors.ts";
import { verifyAccessToken } from "../modules/auth/tokens.ts";

/** Lets the request through only with a valid "Authorization: Bearer <access token>". */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const [scheme, token] = (c.req.header("authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw unauthorized();

  try {
    c.set("auth", await verifyAccessToken(token));
  } catch (error) {
    // TOKEN_EXPIRED tells the app "refresh and retry"; anything else means "sign in again".
    if (error instanceof errors.JWTExpired) {
      throw new AppError(401, "TOKEN_EXPIRED", "Your session needs refreshing.");
    }
    throw new AppError(401, "TOKEN_INVALID", "Please sign in again.");
  }
  await next();
});

/** Use after requireAuth: only these roles may continue. */
export const requireRole = (...roles: Role[]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    if (!roles.includes(c.var.auth.role)) throw forbidden();
    await next();
  });
