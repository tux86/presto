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
 */
export async function findOwned(model: OwnedModel, id: string, userId: string): Promise<void> {
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
