import { serve } from "@hono/node-server";
import { app } from "./app.ts";
import { env } from "./config/env.ts";
import { pool } from "./db/client.ts";
import { startJobs, stopJobs } from "./jobs/index.ts";
import { logger } from "./lib/logger.ts";

await startJobs();

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`Saaj API ready on http://localhost:${info.port}`);
});

let stopping = false;

/**
 * On deploy or Ctrl+C: stop taking new requests, let the ones in flight finish,
 * let running jobs finish, close the database pool, then exit.
 */
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, "Shutting down");
  setTimeout(() => process.exit(1), 15_000).unref(); // give up after 15 s

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await stopJobs();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
