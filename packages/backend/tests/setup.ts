import { afterAll } from "bun:test";
import { closeDb } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";

// In-memory SQLite: starts empty, migrations create all tables
await runMigrations();

afterAll(async () => {
  await closeDb();
});
