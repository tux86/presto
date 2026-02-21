import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { findOwned } from "../lib/helpers.js";
import { prisma } from "../lib/prisma.js";
import { createMissionSchema, updateMissionSchema } from "../lib/schemas.js";
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

missions.post("/", zValidator("json", createMissionSchema), async (c) => {
  const userId = c.get("userId");
  const { name, clientId, dailyRate, startDate, endDate } = c.req.valid("json");

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

missions.put("/:id", zValidator("json", updateMissionSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = c.req.valid("json");

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
