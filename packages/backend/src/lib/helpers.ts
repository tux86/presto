import { HTTPException } from "hono/http-exception";
import type { Prisma } from "../../prisma/generated/prisma/client.js";
import { prisma } from "./prisma.js";

type OwnedModel = "activityReport" | "client" | "mission";

const labels: Record<OwnedModel, string> = {
  activityReport: "Activity",
  client: "Client",
  mission: "Mission",
};

/**
 * Ownership-checked lookup. Throws HTTPException(404) if not found or not owned by user.
 * Returns the found record.
 */
export async function findOwned<T = unknown>(model: OwnedModel, id: string, userId: string): Promise<T> {
  let record: unknown;
  switch (model) {
    case "activityReport":
      record = await prisma.activityReport.findFirst({ where: { id, userId } });
      break;
    case "client":
      record = await prisma.client.findFirst({ where: { id, userId } });
      break;
    case "mission":
      record = await prisma.mission.findFirst({ where: { id, userId } });
      break;
  }
  if (!record) {
    throw new HTTPException(404, { message: `${labels[model]} not found` });
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

/** Throws HTTPException(400) if the report status is not DRAFT. */
export function ensureDraft(report: { status: string }) {
  if (report.status === "COMPLETED") {
    throw new HTTPException(400, { message: "Cannot modify a completed report" });
  }
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
