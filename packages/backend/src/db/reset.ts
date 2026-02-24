import { activityReports, clients, closeDb, db, missions, reportEntries, userSettings, users } from "./index.js";

async function main() {
  const tables = [reportEntries, activityReports, missions, clients, userSettings, users];

  for (const table of tables) await db.delete(table);

  console.log("Database reset");
  await closeDb();
}

await main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
