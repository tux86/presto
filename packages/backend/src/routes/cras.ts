import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AppEnv } from "../lib/types.js";
import {
  createCraWithEntries,
  autoFillCra,
  clearCra,
  recalculateTotalDays,
} from "../services/cra.service.js";
import { generateCraPdf } from "../services/pdf.service.js";

const cras = new Hono<AppEnv>();
cras.use("*", authMiddleware);

// List CRAs with optional filters
cras.get("/", async (c) => {
  const userId = c.get("userId");
  const year = c.req.query("year");
  const month = c.req.query("month");
  const missionId = c.req.query("missionId");

  const where: Record<string, unknown> = { userId };
  if (year) where.year = parseInt(year);
  if (month) where.month = parseInt(month);
  if (missionId) where.missionId = missionId;

  const list = await prisma.cra.findMany({
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

// Create CRA
cras.post("/", async (c) => {
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

  const existing = await prisma.cra.findUnique({
    where: { missionId_month_year: { missionId, month, year } },
  });
  if (existing) {
    return c.json({ error: "Activity already exists for this mission/month/year" }, 409);
  }

  const cra = await createCraWithEntries(userId, missionId, month, year);
  return c.json(cra, 201);
});

// Get CRA detail
cras.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const cra = await prisma.cra.findFirst({
    where: { id, userId },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });

  if (!cra) {
    return c.json({ error: "Activity not found" }, 404);
  }

  return c.json(cra);
});

// Update CRA (status, note)
cras.put("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = await c.req.json();

  const existing = await prisma.cra.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  const cra = await prisma.cra.update({
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
  return c.json(cra);
});

// Delete CRA
cras.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await prisma.cra.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  await prisma.cra.delete({ where: { id } });
  return c.json({ success: true });
});

// Batch update entries
cras.patch("/:id/entries", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { entries } = await c.req.json();

  const existing = await prisma.cra.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  for (const entry of entries) {
    await prisma.craEntry.update({
      where: { id: entry.id },
      data: {
        value: entry.value !== undefined ? entry.value : undefined,
        task: entry.task !== undefined ? entry.task : undefined,
      },
    });
  }

  await recalculateTotalDays(id);

  const cra = await prisma.cra.findFirst({
    where: { id },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });

  return c.json(cra);
});

// Auto-fill working days
cras.patch("/:id/fill", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await prisma.cra.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  await autoFillCra(id);

  const cra = await prisma.cra.findFirst({
    where: { id },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });
  return c.json(cra);
});

// Clear CRA
cras.patch("/:id/clear", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing = await prisma.cra.findFirst({ where: { id, userId } });
  if (!existing) {
    return c.json({ error: "Activity not found" }, 404);
  }

  await clearCra(id);

  const cra = await prisma.cra.findFirst({
    where: { id },
    include: {
      entries: { orderBy: { date: "asc" } },
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });
  return c.json(cra);
});

// PDF export
cras.get("/:id/pdf", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const cra = await prisma.cra.findFirst({
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

  if (!cra) {
    return c.json({ error: "Activity not found" }, 404);
  }

  const pdfBuffer = await generateCraPdf(cra);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Presto-${cra.year}-${String(cra.month).padStart(2, "0")}-${cra.mission.client.name}.pdf"`,
    },
  });
});

export default cras;
