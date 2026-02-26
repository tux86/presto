import { existsSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { config, getPublicConfig } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import activityReports from "./routes/activity-reports.js";
import auth from "./routes/auth.js";
import clients from "./routes/clients.js";
import companies from "./routes/companies.js";
import missions from "./routes/missions.js";
import reporting from "./routes/reporting.js";
import settings from "./routes/settings.js";

const app = new Hono();

app.use(
  "*",
  honoLogger((msg) => logger.info(msg)),
);
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
    strictTransportSecurity: "max-age=31536000; includeSubDomains",
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
    },
    xFrameOptions: "DENY",
  }),
);
app.use("*", bodyLimit({ maxSize: 1024 * 1024 })); // 1 MB
app.use(
  "*",
  cors({
    origin: config.cors.origins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

/** Detect FK constraint errors (PostgreSQL code 23503), including Drizzle-wrapped errors. */
function isForeignKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  if (e.code === "23503") return true;
  if (e.cause && typeof e.cause === "object") return (e.cause as Record<string, unknown>).code === "23503";
  return false;
}

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.status >= 500) logger.error(`${c.req.method} ${c.req.path}:`, err.message);
    return c.json({ error: err.message }, err.status);
  }

  if (isForeignKeyError(err)) {
    logger.warn(`FK constraint: ${c.req.method} ${c.req.path}`);
    return c.json({ error: "Cannot delete: record has associated data" }, 409);
  }

  logger.error(
    `Unhandled error: ${c.req.method} ${c.req.path}:`,
    err instanceof Error ? (err.stack ?? err.message) : String(err),
  );
  return c.json({ error: "Internal server error" }, 500);
});

// API routes
app.route("/api/auth", auth);
app.route("/api/clients", clients);
app.route("/api/companies", companies);
app.route("/api/missions", missions);
app.route("/api/activity-reports", activityReports);
app.route("/api/reporting", reporting);
app.route("/api/settings", settings);

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
