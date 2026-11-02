import { join } from "node:path";
import { openDb } from "../db/index.ts";
import { createApp } from "./app.ts";
import { handleMcp } from "./mcp.ts";

/**
 * MCP over stdio, for an agent on the same machine (Claude Desktop, Claude
 * Code, Cursor…). It opens the database itself, so the web server need not be
 * running; SQLite's WAL mode lets both share the file when it is.
 *
 * Stdout carries the protocol and nothing else: anything to say goes to stderr.
 */

// Agents start this from their own working directory, where "./data" would
// be a new, empty database. Default to the one next to the source instead.
const dataDir = process.env.DATA_DIR ?? join(import.meta.dir, "../../data");
const db = openDb(join(dataDir, "presto.db"));
const app = createApp(db, {});
const api = (path: string, init?: RequestInit) => app.request(path, init);

console.error(`Presto MCP server on stdio, data in ${dataDir}`);

for await (const line of console) {
  if (!line.trim()) continue;
  let message: unknown;
  try {
    message = JSON.parse(line);
  } catch {
    process.stdout.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`,
    );
    continue;
  }
  const reply = await handleMcp(message, api, { canWriteFiles: true });
  if (reply) process.stdout.write(`${JSON.stringify(reply)}\n`);
}

db.close();
