import { and, count, desc, eq, gt, isNull, max, sql } from "drizzle-orm";
import { env } from "../../config/env.ts";
import { db, type Executor } from "../../db/client.ts";
import { one } from "../../db/helpers.ts";
import { artists, otpCodes, users, type Role } from "../../db/schema/index.ts";
import { hmacSha256, numericCode, readableCode, safeEqual } from "../../lib/crypto.ts";
import { PgCode, isPgError } from "../../lib/db-errors.ts";
import { AppError, badRequest, conflict } from "../../lib/errors.ts";
import type { RequestMeta } from "../../lib/http.ts";
import { addMinutes } from "../../lib/time.ts";
import { sendOtpSms } from "../notifications/sms.ts";
import type {
  ArtistRegisterInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.schemas.ts";
import { dummyHash, hashPassword, verifyPassword } from "./passwords.ts";
import { createSession, revokeAllSessions, revokeSession, rotateSession } from "./sessions.ts";
import { signAccessToken, type AccessClaims } from "./tokens.ts";

const LOCK_AFTER_FAILURES = 5;
const LOCK_MINUTES = 15;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PER_HOUR = 5;

/** The user fields that are safe to send to an app. Never the password hash. */
export const publicUser = {
  id: users.id,
  role: users.role,
  fullName: users.fullName,
  phone: users.phone,
  email: users.email,
  avatarUrl: users.avatarUrl,
  city: users.city,
  weddingDate: users.weddingDate,
  createdAt: users.createdAt,
};

type NewSession = Awaited<ReturnType<typeof createSession>>;

async function tokensFor(user: { id: string; role: Role }, session: NewSession) {
  const access = await signAccessToken({ userId: user.id, role: user.role, sessionId: session.sessionId });
  return {
    ...access,
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
  };
}

const issueTokens = async (executor: Executor, user: { id: string; role: Role }, meta: RequestMeta) =>
  tokensFor(user, await createSession(executor, user.id, meta));

/** Turns "duplicate key" database errors into messages a person can act on. */
function explainDuplicate(error: unknown): unknown {
  if (isPgError(error, PgCode.uniqueViolation, "users_phone_unique")) {
    return conflict("PHONE_TAKEN", "This mobile number is already registered. Try signing in instead.");
  }
  if (isPgError(error, PgCode.uniqueViolation, "users_email_unique")) {
    return conflict("EMAIL_TAKEN", "This email is already registered.");
  }
  return error;
}

export async function registerCustomer(input: RegisterInput, meta: RequestMeta) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const user = one(
        await tx
          .insert(users)
          .values({ fullName: input.fullName, phone: input.phone, email: input.email, passwordHash })
          .returning(publicUser),
      );
      return { user, tokens: await issueTokens(tx, user, meta) };
    });
  } catch (error) {
    throw explainDuplicate(error);
  }
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/** Artists sign up on the web panel. They start as a draft the admin has not seen yet. */
export async function registerArtist(input: ArtistRegisterInput, meta: RequestMeta) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const user = one(
        await tx
          .insert(users)
          .values({
            role: "artist",
            fullName: input.fullName,
            phone: input.phone,
            email: input.email,
            passwordHash,
          })
          .returning(publicUser),
      );
      await tx.insert(artists).values({
        userId: user.id,
        slug: `${slugify(input.studioName) || "artist"}-${readableCode(4).toLowerCase()}`,
        studioName: input.studioName,
        specialty: input.specialty,
        city: input.city,
        experienceYears: input.experienceYears,
      });
      return { user, tokens: await issueTokens(tx, user, meta) };
    });
  } catch (error) {
    throw explainDuplicate(error);
  }
}

const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "That mobile number and password do not match.");

