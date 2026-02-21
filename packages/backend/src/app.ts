import { existsSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config, getPublicConfig } from "./lib/config.js";
import activityReports from "./routes/activity-reports.js";
import auth from "./routes/auth.js";
import clients from "./routes/clients.js";
import missions from "./routes/missions.js";
import reporting from "./routes/reporting.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: config.cors.origins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// API routes
app.route("/api/auth", auth);
app.route("/api/clients", clients);
app.route("/api/missions", missions);
app.route("/api/activity-reports", activityReports);
app.route("/api/reporting", reporting);

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.get("/api/config", (c) => c.json(getPublicConfig()));

// Serve frontend static files (Docker / production)
const publicDir = join(import.meta.dir, "../public");
if (existsSync(publicDir)) {
  // Cache Vite hashed assets for 1 year
  app.use("/assets/*", async (c, next) => {
    await next();
    if (c.res.status === 200) {
      c.res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    }
  });

  // Serve static files
  app.use("*", serveStatic({ root: "./public" }));

  // SPA fallback — serve index.html for non-API, non-file routes
  app.get("*", serveStatic({ root: "./public", path: "index.html" }));
}

export default app;
