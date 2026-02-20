import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";
import { generateReportPdf } from "../services/pdf.service.js";
import {
  autoFillReport,
  clearReport,
  createReportWithEntries,
  recalculateTotalDays,
} from "../services/report.service.js";

const activityReports = new Hono<AppEnv>();
activityReports.use("*", authMiddleware);

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
    include: {
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
      entries: { orderBy: { date: "asc" } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return c.json(list);
});

// Create activity report
activityReports.post("/", async (c) => {
  const userId = c.get("userId");
  const { month, year, missionId } = await c.req.json();

  if (!month || !year || !missionId) {
    return c.json({ error: "month, year, and missionId are required" }, 400);
  }

  const mission = await prisma.mission.findFirst({
    where: { id: missionId, userId },
  });
  if (!mission) {
    return c.json({ error: "Mission not found" }, 404);
  }

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

  const report = await prisma.activityReport.findFirst({
    where: { id, userId },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });

  if (!report) {
    return c.json({ error: "Activity not found" }, 404);
  }

  return c.json(report);
});

// Update activity report (status, note)
activityReports.put("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = await c.req.json();

  const existing = await prisma.activityReport.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  const report = await prisma.activityReport.update({
    where: { id },
    data: {
      status: data.status,
      note: data.note,
    },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });
  return c.json(report);
});

// Delete activity report
activityReports.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await prisma.activityReport.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  await prisma.activityReport.delete({ where: { id } });
  return c.json({ success: true });
});

// Batch update entries
activityReports.patch("/:id/entries", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { entries } = await c.req.json();

  const existing = await prisma.activityReport.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  for (const entry of entries) {
    await prisma.reportEntry.update({
      where: { id: entry.id },
      data: {
        value: entry.value !== undefined ? entry.value : undefined,
        task: entry.task !== undefined ? entry.task : undefined,
      },
    });
  }

  await recalculateTotalDays(id);

  const report = await prisma.activityReport.findFirst({
    where: { id },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });

  return c.json(report);
});

// Auto-fill working days
activityReports.patch("/:id/fill", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await prisma.activityReport.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  await autoFillReport(id);

  const report = await prisma.activityReport.findFirst({
    where: { id },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });
  return c.json(report);
});

// Clear activity report
activityReports.patch("/:id/clear", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await prisma.activityReport.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  await clearReport(id);

  const report = await prisma.activityReport.findFirst({
    where: { id },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });
  return c.json(report);
});

// PDF export
activityReports.get("/:id/pdf", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const locale = (c.req.query("locale") as "fr" | "en") || "fr";

  const report = await prisma.activityReport.findFirst({
    where: { id, userId },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: true },
      },
      user: {
        select: { firstName: true, lastName: true, company: true },
      },
    },
  });

  if (!report) {
    return c.json({ error: "Activity not found" }, 404);
  }

  const pdfBuffer = await generateReportPdf(report, locale);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Presto-${report.year}-${String(report.month).padStart(2, "0")}-${report.mission.client.name}.pdf"`,
    },
  });
});

export default activityReports;
