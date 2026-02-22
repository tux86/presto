import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";
import { getYearlyReport } from "../services/reporting.service.js";

const reporting = new Hono<AppEnv>();
reporting.use("*", authMiddleware);

reporting.get("/", async (c) => {
  const userId = c.get("userId");
  const yearParam = c.req.query("year");
  let year = new Date().getFullYear();
  if (yearParam) {
    year = parseInt(yearParam, 10);
    if (Number.isNaN(year)) throw new HTTPException(400, { message: "Invalid year parameter" });
  }

  const report = await getYearlyReport(userId, year);
  return c.json(report);
});

export default reporting;
