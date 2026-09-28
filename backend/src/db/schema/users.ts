import { date, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, timestamps, timestamptz } from "./columns.ts";
import { otpPurpose, userRole, userStatus } from "./enums.ts";

export const users = pgTable("users", {
  id: id(),
  role: userRole().notNull().default("customer"),
  status: userStatus().notNull().default("active"),
  fullName: text().notNull(),
  phone: text().notNull().unique(),
  email: text().unique(),
  passwordHash: text().notNull(),
  avatarUrl: text(),
  city: text(),
  weddingDate: date({ mode: "string" }),
  failedLoginCount: integer().notNull().default(0),
  lockedUntil: timestamptz(),
  lastLoginAt: timestamptz(),
  ...timestamps(),
});

/** One row per signed-in device. The refresh token itself is never stored, only its hash. */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid().notNull(),
    tokenHash: text().notNull().unique(),
    client: text().$type<"mobile" | "web">().notNull(),
    userAgent: text(),
    ip: text(),
    expiresAt: timestamptz().notNull(),
    rotatedAt: timestamptz(),
    revokedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId), index().on(t.familyId)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: id(),
    phone: text().notNull(),
    purpose: otpPurpose().notNull(),
    codeHash: text().notNull(),
    attempts: integer().notNull().default(0),
    expiresAt: timestamptz().notNull(),
    consumedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.phone, t.purpose, t.createdAt)],
);

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    platform: text(),
    createdAt: createdAt(),
    lastSeenAt: timestamptz().notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    body: text().notNull(),
    data: jsonb().$type<Record<string, string>>(),
    readAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);
