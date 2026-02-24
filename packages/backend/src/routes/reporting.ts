import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db, userSettings } from "../db/index.js";
import type { AppEnv } from "../lib/types.js";
import { parseIntParam } from "../lib/utils.js";
import { authMiddleware } from "../middleware/auth.js";
import { getYearlyReport } from "../services/reporting.service.js";

const reporting = new Hono<AppEnv>();
reporting.use("*", authMiddleware);

reporting.get("/", async (c) => {
  const userId = c.get("userId");
  const year = parseIntParam(c.req.query("year"), "year", 2000, 2100) ?? new Date().getFullYear();

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { baseCurrency: true },
  });
  const baseCurrency = settings?.baseCurrency ?? "EUR";

  try {
    const report = await getYearlyReport(userId, year, baseCurrency);
    return c.json(report);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Exchange rate unavailable")) {
      throw new HTTPException(503, { message: error.message });
    }
    throw error;
  }
});

export default reporting;
