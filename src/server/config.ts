import { join } from "node:path";
import pkg from "../../package.json" with { type: "json" };

/**
 * Presto runs with zero configuration. Every variable here has a working
 * default; the app never requires a .env file.
 */
export const config = {
  port: Number(process.env.PORT ?? 3001),
  appName: process.env.APP_NAME ?? "Presto",
  version: pkg.version,
  dataDir: process.env.DATA_DIR ?? "./data",
} as const;

export function databasePath(): string {
  return join(config.dataDir, "presto.db");
}
