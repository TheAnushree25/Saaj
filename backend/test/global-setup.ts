import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/** Runs once before all tests: wipes the test database and rebuilds it from the migrations. */
export default async function setup() {
  const url = process.env.DATABASE_URL ?? "";
  // A safety catch: never wipe a database that is not obviously a test one.
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(`Refusing to reset ${url}: its name must contain "test".`);
  }

  const pool = new pg.Pool({ connectionString: url });
  await pool.query(`
    drop schema if exists public cascade;
    drop schema if exists drizzle cascade;
    drop schema if exists pgboss cascade;
    create schema public;
  `);
  await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
  await pool.end();
}
