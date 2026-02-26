import { logger } from "../lib/logger.js";
import {
  activityReports,
  clients,
  closeDb,
  companies,
  db,
  missions,
  reportEntries,
  userSettings,
  users,
} from "./index.js";

async function main() {
  const tables = [reportEntries, activityReports, missions, clients, companies, userSettings, users];

  for (const table of tables) await db.delete(table);

  logger.success("Database reset");
  await closeDb();
}

await main().catch((err) => {
  logger.error("Reset failed:", err);
  process.exit(1);
});
