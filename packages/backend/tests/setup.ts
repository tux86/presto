import { afterAll } from "bun:test";
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";

// Drop and recreate schemas to ensure a clean state (drizzle schema holds migration journal)
await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
await db.execute(sql`DROP SCHEMA public CASCADE`);
await db.execute(sql`CREATE SCHEMA public`);
await runMigrations();

afterAll(async () => {
  await closeDb();
});
