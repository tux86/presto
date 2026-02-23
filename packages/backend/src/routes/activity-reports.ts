import { zValidator } from "@hono/zod-validator";
import { and, count, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { findOwned, REPORT_WITH, REPORT_WITH_PDF, updateReturning } from "../db/helpers.js";
import { activityReports, clients, db, reportEntries } from "../db/index.js";
import { ensureDraft, slugify } from "../lib/helpers.js";
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

const activityReportsRouter = new Hono<AppEnv>();
activityReportsRouter.use("*", authMiddleware);

/** Fetch a report by id with standard includes and enrich it. */
async function fetchEnrichedReport(id: string, userId: string) {
  const report = await db.query.activityReports.findFirst({
    where: and(eq(activityReports.id, id), eq(activityReports.userId, userId)),
    with: REPORT_WITH,
  });
  return enrichReport(report ?? null);
}

// List activity reports with optional filters
activityReportsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const yearParam = c.req.query("year");
  const monthParam = c.req.query("month");
  const missionId = c.req.query("missionId");

  const conditions = [eq(activityReports.userId, userId)];

  if (yearParam) {
    const parsed = parseInt(yearParam, 10);
    if (Number.isNaN(parsed)) throw new HTTPException(400, { message: "Invalid year parameter" });
    conditions.push(eq(activityReports.year, parsed));
  }
  if (monthParam) {
    const parsed = parseInt(monthParam, 10);
    if (Number.isNaN(parsed)) throw new HTTPException(400, { message: "Invalid month parameter" });
    conditions.push(eq(activityReports.month, parsed));
  }
  if (missionId) conditions.push(eq(activityReports.missionId, missionId));

  const list = await db.query.activityReports.findMany({
    where: and(...conditions),
    with: REPORT_WITH,
    orderBy: (ar, { desc }) => [desc(ar.year), desc(ar.month)],
  });
  return c.json(enrichReport(list));
});

// Create activity report
activityReportsRouter.post("/", zValidator("json", createReportSchema), async (c) => {
  const userId = c.get("userId");
  const { month, year, missionId } = c.req.valid("json");

  const mission = await findOwned("mission", missionId, userId);

  // Check for existing report with same mission/month/year
  const existing = await db.query.activityReports.findFirst({
    where: and(
      eq(activityReports.missionId, missionId),
      eq(activityReports.month, month),
      eq(activityReports.year, year),
    ),
  });
  if (existing) {
    throw new HTTPException(409, { message: "Activity already exists for this mission/month/year" });
  }

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, mission.clientId),
    columns: { holidayCountry: true },
  });
  if (!client) {
    throw new HTTPException(404, { message: "Client not found" });
  }

  const report = await createReportWithEntries(userId, missionId, month, year, client.holidayCountry);
  c.header("Location", `/api/activity-reports/${report.id}`);
  return c.json(report, 201);
});

// Get activity report detail
activityReportsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const report = await fetchEnrichedReport(id, userId);
  if (!report) {
    throw new HTTPException(404, { message: "Activity not found" });
  }
  return c.json(report);
});

// Update activity report (status, note)
activityReportsRouter.patch("/:id", zValidator("json", updateReportSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = c.req.valid("json");

  const existing = await findOwned("activityReport", id, userId);

  // Allow status changes (including revert to draft), but block note edits on completed reports
  if (existing.status === "COMPLETED" && data.note !== undefined && data.status !== "DRAFT") {
    throw new HTTPException(400, { message: "Cannot modify a completed report" });
  }

  await updateReturning(activityReports, id, {
    status: data.status,
    note: data.note,
    updatedAt: new Date(),
  });

  return c.json(await fetchEnrichedReport(id, userId));
});

// Delete activity report
activityReportsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const report = await findOwned("activityReport", id, userId);
  ensureDraft(report);

  await db.delete(activityReports).where(eq(activityReports.id, id));
  return c.body(null, 204);
});

// Batch update entries
activityReportsRouter.patch("/:id/entries", zValidator("json", updateEntriesSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { entries } = c.req.valid("json");

  const report = await findOwned("activityReport", id, userId);
  ensureDraft(report);

  // Verify all entry IDs belong to this report
  const entryIds = entries.map((e) => e.id);
  const ownedResult = await db
    .select({ value: count() })
    .from(reportEntries)
    .where(and(inArray(reportEntries.id, entryIds), eq(reportEntries.reportId, id)));
  const ownedCount = ownedResult[0]?.value ?? 0;
  if (ownedCount !== entryIds.length) {
    throw new HTTPException(400, { message: "One or more entries do not belong to this report" });
  }

  await db.transaction(async (tx) => {
    for (const entry of entries) {
      const setData: Record<string, unknown> = {};
      if (entry.value !== undefined) setData.value = entry.value;
      if (entry.note !== undefined) setData.note = entry.note;
      if (Object.keys(setData).length > 0) {
        await tx.update(reportEntries).set(setData).where(eq(reportEntries.id, entry.id));
      }
    }
  });

  await recalculateTotalDays(id);
  return c.json(await fetchEnrichedReport(id, userId));
});

// Auto-fill working days
activityReportsRouter.patch("/:id/fill", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const report = await findOwned("activityReport", id, userId);
  ensureDraft(report);
  await autoFillReport(id);
  return c.json(await fetchEnrichedReport(id, userId));
});

// Clear activity report
activityReportsRouter.patch("/:id/clear", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const report = await findOwned("activityReport", id, userId);
  ensureDraft(report);
  await clearReport(id);
  return c.json(await fetchEnrichedReport(id, userId));
});

// PDF export
activityReportsRouter.get("/:id/pdf", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const localeParam = c.req.query("locale");
  const locale = localeParam === "fr" ? "fr" : "en";

  const report = await db.query.activityReports.findFirst({
    where: and(eq(activityReports.id, id), eq(activityReports.userId, userId)),
    with: REPORT_WITH_PDF,
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

export default activityReportsRouter;
