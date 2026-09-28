import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env.ts";
import { userRole, type Role } from "../../db/schema/index.ts";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = "saaj-api";
const AUDIENCE = "saaj";

/** What an access token proves: who you are, your role, and which sign-in (session) it came from. */
export type AccessClaims = { userId: string; role: Role; sessionId: string };

export async function signAccessToken(claims: AccessClaims) {
  const expiresAt = new Date(Date.now() + env.ACCESS_TOKEN_TTL_MINUTES * 60_000);
  const accessToken = await new SignJWT({ role: claims.role, sid: claims.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);
  return { accessToken, accessTokenExpiresAt: expiresAt };
}

const isRole = (value: unknown): value is Role => userRole.enumValues.some((role) => role === value);

/** Throws if the token was tampered with, has expired, or was not issued by us. */
export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ["HS256"],
  });
  const { sub, role, sid } = payload;
  if (typeof sub !== "string" || typeof sid !== "string" || !isRole(role)) {
    throw new Error("Malformed access token");
  }
  return { userId: sub, role, sessionId: sid };
}
