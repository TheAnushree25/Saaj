import { eq, isNotNull } from "drizzle-orm";
import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/db/client.ts";
import { sessions, users } from "../src/db/schema/index.ts";
import { sendOtpSms } from "../src/modules/notifications/sms.ts";
import { api, nextPhone, resetDatabase, signUp } from "./helpers.ts";

// Replace the real SMS sender, so tests can read the code that would be texted.
vi.mock("../src/modules/notifications/sms.ts", () => ({ sendOtpSms: vi.fn() }));

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(sendOtpSms).mockClear();
});


describe("sign up with phone and password", () => {
  it("creates the account, normalises the number and signs the bride in", async () => {
    const { status, body } = await api("POST", "/v1/auth/register", {
      body: { fullName: "  Ananya Sharma ", phone: "98765 43210", password: "bridal-2026" },
    });

    expect(status).toBe(201);
    expect(body.user).toMatchObject({ fullName: "Ananya Sharma", phone: "+919876543210", role: "customer" });
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.tokens.accessToken).toBeTypeOf("string");
    expect(body.tokens.refreshToken).toBeTypeOf("string");
  });

  it("explains every invalid field with the same words as the app", async () => {
    const { status, body } = await api("POST", "/v1/auth/register", {
      body: { fullName: "A", phone: "12345", password: "short" },
    });

    expect(status).toBe(422);
    expect(body.error.details).toEqual([
      { path: "fullName", message: "Please enter your name" },
      { path: "phone", message: "Enter a 10-digit Indian mobile number" },
      { path: "password", message: "At least 8 characters" },
    ]);
  });

  it("refuses a number that is already registered, however it is typed", async () => {
    await api("POST", "/v1/auth/register", {
      body: { fullName: "First", phone: "9876543210", password: "bridal-2026" },
    });
    const { status, body } = await api("POST", "/v1/auth/register", {
      body: { fullName: "Second", phone: "+91 98765-43210", password: "bridal-2027" },
    });

    expect(status).toBe(409);
    expect(body.error.code).toBe("PHONE_TAKEN");
  });
});

