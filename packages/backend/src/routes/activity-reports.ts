import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { findOwned, REPORT_INCLUDE, REPORT_INCLUDE_PDF } from "../lib/helpers.js";
import { prisma } from "../lib/prisma.js";
import { createReportSchema, updateEntriesSchema } from "../lib/schemas.js";
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
async function fetchEnrichedReport(id: string) {
  const report = await prisma.activityReport.findFirst({
    where: { id },
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
  if (year) where.year = parseInt(year, 10);
  if (month) where.month = parseInt(month, 10);
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

  await findOwned("mission", missionId, userId);

  const existing = await prisma.activityReport.findUnique({
    where: { missionId_month_year: { missionId, month, year } },
  });
  if (existing) {
    return c.json({ error: "Activity already exists for this mission/month/year" }, 409);
  }

  const report = await createReportWithEntries(userId, missionId, month, year);
  return c.json(report, 201);
});

// Get activity report detail
activityReports.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await findOwned("activityReport", id, userId);

  const report = await prisma.activityReport.findFirst({
    where: { id },
    include: REPORT_INCLUDE,
  });
  return c.json(enrichReport(report));
});

// Update activity report (status, note)
activityReports.put("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = await c.req.json();

  await findOwned("activityReport", id, userId);

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

  await findOwned("activityReport", id, userId);

  await prisma.activityReport.delete({ where: { id } });
  return c.json({ success: true });
});

// Batch update entries
activityReports.patch("/:id/entries", zValidator("json", updateEntriesSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { entries } = c.req.valid("json");

  await findOwned("activityReport", id, userId);

  // Verify all entry IDs belong to this report
  const entryIds = entries.map((e) => e.id);
  const ownedCount = await prisma.reportEntry.count({
    where: { id: { in: entryIds }, reportId: id },
  });
  if (ownedCount !== entryIds.length) {
    return c.json({ error: "One or more entries do not belong to this report" }, 400);
  }

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.reportEntry.update({
        where: { id: entry.id },
        data: {
          value: entry.value !== undefined ? entry.value : undefined,
          task: entry.task !== undefined ? entry.task : undefined,
        },
      }),
    ),
  );

  await recalculateTotalDays(id);
  return c.json(await fetchEnrichedReport(id));
});

// Auto-fill working days
activityReports.patch("/:id/fill", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await findOwned("activityReport", id, userId);
  await autoFillReport(id);
  return c.json(await fetchEnrichedReport(id));
});

// Clear activity report
activityReports.patch("/:id/clear", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await findOwned("activityReport", id, userId);
  await clearReport(id);
  return c.json(await fetchEnrichedReport(id));
});

// PDF export
activityReports.get("/:id/pdf", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const locale = (c.req.query("locale") as "fr" | "en") || "fr";

  const report = await prisma.activityReport.findFirst({
    where: { id, userId },
    include: REPORT_INCLUDE_PDF,
  });
  if (!report) {
    return c.json({ error: "Activity not found" }, 404);
  }

  const pdfBuffer = await generateReportPdf(enrichReport(report), locale);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Presto-${report.year}-${String(report.month).padStart(2, "0")}-${report.mission.client.name}.pdf"`,
    },
  });
});

export default activityReports;
