import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ensureDraft, findOwned, REPORT_INCLUDE, REPORT_INCLUDE_PDF, slugify } from "../lib/helpers.js";
import { prisma } from "../lib/prisma.js";
import { createReportSchema, updateEntriesSchema, updateReportSchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";
import { generateReportPdf } from "../services/pdf.service.js";
import {
  autoFillReport,
  clearReport,
  createReportWithEntries,
  enrichReport,
  recalculateTotalDays,
} from "../services/report.service.js";

const activityReports = new Hono<AppEnv>();
activityReports.use("*", authMiddleware);

/** Fetch a report by id with standard includes and enrich it. */
async function fetchEnrichedReport(id: string, userId: string) {
  const report = await prisma.activityReport.findFirst({
    where: { id, userId },
    include: REPORT_INCLUDE,
  });
  return enrichReport(report);
}

// List activity reports with optional filters
activityReports.get("/", async (c) => {
  const userId = c.get("userId");
  const year = c.req.query("year");
  const month = c.req.query("month");
  const missionId = c.req.query("missionId");

  const where: Record<string, unknown> = { userId };
  if (year) {
    const parsed = parseInt(year, 10);
    if (Number.isNaN(parsed)) throw new HTTPException(400, { message: "Invalid year parameter" });
    where.year = parsed;
  }
  if (month) {
    const parsed = parseInt(month, 10);
    if (Number.isNaN(parsed)) throw new HTTPException(400, { message: "Invalid month parameter" });
    where.month = parsed;
  }
  if (missionId) where.missionId = missionId;

  const list = await prisma.activityReport.findMany({
    where,
    include: REPORT_INCLUDE,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return c.json(enrichReport(list));
});

// Create activity report
activityReports.post("/", zValidator("json", createReportSchema), async (c) => {
  const userId = c.get("userId");
  const { month, year, missionId } = c.req.valid("json");

  const mission = await findOwned("mission", missionId, userId);

  const existing = await prisma.activityReport.findUnique({
    where: { missionId_month_year: { missionId, month, year } },
  });
  if (existing) {
    throw new HTTPException(409, { message: "Activity already exists for this mission/month/year" });
  }

  const client = await prisma.client.findUniqueOrThrow({
    where: { id: mission.clientId },
    select: { holidayCountry: true },
  });

  const report = await createReportWithEntries(userId, missionId, month, year, client.holidayCountry);
  c.header("Location", `/api/activity-reports/${report.id}`);
  return c.json(report, 201);
});

// Get activity report detail
activityReports.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const report = await prisma.activityReport.findFirst({
    where: { id, userId },
    include: REPORT_INCLUDE,
  });
  if (!report) {
    throw new HTTPException(404, { message: "Activity not found" });
  }
  return c.json(enrichReport(report));
});

// Update activity report (status, note)
activityReports.patch("/:id", zValidator("json", updateReportSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = c.req.valid("json");

  const existing = await findOwned("activityReport", id, userId);

  // Allow setting status to COMPLETED, but block other mutations on completed reports
  if (existing.status === "COMPLETED" && data.status !== "COMPLETED") {
    throw new HTTPException(400, { message: "Cannot modify a completed report" });
  }
  if (existing.status === "COMPLETED" && data.note !== undefined) {
    throw new HTTPException(400, { message: "Cannot modify a completed report" });
  }

  const report = await prisma.activityReport.update({
    where: { id },
    data: { status: data.status, note: data.note },
    include: REPORT_INCLUDE,
  });
  return c.json(enrichReport(report));
});

// Delete activity report
activityReports.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const report = await findOwned("activityReport", id, userId);
  ensureDraft(report);

  await prisma.activityReport.delete({ where: { id } });
  return c.body(null, 204);
});

// Batch update entries
activityReports.patch("/:id/entries", zValidator("json", updateEntriesSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { entries } = c.req.valid("json");

  const report = await findOwned("activityReport", id, userId);
  ensureDraft(report);

  // Verify all entry IDs belong to this report
  const entryIds = entries.map((e) => e.id);
  const ownedCount = await prisma.reportEntry.count({
    where: { id: { in: entryIds }, reportId: id },
  });
  if (ownedCount !== entryIds.length) {
    throw new HTTPException(400, { message: "One or more entries do not belong to this report" });
  }

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.reportEntry.update({
        where: { id: entry.id },
        data: {
          value: entry.value !== undefined ? entry.value : undefined,
          note: entry.note !== undefined ? entry.note : undefined,
        },
      }),
    ),
  );

  await recalculateTotalDays(id);
  return c.json(await fetchEnrichedReport(id, userId));
});

// Auto-fill working days
activityReports.patch("/:id/fill", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const report = await findOwned("activityReport", id, userId);
  ensureDraft(report);
  await autoFillReport(id);
  return c.json(await fetchEnrichedReport(id, userId));
});

// Clear activity report
activityReports.patch("/:id/clear", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const report = await findOwned("activityReport", id, userId);
  ensureDraft(report);
  await clearReport(id);
  return c.json(await fetchEnrichedReport(id, userId));
});

// PDF export
activityReports.get("/:id/pdf", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const localeParam = c.req.query("locale");
  const locale = localeParam === "fr" ? "fr" : "en";

  const report = await prisma.activityReport.findFirst({
    where: { id, userId },
    include: REPORT_INCLUDE_PDF,
  });
  if (!report) {
    throw new HTTPException(404, { message: "Activity not found" });
  }
  if (report.status === "DRAFT") {
    throw new HTTPException(400, { message: "Cannot export a draft report. Mark it as completed first." });
  }

  const pdfBuffer = await generateReportPdf(enrichReport(report), locale);

  const filename = `activity-report-${slugify(report.mission.client.name)}-${slugify(report.mission.name)}-${report.year}-${String(report.month).padStart(2, "0")}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

export default activityReports;