export async function login(input: LoginInput, meta: RequestMeta) {
  const [account] = await db
    .select({
      user: publicUser,
      status: users.status,
      passwordHash: users.passwordHash,
      lockedUntil: users.lockedUntil,
    })
    .from(users)
    .where(eq(users.phone, input.phone));

  if (!account) {
    await verifyPassword(await dummyHash(), input.password);
    throw invalidCredentials();
  }

  if (account.lockedUntil && account.lockedUntil > new Date()) {
    const minutes = Math.ceil((account.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(
      429,
      "ACCOUNT_LOCKED",
      `Too many wrong passwords. Try again in ${minutes} min, or reset your password.`,
    );
  }

  if (!(await verifyPassword(account.passwordHash, input.password))) {
    // Counted in SQL, not JavaScript, so two wrong guesses at the same instant both count.
    await db
      .update(users)
      .set({
        failedLoginCount: sql`${users.failedLoginCount} + 1`,
        lockedUntil: sql`case when ${users.failedLoginCount} + 1 >= ${LOCK_AFTER_FAILURES}
          then now() + make_interval(mins => ${LOCK_MINUTES}) else null end`,
      })
      .where(eq(users.id, account.user.id));
    throw invalidCredentials();
  }

  if (account.status === "suspended") {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "This account is paused. Please contact Saaj support.");
  }
  if (account.status !== "active") throw invalidCredentials();

  const tokens = await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
      .where(eq(users.id, account.user.id));
    return issueTokens(tx, account.user, meta);
  });
  return { user: account.user, tokens };
}

export async function refresh(refreshToken: string, meta: RequestMeta) {
  const rotated = await rotateSession(refreshToken, meta);
  const user = one(await db.select(publicUser).from(users).where(eq(users.id, rotated.userId)));
  return { user, tokens: await tokensFor(user, rotated.session) };
}

export const logout = (refreshToken: string) => revokeSession(refreshToken);

export async function logoutEverywhere(auth: AccessClaims) {
  await revokeAllSessions(db, auth.userId);
}

// The code is hashed with a server secret, so a leaked table of codes is useless.
const otpHash = (phone: string, code: string) => hmacSha256(env.JWT_SECRET, `otp:${phone}:${code}`);

/** Texts a 6-digit code. Answers the same whether or not the number has an account. */
export async function requestPasswordReset(phone: string) {
  const [user] = await db.select({ status: users.status }).from(users).where(eq(users.phone, phone));
  if (!user || user.status !== "active") return;

  // SMS costs money: at most one code a minute, and five an hour, per number.
  const [recent] = await db
    .select({ sent: count(), latest: max(otpCodes.createdAt) })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.purpose, "reset_password"),
        gt(otpCodes.createdAt, sql`now() - interval '1 hour'`),
      ),
    );
  if (recent && (recent.sent >= OTP_PER_HOUR || (recent.latest && Date.now() - recent.latest.getTime() < 60_000))) {
    return;
  }

  const code = numericCode(6);
  await db.insert(otpCodes).values({
    phone,
    purpose: "reset_password",
    codeHash: otpHash(phone, code),
    expiresAt: addMinutes(new Date(), OTP_TTL_MINUTES),
  });
  await sendOtpSms(phone, code);
}

export async function resetPassword(input: ResetPasswordInput) {
  const invalidCode = () => badRequest("CODE_INVALID", "That code is wrong or has expired. Request a new one.");

  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, input.phone),
        eq(otpCodes.purpose, "reset_password"),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) throw invalidCode();

  if (!safeEqual(otp.codeHash, otpHash(input.phone, input.code))) {
    await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, otp.id));
    throw invalidCode();
  }

  const passwordHash = await hashPassword(input.newPassword);
  await db.transaction(async (tx) => {
    const used = await tx
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(otpCodes.id, otp.id), isNull(otpCodes.consumedAt)))
      .returning({ id: otpCodes.id });
    if (used.length === 0) throw invalidCode(); // a parallel request used it first

    const [user] = await tx
      .update(users)
      .set({ passwordHash, failedLoginCount: 0, lockedUntil: null })
      .where(and(eq(users.phone, input.phone), eq(users.status, "active")))
      .returning({ id: users.id });
    if (user) await revokeAllSessions(tx, user.id);
  });
}

export async function changePassword(
  auth: AccessClaims,
  input: { currentPassword: string; newPassword: string },
) {
  const [account] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, auth.userId));
  if (!account || !(await verifyPassword(account.passwordHash, input.currentPassword))) {
    throw badRequest("WRONG_PASSWORD", "Your current password is not right.");
  }
  const passwordHash = await hashPassword(input.newPassword);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, auth.userId));
    await revokeAllSessions(tx, auth.userId, auth.sessionId); // other devices out, this one stays
  });
}
