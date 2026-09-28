import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer", "artist", "admin"]);
export const userStatus = pgEnum("user_status", ["active", "suspended", "deleted"]);

export const artistStatus = pgEnum("artist_status", [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
]);

export const bookingStatus = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
]);

export const paymentKind = pgEnum("payment_kind", ["advance", "balance"]);
export const paymentStatus = pgEnum("payment_status", ["created", "paid", "failed"]);
export const refundStatus = pgEnum("refund_status", ["pending", "processed", "failed"]);

export const otpPurpose = pgEnum("otp_purpose", ["reset_password"]);

export const occasion = pgEnum("occasion", [
  "bridal",
  "engagement",
  "reception",
  "haldi",
  "mehendi",
  "sangeet",
]);

export type Role = (typeof userRole.enumValues)[number];
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type ArtistStatus = (typeof artistStatus.enumValues)[number];
export type Occasion = (typeof occasion.enumValues)[number];
