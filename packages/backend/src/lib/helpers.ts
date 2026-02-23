import { HTTPException } from "hono/http-exception";

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
