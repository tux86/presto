import { HTTPException } from "hono/http-exception";
import type { ActivityReport, Client, Mission, Prisma } from "../../prisma/generated/prisma/client.js";
import { prisma } from "./prisma.js";

type OwnedModel = "activityReport" | "client" | "mission";

type OwnedModelResult = {
  activityReport: ActivityReport;
  client: Client;
  mission: Mission;
};

const labels: Record<OwnedModel, string> = {
  activityReport: "Activity",
  client: "Client",
  mission: "Mission",
};

/**
 * Ownership-checked lookup. Throws HTTPException(404) if not found or not owned by user.
 * Returns the found record.
 *
 * Note: There is a theoretical TOCTOU gap between this check and the subsequent mutation,
 * but this is acceptable for a single-user freelancer app.
 */
export async function findOwned<M extends OwnedModel>(
  model: M,
  id: string,
  userId: string,
): Promise<OwnedModelResult[M]> {
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
  return record as OwnedModelResult[M];
}

/** Standard include for activity report queries (entries + mission + client name). */
export const REPORT_INCLUDE = {
  entries: { orderBy: { date: "asc" as const } },
  mission: {
    include: { client: { select: { id: true, name: true, currency: true } } },
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
