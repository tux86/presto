import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { getYearlyReport } from "../services/reporting.service.js";
import type { AppEnv } from "../lib/types.js";

const reporting = new Hono<AppEnv>();
reporting.use("*", authMiddleware);

reporting.get("/", async (c) => {
  const userId = c.get("userId");
  const yearParam = c.req.query("year");
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  const report = await getYearlyReport(userId, year);
  return c.json(report);
});

export default reporting;
