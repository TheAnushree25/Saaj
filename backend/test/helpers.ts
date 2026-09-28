import { sql } from "drizzle-orm";
import { app } from "../src/app.ts";
import { db } from "../src/db/client.ts";

type CallOptions = { body?: unknown; token?: string; headers?: Record<string, string> };

/** Calls the API in-process (no network) and parses the JSON answer. */
export async function api(method: string, path: string, options: CallOptions = {}) {
  const response = await app.request(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests read whatever came back
  const body: any = text ? JSON.parse(text) : null;
  return { status: response.status, headers: response.headers, body };
}

/** Empties every table between tests. CASCADE follows the foreign keys. */
export async function resetDatabase() {
  await db.execute(
    sql`truncate table users, service_categories, webhook_events, otp_codes restart identity cascade`,
  );
}

let phoneCounter = 0;
/** A fresh, valid mobile number for each call: 9000000001, 9000000002... */
export const nextPhone = () => String(9_000_000_000 + ++phoneCounter);

export async function signUp(overrides: Record<string, unknown> = {}) {
  const phone = nextPhone();
  const response = await api("POST", "/v1/auth/register", {
    body: { fullName: "Test Bride", phone, password: "correct-horse-1", ...overrides },
  });
  return { phone, password: "correct-horse-1", ...response.body, status: response.status };
}
