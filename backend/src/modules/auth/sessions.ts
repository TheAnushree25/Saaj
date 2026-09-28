import { randomUUID } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { env } from "../../config/env.ts";
import { db, type Executor } from "../../db/client.ts";
import { one } from "../../db/helpers.ts";
import { sessions, users, type Role } from "../../db/schema/index.ts";
import { randomToken, sha256 } from "../../lib/crypto.ts";
import { unauthorized } from "../../lib/errors.ts";
import type { RequestMeta } from "../../lib/http.ts";
import { addDays } from "../../lib/time.ts";

/** A refresh token used twice within this window is two tabs racing, not theft. */
const REUSE_GRACE_MS = 30_000;

export async function createSession(
  executor: Executor,
  userId: string,
  meta: RequestMeta,
  familyId: string = randomUUID(),
) {
  const refreshToken = randomToken();
  const session = one(
    await executor
      .insert(sessions)
      .values({
        userId,
        familyId,
        tokenHash: sha256(refreshToken),
        client: meta.client,
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt: addDays(new Date(), env.REFRESH_TOKEN_TTL_DAYS),
      })
      .returning({ id: sessions.id, expiresAt: sessions.expiresAt }),
  );
  return { sessionId: session.id, refreshToken, refreshTokenExpiresAt: session.expiresAt };
}

type Rotation =
  | { ok: true; userId: string; role: Role; session: Awaited<ReturnType<typeof createSession>> }
  | { ok: false; reused: boolean };

/**
 * Swaps a refresh token for a brand-new one (rotation). Each token works once.
 * If an already-used token comes back later, someone copied it, so every
 * session in that sign-in chain (the "family") is ended.
 */
export async function rotateSession(refreshToken: string, meta: RequestMeta) {
  const result = await db.transaction(async (tx): Promise<Rotation> => {
    const [current] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, sha256(refreshToken)))
      .for("update");

    if (!current || current.revokedAt || current.expiresAt <= new Date()) {
      return { ok: false, reused: false };
    }

    if (current.rotatedAt) {
      const racing = Date.now() - current.rotatedAt.getTime() < REUSE_GRACE_MS;
      if (!racing) {
        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(sessions.familyId, current.familyId), isNull(sessions.revokedAt)));
        return { ok: false, reused: true };
      }
    } else {
      await tx.update(sessions).set({ rotatedAt: new Date() }).where(eq(sessions.id, current.id));
    }

    const [user] = await tx
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, current.userId));
    if (!user || user.status !== "active") return { ok: false, reused: false };

    const session = await createSession(tx, user.id, { ...meta, client: current.client }, current.familyId);
    return { ok: true, userId: user.id, role: user.role, session };
  });

  // Throw only after the transaction has committed, so the family revoke above is kept.
  if (!result.ok) {
    throw unauthorized(
      result.reused
        ? "For your safety we signed you out. Please sign in again."
        : "Your session has ended. Please sign in again.",
    );
  }
  return result;
}

export async function revokeSession(refreshToken: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, sha256(refreshToken)), isNull(sessions.revokedAt)));
}

/** Signs a user out everywhere, optionally keeping the device they are using now. */
export async function revokeAllSessions(executor: Executor, userId: string, exceptSessionId?: string) {
  await executor
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined,
      ),
    );
}
