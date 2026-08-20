import { Hono } from "hono";
import { compactDays, compactNotes, copyWeekdayPattern, fillWorkdays, reportGrid } from "../../core/grid.ts";
import { forCountry, holidayMap } from "../../core/holidays.ts";
import { isLocale, type Report, type ReportStatus } from "../../core/types.ts";
import * as repo from "../../db/repo.ts";
import { pdfFilename, renderReportPdf } from "../../pdf/report.tsx";
import type { Env } from "../app.ts";
import { badRequest, required } from "../errors.ts";
import { reportInput, reportPatch, yearQuery } from "../schemas.ts";

/** The month immediately before this one, rolling over the year. */
function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/**
 * A completed report is a document that has been sent. Its content is frozen;
 * only the private note and the status itself stay editable, so the report can
 * be deliberately reverted to draft.
 */
function assertEditable(
  report: Report,
  patch: { status?: ReportStatus; days?: unknown; dayNotes?: unknown; note?: unknown },
) {
  if (report.status !== "completed") return;
  if (patch.status === "draft") return;
  if (patch.days !== undefined || patch.dayNotes !== undefined || patch.note !== undefined) {
    badRequest("This report is completed. Revert it to draft before editing.");
  }
}

/** Mission date ranges are a promise about when work could happen. Enforce them. */
function assertWithinMissionDates(
  mission: { startDate: string | null; endDate: string | null },
  year: number,
  month: number,
) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = `${year}-${String(month).padStart(2, "0")}-31`;
  if (mission.startDate && last < mission.startDate) {
    badRequest(`This mission starts on ${mission.startDate}. Pick a later month.`);
  }
  if (mission.endDate && first > mission.endDate) {
    badRequest(`This mission ended on ${mission.endDate}. Pick an earlier month.`);
  }
}

export const reports = new Hono<Env>()

  .get("/reports", (c) => {
    const raw = c.req.query("year");
    const year = raw === undefined ? undefined : yearQuery.parse(raw);
    return c.json(repo.listReports(c.var.db, year));
  })

  .get("/reports/:id", (c) => {
    const ctx = required(repo.getReportContext(c.var.db, c.req.param("id")), "Report");
    const raw = c.req.query("locale");
    const locale = isLocale(raw) ? raw : "en";
    // Named and localized, so the editor can label each holiday without the
    // holiday database being present in the browser.
    return c.json({ ...ctx, holidays: holidayMap(ctx.report.holidayCountry, ctx.report.year, locale) });
  })

  .post("/reports", async (c) => {
    const { missionId, year, month } = reportInput.parse(await c.req.json());
    const mission = required(repo.getMission(c.var.db, missionId), "Mission");
    const client = required(repo.getClient(c.var.db, mission.clientId), "Client");

    assertWithinMissionDates(mission, year, month);
    if (repo.findReport(c.var.db, missionId, year, month)) {
      badRequest("A report already exists for this mission and month.");
    }

    // Snapshot the rate and holiday calendar so later edits to the mission or
    // client cannot silently rewrite history.
    const report = repo.createReport(c.var.db, {
      missionId,
      year,
      month,
      dailyRate: mission.dailyRate,
      holidayCountry: client.holidayCountry,
    });
    return c.json(report, 201);
  })

  .patch("/reports/:id", async (c) => {
    const id = c.req.param("id");
    const report = required(repo.getReport(c.var.db, id), "Report");
    const patch = reportPatch.parse(await c.req.json());
    assertEditable(report, patch);

    return c.json(
      repo.updateReport(c.var.db, id, {
        ...patch,
        days: patch.days && compactDays(patch.days),
        dayNotes: patch.dayNotes && compactNotes(patch.dayNotes),
      }),
    );
  })

  .delete("/reports/:id", (c) => {
    const id = c.req.param("id");
    const report = required(repo.getReport(c.var.db, id), "Report");
    if (report.status === "completed") badRequest("Revert this report to draft before deleting it.");
    repo.deleteReport(c.var.db, id);
    return c.body(null, 204);
  })

  /** Mark every workday in the month as a full day. */
  .post("/reports/:id/fill", (c) => {
    const id = c.req.param("id");
    const report = required(repo.getReport(c.var.db, id), "Report");
    assertEditable(report, { days: {} });
    const days = fillWorkdays(report.year, report.month, forCountry(report.holidayCountry));
    return c.json(repo.updateReport(c.var.db, id, { days }));
  })

  .post("/reports/:id/clear", (c) => {
    const id = c.req.param("id");
    const report = required(repo.getReport(c.var.db, id), "Report");
    assertEditable(report, { days: {} });
    return c.json(repo.updateReport(c.var.db, id, { days: {}, dayNotes: {} }));
  })

  /**
   * Carry last month's working rhythm into this one.
   * Copies by weekday, not by date — the two months have different weekends
   * and holidays, so copying the grid itself would produce wrong data.
   */
  .post("/reports/:id/copy-previous", (c) => {
    const id = c.req.param("id");
    const report = required(repo.getReport(c.var.db, id), "Report");
    assertEditable(report, { days: {} });

    const prev = previousMonth(report.year, report.month);
    const source = repo.findReport(c.var.db, report.missionId, prev.year, prev.month);
    if (!source) badRequest("There is no report for the previous month on this mission.");
    if (Object.keys(source.days).length === 0) badRequest("Last month's report is empty — nothing to copy.");

    const holidays = forCountry(report.holidayCountry);
    const days = copyWeekdayPattern(reportGrid(source, holidays), report.year, report.month, holidays);
    return c.json(repo.updateReport(c.var.db, id, { days }));
  })

  /**
   * The PDF the client receives. Drafts are refused: exporting a half-filled
   * month is almost always a mistake, and completing it first is one click.
   */
  .get("/reports/:id/pdf", async (c) => {
    const ctx = required(repo.getReportContext(c.var.db, c.req.param("id")), "Report");
    if (ctx.report.status === "draft") {
      badRequest("Mark this report as completed before exporting it.");
    }
    const raw = c.req.query("locale");
    const pdf = await renderReportPdf(ctx, isLocale(raw) ? raw : "en");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename(ctx)}"`,
      },
    });
  });
