import { join } from "node:path";
import { config } from "../lib/config.js";
import { closeDb, db } from "./index.js";

export async function runMigrations() {
  const { provider } = config.database;
  const baseDir = join(import.meta.dir, "migrations");

  if (provider === "mysql") {
    const { migrate } = await import("drizzle-orm/mysql2/migrator");
    await migrate(db as any, { migrationsFolder: join(baseDir, "mysql") });
  } else if (provider === "sqlite") {
    const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");
    migrate(db as any, { migrationsFolder: join(baseDir, "sqlite") });
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder: join(baseDir, "pg") });
  }

  console.log(`Migrations applied (${provider})`);
}

// Allow running as standalone script: bun run src/db/migrate.ts
if (import.meta.main) {
  await runMigrations();
  await closeDb();
}
