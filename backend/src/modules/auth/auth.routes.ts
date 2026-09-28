import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../../app-env.ts";
import { isProduction } from "../../config/env.ts";
import { unauthorized } from "../../lib/errors.ts";
import { clientKind, requestMeta } from "../../lib/http.ts";
import { validate } from "../../lib/validate.ts";
import { requireAuth } from "../../middleware/auth.ts";
import { authLimiter, otpLimiter } from "../../middleware/rate-limit.ts";
import {
  artistRegisterSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schemas.ts";
import {
  changePassword,
  login,
  logout,
  logoutEverywhere,
  refresh,
  registerArtist,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
} from "./auth.service.ts";

const REFRESH_COOKIE = "saaj_refresh";
const COOKIE_PATH = "/v1/auth";

type SessionResult = Awaited<ReturnType<typeof login>>;

/**
 * Phones keep the refresh token in their secure storage, so they get it in
 * the JSON. Browsers get it as an httpOnly cookie that page scripts can never
 * read, which is what protects it from a malicious script (XSS).
 */
function sendSession(c: Context, result: SessionResult, status: 200 | 201 = 200) {
  const { refreshToken, ...tokens } = result.tokens;
  if (clientKind(c) === "web") {
    setCookie(c, REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "Lax",
      path: COOKIE_PATH,
      expires: tokens.refreshTokenExpiresAt,
    });
    return c.json({ user: result.user, tokens }, status);
  }
  return c.json({ user: result.user, tokens: result.tokens }, status);
}

const presentedToken = (c: Context, fromBody: string | undefined) =>
  fromBody ?? getCookie(c, REFRESH_COOKIE);

// requireAuth is attached to each signed-in route, not with .use(): these routes
// share the /v1/auth prefix with public ones like /login, and .use() on this
// router would guard every one of them.
export const authRoutes = new Hono<AppEnv>()
  .post("/register", authLimiter, validate("json", registerSchema), async (c) =>
    sendSession(c, await registerCustomer(c.req.valid("json"), requestMeta(c)), 201),
  )
  .post("/register/artist", authLimiter, validate("json", artistRegisterSchema), async (c) =>
    sendSession(c, await registerArtist(c.req.valid("json"), requestMeta(c)), 201),
  )
  .post("/login", authLimiter, validate("json", loginSchema), async (c) =>
    sendSession(c, await login(c.req.valid("json"), requestMeta(c))),
  )
  .post("/refresh", validate("json", refreshTokenSchema), async (c) => {
    const token = presentedToken(c, c.req.valid("json").refreshToken);
    if (!token) throw unauthorized();
    return sendSession(c, await refresh(token, requestMeta(c)));
  })
  .post("/logout", validate("json", refreshTokenSchema), async (c) => {
    const token = presentedToken(c, c.req.valid("json").refreshToken);
    if (token) await logout(token);
    deleteCookie(c, REFRESH_COOKIE, { path: COOKIE_PATH });
    return c.body(null, 204);
  })
  .post("/password/forgot", otpLimiter, validate("json", forgotPasswordSchema), async (c) => {
    await requestPasswordReset(c.req.valid("json").phone);
    return c.json({ message: "If this number has an account, a 6-digit code is on its way." });
  })
  .post("/password/reset", authLimiter, validate("json", resetPasswordSchema), async (c) => {
    await resetPassword(c.req.valid("json"));
    return c.json({ message: "Password updated. Please sign in with your new password." });
  })
  .post("/password/change", requireAuth, validate("json", changePasswordSchema), async (c) => {
    await changePassword(c.var.auth, c.req.valid("json"));
    return c.json({ message: "Password changed. Your other devices have been signed out." });
  })
  .post("/logout/all", requireAuth, async (c) => {
    await logoutEverywhere(c.var.auth);
    deleteCookie(c, REFRESH_COOKIE, { path: COOKIE_PATH });
    return c.body(null, 204);
  });
