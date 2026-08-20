/**
 * Write a consistent snapshot of the database to a file.
 *
 *   bun run backup                    # ./backups/presto-YYYY-MM-DD.db
 *   bun run backup /path/to/out.db
 *
 * Copying presto.db with `cp` while Presto is running can miss writes that are
 * still in the write-ahead log. SQLite's VACUUM INTO takes a proper snapshot
 * under a read transaction, and compacts it on the way out.
 */

import { Database } from "bun:sqlite";
import { mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { databasePath } from "../src/server/config.ts";

const source = databasePath();

if (!(await Bun.file(source).exists())) {
  console.error(`error: no database at ${source}`);
  process.exit(1);
}

const target = resolve(process.argv[2] ?? `./backups/presto-${new Date().toISOString().slice(0, 10)}.db`);

if (await Bun.file(target).exists()) {
  console.error(`error: ${target} already exists`);
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });

// Read-only: a backup must never be able to modify what it is backing up.
const db = new Database(source, { readonly: true, strict: true });
try {
  // VACUUM INTO does not accept a bound parameter, so the path is quoted the
  // way SQLite expects: single quotes, with any doubled.
  db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
} finally {
  db.close();
}

const { size } = statSync(target);
console.log(`Backed up ${source} → ${target} (${(size / 1024).toFixed(0)} KB)`);
