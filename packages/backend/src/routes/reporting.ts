import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db, userSettings } from "../db/index.js";
import { activityReports, missions } from "../db/schema/pg.schema.js";
import { logger } from "../lib/logger.js";
import type { AppEnv } from "../lib/types.js";
import { parseIntParam } from "../lib/utils.js";
import { authMiddleware } from "../middleware/auth.js";
import { ExchangeRateError } from "../services/exchange-rate.service.js";
import { getYearlyReport } from "../services/reporting.service.js";

const reporting = new Hono<AppEnv>();
reporting.use("*", authMiddleware);

reporting.get("/", async (c) => {
  const userId = c.get("userId");
  const year = parseIntParam(c.req.query("year"), "year", 2000, 2100) ?? new Date().getUTCFullYear();

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { baseCurrency: true },
  });
  const baseCurrency = settings?.baseCurrency ?? "EUR";

  try {
    const report = await getYearlyReport(userId, year, baseCurrency);
    return c.json(report);
  } catch (error) {
    if (error instanceof ExchangeRateError) {
      logger.error("Reporting error:", error.message);
      throw new HTTPException(503, { message: error.message });
    }
    throw error;
  }
});

// Nouvel endpoint pour la consommation des missions
reporting.get("/mission-consumption", async (c) => {
  const userId = c.get("userId");
  const year = parseIntParam(c.req.query("year"), "year", 2000, 2100) ?? new Date().getUTCFullYear();

  // Récupérer les missions avec plannedDays
  const missionsWithPlannedDays = await db
    .select({
      missionId: missions.id,
      missionName: missions.name,
      plannedDays: missions.plannedDays,
      clientId: missions.clientId,
    })
    .from(missions)
    .where(eq(missions.userId, userId));

  // Calculer les jours travaillés par mission (via activity_reports)
  const daysWorkedByMission = await db
    .select({
      missionId: activityReports.missionId,
      daysWorked: sql<number>`SUM(${activityReports.totalDays})`.as("days_worked"),
    })
    .from(activityReports)
    .where(sql`EXTRACT(YEAR FROM ${activityReports.createdAt}) = ${year} AND ${activityReports.userId} = ${userId}`)
    .groupBy(activityReports.missionId);

  // Fusionner les données
  const consumptionData = missionsWithPlannedDays.map((mission) => {
    const daysWorkedEntry = daysWorkedByMission.find((dw) => dw.missionId === mission.missionId);
    const daysWorked = daysWorkedEntry?.daysWorked || 0;
    const isOverconsumed = daysWorked > mission.plannedDays;

    return {
      missionId: mission.missionId,
      missionName: mission.missionName,
      clientId: mission.clientId,
      plannedDays: mission.plannedDays,
      daysWorked,
      isOverconsumed,
    };
  });

  return c.json(consumptionData);
});

export default reporting;
