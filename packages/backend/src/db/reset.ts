import { sql } from "drizzle-orm";
import { config } from "../lib/config.js";
import { activityReports, clients, closeDb, db, missions, reportEntries, users } from "./index.js";

async function main() {
  const { provider } = config.database;
  const tables = [reportEntries, activityReports, missions, clients, users];

  if (provider === "mysql") await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  for (const table of tables) await db.delete(table);
  if (provider === "mysql") await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

  console.log(`Database reset (${provider})`);
  await closeDb();
}

await main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
