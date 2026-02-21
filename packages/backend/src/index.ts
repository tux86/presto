import app from "./app.js";
import { config } from "./lib/config.js";

console.log(`🚀 Presto Backend running on http://localhost:${config.app.port}`);

const server = Bun.serve({
  port: config.app.port,
  fetch: app.fetch,
});

const shutdown = () => {
  console.log("Shutting down gracefully...");
  server.stop();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
