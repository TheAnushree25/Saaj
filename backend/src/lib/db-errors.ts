import { DrizzleQueryError } from "drizzle-orm";

/** The Postgres error codes this app reacts to. Full list: postgresql.org/docs/current/errcodes-appendix.html */
export const PgCode = {
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  checkViolation: "23514",
  exclusionViolation: "23P01",
  deadlock: "40P01",
} as const;

type PgError = { code: string; constraint?: string };

/** Drizzle wraps driver errors; this digs out the original Postgres error, if there is one. */
export function pgError(error: unknown): PgError | undefined {
  const inner = error instanceof DrizzleQueryError ? error.cause : error;
  if (inner && typeof inner === "object" && "code" in inner && typeof inner.code === "string") {
    return inner as PgError;
  }
  return undefined;
}

export function isPgError(error: unknown, code: string, constraint?: string): boolean {
  const pg = pgError(error);
  return pg?.code === code && (constraint === undefined || pg.constraint === constraint);
}
