import { zValidator } from "@hono/zod-validator";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { findOwned, insertReturning, MISSION_WITH, updateReturning } from "../db/helpers.js";
import { activityReports, db, missions } from "../db/index.js";
import { createMissionSchema, updateMissionSchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const missionsRouter = new Hono<AppEnv>();
missionsRouter.use("*", authMiddleware);

async function fetchMissionWithClient(id: string) {
  return db.query.missions.findFirst({ where: eq(missions.id, id), with: MISSION_WITH });
}

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
  const { name, clientId, companyId, dailyRate, startDate, endDate } = c.req.valid("json");

  await findOwned("client", clientId, userId);
  await findOwned("company", companyId, userId);

  const mission = await insertReturning(missions, {
    name,
    clientId,
    companyId,
    userId,
    dailyRate: dailyRate ?? null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  });

  c.header("Location", `/api/missions/${mission.id}`);
  return c.json(await fetchMissionWithClient(mission.id), 201);
});

missionsRouter.patch("/:id", zValidator("json", updateMissionSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = c.req.valid("json");

  await findOwned("mission", id, userId);
  if (data.clientId) {
    await findOwned("client", data.clientId, userId);
  }
  if (data.companyId) {
    await findOwned("company", data.companyId, userId);
  }

  const { startDate, endDate, ...rest } = data;
  await updateReturning(missions, id, {
    ...rest,
    ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
    ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    updatedAt: new Date(),
  });

  return c.json(await fetchMissionWithClient(id));
});

missionsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await findOwned("mission", id, userId);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityReports)
    .where(eq(activityReports.missionId, id));
  if (count > 0) {
    return c.json(
      {
        error: "Cannot delete: has dependent records",
        code: "FK_CONSTRAINT",
        entity: "activity-reports",
        dependentCount: count,
      },
      409,
    );
  }

  await db.delete(missions).where(eq(missions.id, id));
  return c.body(null, 204);
});

export default missionsRouter;
