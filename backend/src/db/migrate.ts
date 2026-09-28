import { migrate } from "drizzle-orm/node-postgres/migrator";
import { logger } from "../lib/logger.ts";
import { db, pool } from "./client.ts";

// Applies every migration in ./drizzle that this database has not seen yet,
// in order, inside a transaction. Safe to run on every deploy.
await migrate(db, { migrationsFolder: "./drizzle" });
logger.info("Migrations applied");
await pool.end();
