import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { MIGRATIONS } from "./schema.ts";

export type Db = Database;

/** 21 hex characters — short enough for a URL, far more entropy than needed. */
export function newId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 21);
}

export function now(): string {
  return new Date().toISOString();
}

/**
 * Bring a database up to the current schema version.
 * Already-applied migrations are skipped, so this is safe to call on every boot.
 */
export function migrate(db: Db): number {
  const start = Number((db.query("PRAGMA user_version").get() as { user_version: number }).user_version);

  for (let version = start; version < MIGRATIONS.length; version++) {
    const sql = MIGRATIONS[version]!;
    db.transaction(() => {
      db.exec(sql);
      // PRAGMA does not accept bound parameters; the value is a loop counter.
      db.exec(`PRAGMA user_version = ${version + 1}`);
    })();
  }

  return MIGRATIONS.length - start;
}

/**
 * Open (or create) the database at `path` and migrate it.
 * Pass ":memory:" for tests.
 */
export function openDb(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path, { create: true, strict: true });
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  return db;
}