describe("sign in with phone and password", () => {
  it("signs in with the right password", async () => {
    const bride = await signUp();
    const { status, body } = await api("POST", "/v1/auth/login", {
      body: { phone: bride.phone, password: bride.password },
    });

    expect(status).toBe(200);
    expect(body.user.id).toBe(bride.user.id);
  });

  it("gives the same answer for a wrong password and an unknown number", async () => {
    const bride = await signUp();
    const wrong = await api("POST", "/v1/auth/login", { body: { phone: bride.phone, password: "not-it-at-all" } });
    const unknown = await api("POST", "/v1/auth/login", { body: { phone: nextPhone(), password: "not-it-at-all" } });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("locks the account after 5 wrong passwords", async () => {
    const bride = await signUp();
    for (let i = 0; i < 5; i++) {
      await api("POST", "/v1/auth/login", { body: { phone: bride.phone, password: "wrong-password" } });
    }
    const { status, body } = await api("POST", "/v1/auth/login", {
      body: { phone: bride.phone, password: bride.password },
    });

    expect(status).toBe(429);
    expect(body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("tells a suspended user why they cannot sign in", async () => {
    const bride = await signUp();
    await db.update(users).set({ status: "suspended" }).where(eq(users.id, bride.user.id));
    const { status, body } = await api("POST", "/v1/auth/login", {
      body: { phone: bride.phone, password: bride.password },
    });

    expect(status).toBe(403);
    expect(body.error.code).toBe("ACCOUNT_SUSPENDED");
  });
});

describe("staying signed in", () => {
  it("swaps a refresh token for a new pair, once", async () => {
    const bride = await signUp();
    const first = await api("POST", "/v1/auth/refresh", { body: { refreshToken: bride.tokens.refreshToken } });

    expect(first.status).toBe(200);
    expect(first.body.tokens.refreshToken).not.toBe(bride.tokens.refreshToken);
    expect(first.body.user.id).toBe(bride.user.id);
  });

  it("ends the whole sign-in chain when an old refresh token is replayed later", async () => {
    const bride = await signUp();
    const rotated = await api("POST", "/v1/auth/refresh", { body: { refreshToken: bride.tokens.refreshToken } });
    // Pretend the rotation happened a minute ago, outside the 30-second grace window.
    await db
      .update(sessions)
      .set({ rotatedAt: new Date(Date.now() - 60_000) })
      .where(isNotNull(sessions.rotatedAt));

    const replay = await api("POST", "/v1/auth/refresh", { body: { refreshToken: bride.tokens.refreshToken } });
    const legit = await api("POST", "/v1/auth/refresh", { body: { refreshToken: rotated.body.tokens.refreshToken } });

    expect(replay.status).toBe(401);
    expect(legit.status).toBe(401); // the thief's copy and the real one both stop working
  });

  it("signs out: the refresh token stops working", async () => {
    const bride = await signUp();
    const out = await api("POST", "/v1/auth/logout", { body: { refreshToken: bride.tokens.refreshToken } });
    const after = await api("POST", "/v1/auth/refresh", { body: { refreshToken: bride.tokens.refreshToken } });

    expect(out.status).toBe(204);
    expect(after.status).toBe(401);
  });

  it("gives browsers the refresh token as an httpOnly cookie instead of JSON", async () => {
    const bride = await signUp();
    const login = await api("POST", "/v1/auth/login", {
      body: { phone: bride.phone, password: bride.password },
      headers: { "x-client": "web" },
    });
    const cookie = login.headers.get("set-cookie") ?? "";

    expect(cookie).toContain("saaj_refresh=");
    expect(cookie).toContain("HttpOnly");
    expect(login.body.tokens.refreshToken).toBeUndefined();

    const refreshed = await api("POST", "/v1/auth/refresh", {
      body: {},
      headers: { "x-client": "web", cookie: cookie.split(";")[0] ?? "" },
    });
    expect(refreshed.status).toBe(200);
  });
});

describe("access tokens", () => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  it("says TOKEN_EXPIRED for an expired token, so the app knows to refresh", async () => {
    const bride = await signUp();
    const expired = await new SignJWT({ role: "customer", sid: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(bride.user.id)
      .setIssuer("saaj-api")
      .setAudience("saaj")
      .setExpirationTime(new Date(Date.now() - 1000))
      .sign(secret);
    const { status, body } = await api("POST", "/v1/auth/logout/all", { token: expired });

    expect(status).toBe(401);
    expect(body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("rejects a tampered token", async () => {
    const bride = await signUp();
    const tampered = `${bride.tokens.accessToken.slice(0, -3)}abc`;
    const { status, body } = await api("POST", "/v1/auth/logout/all", { token: tampered });

    expect(status).toBe(401);
    expect(body.error.code).toBe("TOKEN_INVALID");
  });
});

describe("forgot password", () => {
  it("texts a code, resets the password with it, and unlocks the account", async () => {
    const bride = await signUp();
    for (let i = 0; i < 5; i++) {
      await api("POST", "/v1/auth/login", { body: { phone: bride.phone, password: "wrong-password" } });
    }
    await api("POST", "/v1/auth/password/forgot", { body: { phone: bride.phone } });
    const code = vi.mocked(sendOtpSms).mock.calls[0]?.[1];
    expect(code).toMatch(/^\d{6}$/);

    const reset = await api("POST", "/v1/auth/password/reset", {
      body: { phone: bride.phone, code, newPassword: "a-new-password" },
    });
    const oldSession = await api("POST", "/v1/auth/refresh", { body: { refreshToken: bride.tokens.refreshToken } });
    const login = await api("POST", "/v1/auth/login", { body: { phone: bride.phone, password: "a-new-password" } });

    expect(reset.status).toBe(200);
    expect(oldSession.status).toBe(401); // resetting signs out every device
    expect(login.status).toBe(200);
  });

  it("answers the same for an unknown number, and texts nothing", async () => {
    const { status } = await api("POST", "/v1/auth/password/forgot", { body: { phone: nextPhone() } });

    expect(status).toBe(200);
    expect(sendOtpSms).not.toHaveBeenCalled();
  });

  it("rejects a wrong code", async () => {
    const bride = await signUp();
    await api("POST", "/v1/auth/password/forgot", { body: { phone: bride.phone } });
    const { status, body } = await api("POST", "/v1/auth/password/reset", {
      body: { phone: bride.phone, code: "000000", newPassword: "a-new-password" },
    });

    expect(status).toBe(400);
    expect(body.error.code).toBe("CODE_INVALID");
  });
});

describe("change password", () => {
  it("keeps this device signed in and signs out the others", async () => {
    const bride = await signUp();
    const otherDevice = await api("POST", "/v1/auth/login", {
      body: { phone: bride.phone, password: bride.password },
    });

    const changed = await api("POST", "/v1/auth/password/change", {
      token: bride.tokens.accessToken,
      body: { currentPassword: bride.password, newPassword: "brand-new-pass" },
    });
    const thisDevice = await api("POST", "/v1/auth/refresh", { body: { refreshToken: bride.tokens.refreshToken } });
    const other = await api("POST", "/v1/auth/refresh", { body: { refreshToken: otherDevice.body.tokens.refreshToken } });

    expect(changed.status).toBe(200);
    expect(thisDevice.status).toBe(200);
    expect(other.status).toBe(401);
  });

  it("needs the current password", async () => {
    const bride = await signUp();
    const { status, body } = await api("POST", "/v1/auth/password/change", {
      token: bride.tokens.accessToken,
      body: { currentPassword: "not-my-password", newPassword: "brand-new-pass" },
    });

    expect(status).toBe(400);
    expect(body.error.code).toBe("WRONG_PASSWORD");
  });
});
