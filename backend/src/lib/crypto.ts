import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** A random, URL-safe secret, e.g. a refresh token. 32 bytes = 256 bits. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const hmacSha256 = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

/** Compares two secrets in constant time, so the comparison leaks nothing through timing. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// No 0/O, 1/I/L: a bride reading a reference over the phone cannot mix them up.
const READABLE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function readableCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) code += READABLE.charAt(randomInt(READABLE.length));
  return code;
}

export function numericCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) code += String(randomInt(10));
  return code;
}
