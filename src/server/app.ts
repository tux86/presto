import { existsSync } from "node:fs";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { holidayCountries, holidayMap } from "../core/holidays.ts";
import type { Db } from "../db/index.ts";
import * as repo from "../db/repo.ts";
import { config } from "./config.ts";
import { InUseError } from "./errors.ts";
import { entities } from "./routes/entities.ts";
import { reporting } from "./routes/reporting.ts";
import { reports } from "./routes/reports.ts";

export interface Env {
  Variables: { db: Db };
}

/** First line of a Zod failure, which is the only part a single user needs. */
function zodMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

const UI_DIR = "./dist/ui";

/**
 * Public-holiday dates for the countries and years in play, so the browser can
 * shade a calendar without shipping the multi-megabyte rule set. Names are not
 * included here: the dashboard only needs to know which dates are holidays,
 * and the editor asks for named, localized ones when it loads a report.
 */
function holidayCalendars(
  clients: { holidayCountry: string }[],
  reports: { year: number; holidayCountry: string }[],
): Record<string, string[]> {
  const thisYear = new Date().getUTCFullYear();
  const years = new Set<number>([thisYear, thisYear + 1]);
  for (const report of reports) years.add(report.year);

  const countries = new Set<string>();
  for (const client of clients) countries.add(client.holidayCountry);
  for (const report of reports) countries.add(report.holidayCountry);

  const out: Record<string, string[]> = {};
  for (const country of countries) {
    const dates: string[] = [];
    for (const year of years) dates.push(...Object.keys(holidayMap(country, year)));
    out[country] = dates.sort();
  }
  return out;
}

export function createApp(db: Db) {
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    c.set("db", db);
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    if (err instanceof ZodError) return c.json({ error: zodMessage(err) }, 400);
    if (err instanceof InUseError) {
      return c.json({ error: err.message, code: "IN_USE", entity: err.entity, count: err.count }, 409);
    }
    console.error(`${c.req.method} ${c.req.path}`, err);
    return c.json({ error: "Internal server error" }, 500);
  });

  const api = new Hono<Env>()
    /**
     * Everything the UI needs to start, in one request. The whole dataset for a
     * single freelancer is tens of kilobytes, so there is nothing to paginate
     * and no cache layer to keep coherent.
     */
    .get("/state", (c) => {
      repo.ensureDefaultCompany(c.var.db);
      const clients = repo.listClients(c.var.db);
      const reports = repo.listReports(c.var.db);
      return c.json({
        app: { name: config.appName, version: config.version },
        countries: holidayCountries(),
        companies: repo.listCompanies(c.var.db),
        clients,
        missions: repo.listMissions(c.var.db),
        reports,
        holidays: holidayCalendars(clients, reports),
      });
    })
    .get("/health", (c) => c.json({ status: "ok", version: config.version }))
    .route("/", entities)
    .route("/", reports)
    .route("/", reporting);

  app.route("/api", api);
  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

  // Built UI, when there is one. In development Vite serves it instead.
  if (existsSync(UI_DIR)) {
    app.use("/assets/*", async (c, next) => {
      await next();
      // Vite fingerprints these filenames, so they can be cached forever.
      if (c.res.status === 200) c.res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    });
    app.use("*", serveStatic({ root: UI_DIR }));
    app.get("*", serveStatic({ root: UI_DIR, path: "index.html" }));
  }

  return app;
}
