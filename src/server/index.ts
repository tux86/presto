import { openDb } from "../db/index.ts";
import { createApp } from "./app.ts";
import { config, databasePath } from "./config.ts";

const path = databasePath();
const db = openDb(path);
const app = createApp(db);

const server = Bun.serve({ port: config.port, fetch: app.fetch });

console.log(`${config.appName} v${config.version}`);
console.log(`  data  ${path}`);
console.log(`  http  http://localhost:${server.port}`);

function shutdown() {
  server.stop();
  db.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
