import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { one } from "../../db/helpers.ts";
import {
  artists,
  bookings,
  notifications,
  pushTokens,
  savedArtists,
  sessions,
  users,
} from "../../db/schema/index.ts";
import { randomToken } from "../../lib/crypto.ts";
import { PgCode, isPgError } from "../../lib/db-errors.ts";
import { conflict, notFound } from "../../lib/errors.ts";
import { offsetOf, paged, type PageQuery } from "../../lib/pagination.ts";
import { publicUser } from "../auth/auth.service.ts";
import { hashPassword } from "../auth/passwords.ts";
import type { AccessClaims } from "../auth/tokens.ts";
import { artistCardColumns, isVisibleArtist, selectArtistCards, toArtistCard } from "../catalogue/artist-card.ts";
import { imageUrlFor } from "../uploads/cloudinary.ts";
import type { UpdateMeInput } from "./me.schemas.ts";

export async function getMe(auth: AccessClaims) {
  const [user] = await db.select(publicUser).from(users).where(eq(users.id, auth.userId));
  if (!user) throw notFound("Account");

  const [artist] =
    user.role === "artist"
      ? await db
          .select({ id: artists.id, slug: artists.slug, studioName: artists.studioName, status: artists.status })
          .from(artists)
          .where(eq(artists.userId, user.id))
      : [];
  return { user, artist: artist ?? null };
}

export async function updateMe(auth: AccessClaims, input: UpdateMeInput) {
  const { avatarPublicId, ...fields } = input;
  const avatarUrl =
    avatarPublicId === undefined
      ? undefined
      : avatarPublicId === null
        ? null
        : imageUrlFor(avatarPublicId, "avatar", auth.userId);

  try {
    return one(
      await db
        .update(users)
        .set({ ...fields, ...(avatarUrl === undefined ? {} : { avatarUrl }) })
        .where(eq(users.id, auth.userId))
        .returning(publicUser),
    );
  } catch (error) {
    if (isPgError(error, PgCode.uniqueViolation, "users_email_unique")) {
      throw conflict("EMAIL_TAKEN", "This email is already registered.");
    }
    throw error;
  }
}

/**
 * The Play Store requires in-app account deletion. Bookings and payments must
 * stay for accounting, so the person is anonymised rather than the rows deleted.
 */
export async function deleteAccount(auth: AccessClaims) {
  const [upcoming] = await db
    .select({ value: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.customerId, auth.userId),
        inArray(bookings.status, ["pending_payment", "confirmed", "in_progress"]),
      ),
    );
  if ((upcoming?.value ?? 0) > 0) {
    throw conflict("HAS_UPCOMING_BOOKINGS", "Please cancel your upcoming bookings before deleting your account.");
  }

  const passwordHash = await hashPassword(randomToken());
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        status: "deleted",
        fullName: "Deleted user",
        phone: `deleted:${auth.userId}`,
        email: null,
        avatarUrl: null,
        city: null,
        weddingDate: null,
        passwordHash,
      })
      .where(eq(users.id, auth.userId));
    await tx.delete(sessions).where(eq(sessions.userId, auth.userId));
    await tx.delete(pushTokens).where(eq(pushTokens.userId, auth.userId));
    await tx.delete(savedArtists).where(eq(savedArtists.userId, auth.userId));
    await tx.delete(notifications).where(eq(notifications.userId, auth.userId));
  });
}

export async function listSavedArtists(userId: string) {
  const rows = await selectArtistCards()
    .innerJoin(savedArtists, eq(savedArtists.artistId, artists.id))
    .where(and(eq(savedArtists.userId, userId), isVisibleArtist))
    .orderBy(desc(savedArtists.createdAt));
  return rows.map(toArtistCard);
}

export async function saveArtist(userId: string, artistId: string) {
  const [artist] = await db
    .select({ id: artistCardColumns.id })
    .from(artists)
    .innerJoin(users, eq(users.id, artists.userId))
    .where(and(eq(artists.id, artistId), isVisibleArtist));
  if (!artist) throw notFound("Artist");
  // Saving twice is fine: the second insert quietly does nothing.
  await db.insert(savedArtists).values({ userId, artistId }).onConflictDoNothing();
}

export async function unsaveArtist(userId: string, artistId: string) {
  await db.delete(savedArtists).where(and(eq(savedArtists.userId, userId), eq(savedArtists.artistId, artistId)));
}

/** A phone's push address. If it was someone else's (they signed out, you signed in), it moves to you. */
export async function registerPushToken(userId: string, token: string, platform: string | undefined) {
  await db
    .insert(pushTokens)
    .values({ userId, token, platform })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId, platform, lastSeenAt: new Date() },
    });
}

export async function removePushToken(userId: string, token: string) {
  await db.delete(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
}

export async function listNotifications(userId: string, query: PageQuery) {
  const mine = eq(notifications.userId, userId);
  const [rows, [total], [unread]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        data: notifications.data,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(mine)
      .orderBy(desc(notifications.createdAt))
      .limit(query.pageSize)
      .offset(offsetOf(query)),
    db.select({ value: count() }).from(notifications).where(mine),
    db.select({ value: count() }).from(notifications).where(and(mine, isNull(notifications.readAt))),
  ]);
  return { ...paged(rows, total?.value ?? 0, query), unreadCount: unread?.value ?? 0 };
}

export async function markNotificationsRead(userId: string, ids: string[] | undefined) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        ids ? inArray(notifications.id, ids) : undefined,
      ),
    );
}
