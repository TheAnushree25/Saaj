import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.ts";
import { logger } from "../lib/logger.ts";
import * as schema from "./schema/index.ts";

/** A pool keeps a few connections open and lends them out, instead of reconnecting per query. */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// An idle connection can drop (database restart, network blip). Without a listener
// that error would crash the whole process; with one, the pool simply replaces it.
pool.on("error", (error) => logger.error({ err: error }, "Idle database connection failed"));

export const db = drizzle({ client: pool, schema, casing: "snake_case" });

export type Database = typeof db;
/** The object a transaction callback receives. It has the same query methods as db. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Anything that can run a query: the database itself or an open transaction. */
export type Executor = Database | Transaction;
