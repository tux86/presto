import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { findOwned, insertReturning, MISSION_WITH, updateReturning } from "../db/helpers.js";
import { db, missions } from "../db/index.js";
import { createMissionSchema, updateMissionSchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const missionsRouter = new Hono<AppEnv>();
missionsRouter.use("*", authMiddleware);

missionsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const list = await db.query.missions.findMany({
    where: eq(missions.userId, userId),
    with: MISSION_WITH,
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });
  return c.json(list);
});

missionsRouter.post("/", zValidator("json", createMissionSchema), async (c) => {
  const userId = c.get("userId");
  const { name, clientId, dailyRate, startDate, endDate } = c.req.valid("json");

  await findOwned("client", clientId, userId);

  const mission = await insertReturning(missions, {
    name,
    clientId,
    userId,
    dailyRate: dailyRate ?? null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  });

  // Fetch with client relation for response
  const result = await db.query.missions.findFirst({
    where: eq(missions.id, mission.id),
    with: MISSION_WITH,
  });

  c.header("Location", `/api/missions/${mission.id}`);
  return c.json(result, 201);
});

missionsRouter.patch("/:id", zValidator("json", updateMissionSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = c.req.valid("json");

  await findOwned("mission", id, userId);
  if (data.clientId) {
    await findOwned("client", data.clientId, userId);
  }

  await updateReturning(missions, id, {
    name: data.name,
    clientId: data.clientId,
    dailyRate: data.dailyRate,
    startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
    endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
    isActive: data.isActive,
    updatedAt: new Date(),
  });

  const result = await db.query.missions.findFirst({
    where: eq(missions.id, id),
    with: MISSION_WITH,
  });
  return c.json(result);
});

missionsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await findOwned("mission", id, userId);

  await db.delete(missions).where(eq(missions.id, id));
  return c.body(null, 204);
});

export default missionsRouter;
