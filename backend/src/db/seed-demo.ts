import { count } from "drizzle-orm";
import { isLiveProduction } from "../config/env.ts";
import { logger } from "../lib/logger.ts";
import { db, pool } from "./client.ts";
import { users } from "./schema/index.ts";

// A staging server runs this each time it starts (see render.yaml). It fills a
// brand-new database with the demo artists and services, exactly once: as soon
// as anyone is in the database, it never touches it again. Live production never
// gets demo data.

const [people] = isLiveProduction ? [] : await db.select({ value: count() }).from(users);

if (isLiveProduction) {
  logger.info("Live production: no demo data.");
  await pool.end();
} else if ((people?.value ?? 0) > 0) {
  logger.info("The database already has data, so the demo seed is skipped.");
  await pool.end();
} else {
  await import("./seed.ts"); // seeds, then closes the pool itself
}
