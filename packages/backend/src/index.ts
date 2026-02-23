import { closeDb } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import { config } from "./lib/config.js";

await runMigrations();

const { default: app } = await import("./app.js");

console.log(`🚀 Presto Backend running on http://localhost:${config.app.port}`);

const server = Bun.serve({
  port: config.app.port,
  fetch: app.fetch,
});

const shutdown = async () => {
  console.log("Shutting down gracefully...");
  server.stop();
  await closeDb();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
