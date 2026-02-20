import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config, getPublicConfig } from "./lib/config.js";
import auth from "./routes/auth.js";
import clients from "./routes/clients.js";
import missions from "./routes/missions.js";
import activityReports from "./routes/activity-reports.js";
import reporting from "./routes/reporting.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: config.cors.origins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.route("/api/auth", auth);
app.route("/api/clients", clients);
app.route("/api/missions", missions);
app.route("/api/activity-reports", activityReports);
app.route("/api/reporting", reporting);

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.get("/api/config", (c) => c.json(getPublicConfig()));

export default app;
