import { HTTPException } from "hono/http-exception";
import type { Prisma } from "../../prisma/generated/prisma/client.js";
import { prisma } from "./prisma.js";

/**
 * Ownership-checked lookup. Throws HTTPException(404) if not found or not owned by user.
 */
export async function findOwned<T>(
  model: "activityReport" | "client" | "mission",
  id: string,
  userId: string,
): Promise<T> {
  const record = await (prisma[model] as Prisma.ActivityReportDelegate).findFirst({
    where: { id, userId },
  });
  if (!record) {
    const label = model === "activityReport" ? "Activity" : model.charAt(0).toUpperCase() + model.slice(1);
    throw new HTTPException(404, { message: `${label} not found` });
  }
  return record as T;
}

/** Standard include for activity report queries (entries + mission + client name). */
export const REPORT_INCLUDE = {
  entries: { orderBy: { date: "asc" as const } },
  mission: {
    include: { client: { select: { id: true, name: true } } },
  },
} satisfies Prisma.ActivityReportInclude;

/** Extended include for PDF export (full client + user select). */
export const REPORT_INCLUDE_PDF = {
  entries: { orderBy: { date: "asc" as const } },
  mission: {
    include: { client: true },
  },
  user: {
    select: { firstName: true, lastName: true, company: true },
  },
} satisfies Prisma.ActivityReportInclude;
