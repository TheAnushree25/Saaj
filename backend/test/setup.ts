import { afterAll, beforeAll } from "vitest";
import { pool } from "../src/db/client.ts";
import { startJobs, stopJobs } from "../src/jobs/index.ts";

// Runs around every test file. JOBS_ENABLED=false in .env.test, so this only
// creates the queues (bookings and payments add jobs to them); no worker runs.
beforeAll(async () => {
  await startJobs();
});

afterAll(async () => {
  await stopJobs();
  await pool.end();
});
