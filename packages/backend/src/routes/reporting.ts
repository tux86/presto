import { Hono } from "hono";
import type { AppEnv } from "../lib/types.js";
import { parseIntParam } from "../lib/utils.js";
import { authMiddleware } from "../middleware/auth.js";
import { getYearlyReport } from "../services/reporting.service.js";

const reporting = new Hono<AppEnv>();
reporting.use("*", authMiddleware);

reporting.get("/", async (c) => {
  const userId = c.get("userId");
  const year = parseIntParam(c.req.query("year"), "year", 2000, 2100) ?? new Date().getFullYear();

  const report = await getYearlyReport(userId, year);
  return c.json(report);
});

export default reporting;
