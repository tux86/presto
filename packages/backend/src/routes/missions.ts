import { Hono } from "hono";
import { findOwned } from "../lib/helpers.js";
import { prisma } from "../lib/prisma.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const missions = new Hono<AppEnv>();
missions.use("*", authMiddleware);

missions.get("/", async (c) => {
  const userId = c.get("userId");
  const list = await prisma.mission.findMany({
    where: { userId },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return c.json(list);
});

missions.post("/", async (c) => {
  const userId = c.get("userId");
  const { name, clientId, dailyRate, startDate, endDate } = await c.req.json();

  if (!name || !clientId) {
    return c.json({ error: "Name and clientId are required" }, 400);
  }

  await findOwned("client", clientId, userId);

  const mission = await prisma.mission.create({
    data: {
      name,
      clientId,
      userId,
      dailyRate: dailyRate ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
    include: { client: { select: { id: true, name: true } } },
  });
  return c.json(mission, 201);
});

missions.put("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = await c.req.json();

  await findOwned("mission", id, userId);

  const mission = await prisma.mission.update({
    where: { id },
    data: {
      name: data.name,
      clientId: data.clientId,
      dailyRate: data.dailyRate,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      isActive: data.isActive,
    },
    include: { client: { select: { id: true, name: true } } },
  });
  return c.json(mission);
});

missions.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await findOwned("mission", id, userId);

  await prisma.mission.delete({ where: { id } });
  return c.json({ success: true });
});

export default missions;
