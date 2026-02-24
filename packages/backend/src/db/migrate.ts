import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { logger } from "../lib/logger.js";
import { closeDb, db } from "./index.js";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: join(import.meta.dir, "migrations/pg") });
  logger.success("Migrations applied");
}

// Allow running as standalone script: bun run src/db/migrate.ts
if (import.meta.main) {
  await runMigrations();
  await closeDb();
}
