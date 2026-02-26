import type { ReportStatus } from "@presto/shared";
import { HTTPException } from "hono/http-exception";

/** Strip sensitive fields from a user record (allowlist approach). */
export function sanitizeUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** Throws HTTPException(400) if the report status is not DRAFT. */
export function ensureDraft(report: { status: ReportStatus }) {
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
    .toLowerCase()
    .slice(0, 100)
    .replace(/-$/, "");
}

/** Parse a query param as integer, with optional min/max validation. */
export function parseIntParam(value: string | undefined, name: string, min?: number, max?: number): number | undefined {
  if (value === undefined) return undefined;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) throw new HTTPException(400, { message: `Invalid ${name}` });
  if (min !== undefined && n < min) throw new HTTPException(400, { message: `Invalid ${name}` });
  if (max !== undefined && n > max) throw new HTTPException(400, { message: `Invalid ${name}` });
  return n;
}
