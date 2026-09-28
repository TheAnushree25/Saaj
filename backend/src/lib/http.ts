import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { env } from "../config/env.ts";

/**
 * The caller's IP address. Behind a load balancer every request seems to come
 * from the balancer, which puts the real address in X-Forwarded-For. Only trust
 * that header when TRUST_PROXY says a proxy you control sets it.
 */
export function clientIp(c: Context): string {
  if (env.TRUST_PROXY) {
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown"; // tests call the app directly, without a network socket
  }
}

export type ClientKind = "mobile" | "web";

/** Web panels send "X-Client: web" and get their refresh token as a cookie. */
export const clientKind = (c: Context): ClientKind => (c.req.header("x-client") === "web" ? "web" : "mobile");

export type RequestMeta = { ip: string; userAgent: string | null; client: ClientKind };

export const requestMeta = (c: Context): RequestMeta => ({
  ip: clientIp(c),
  userAgent: c.req.header("user-agent")?.slice(0, 300) ?? null,
  client: clientKind(c),
});
