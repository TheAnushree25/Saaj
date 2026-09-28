import { PgBoss } from "pg-boss";
import { env } from "../config/env.ts";
import { logger } from "../lib/logger.ts";

/**
 * A job queue that lives in our own Postgres (in a "pgboss" schema): no Redis to
 * run. Jobs survive restarts, failed jobs retry, and with several servers each
 * job still runs exactly once.
 */
export const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  schema: "pgboss",
  max: 4,
  supervise: env.JOBS_ENABLED,
  schedule: env.JOBS_ENABLED,
});

boss.on("error", (error) => logger.error({ err: error }, "Job queue error"));

/** Queue names, in one place so a typo cannot create a queue nobody works on. */
export const Queue = {
  push: "notifications-push",
  refund: "payments-refund",
  expireHolds: "bookings-expire-holds",
  reminders: "bookings-reminders",
} as const;
