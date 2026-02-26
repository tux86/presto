import { LogLevels } from "consola";
import { closeDb } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import { config } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { initExchangeRates, stopExchangeRates } from "./services/exchange-rate.service.js";

const level = LogLevels[config.app.logLevel as keyof typeof LogLevels];
if (level !== undefined) logger.level = level;

await runMigrations();
if (config.app.demoData) {
  const { seedDemoDataIfEmpty } = await import("./db/seed.js");
  await seedDemoDataIfEmpty();
}
await initExchangeRates();

const { default: app } = await import("./app.js");

logger.success(`Presto Backend running on http://localhost:${config.app.port}`);

const server = Bun.serve({
  port: config.app.port,
  fetch: app.fetch,
});

const shutdown = async () => {
  logger.info("Shutting down gracefully...");
  stopExchangeRates();
  server.stop();
  await closeDb();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
