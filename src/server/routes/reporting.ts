import { Hono } from "hono";
import { reportsToCsv } from "../../core/csv.ts";
import { forCountry } from "../../core/holidays.ts";
import { summarizeYear } from "../../core/reporting.ts";
import { isLocale } from "../../core/types.ts";
import * as repo from "../../db/repo.ts";
import type { Env } from "../app.ts";
import { yearQuery } from "../schemas.ts";

function requestedYear(raw: string | undefined): number {
  return raw === undefined ? new Date().getUTCFullYear() : yearQuery.parse(raw);
}

function requestedLocale(raw: string | undefined) {
  return isLocale(raw) ? raw : "en";
}

export const reporting = new Hono<Env>()

  .get("/reporting", (c) => {
    const year = requestedYear(c.req.query("year"));
    // Only completed reports count as revenue; drafts are still being edited.
    const current = repo.listReportContexts(c.var.db, { year, status: "completed" });
    const previous = repo.listReportContexts(c.var.db, { year: year - 1, status: "completed" });
    return c.json(summarizeYear(year, current, previous, (country) => forCountry(country)));
  })

  /** Spreadsheet export. Includes drafts — the year is not over yet. */
  .get("/export/csv", (c) => {
    const year = requestedYear(c.req.query("year"));
    const locale = requestedLocale(c.req.query("locale"));
    const csv = reportsToCsv(repo.listReportContexts(c.var.db, { year }), locale);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="presto-${year}.csv"`,
      },
    });
  })

  /** Whole-database dump, so the data is portable even though SQLite is not readable by hand. */
  .get("/export/json", (c) => {
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), ...repo.dumpAll(c.var.db) }, null, 2);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="presto-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  });
