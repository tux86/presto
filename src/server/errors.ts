import { HTTPException } from "hono/http-exception";

/** 404 with a consistent message. */
export function notFound(what: string): never {
  throw new HTTPException(404, { message: `${what} not found` });
}

export function badRequest(message: string): never {
  throw new HTTPException(400, { message });
}

/**
 * 409 raised when a row still has dependents.
 * The count travels to the UI so it can say what is in the way.
 */
export class InUseError extends Error {
  constructor(
    readonly entity: string,
    readonly count: number,
  ) {
    super(`Still referenced by ${count} ${entity}`);
    this.name = "InUseError";
  }
}

export function assertUnused(entity: string, count: number): void {
  if (count > 0) throw new InUseError(entity, count);
}

/** Return the row or 404 — the read-then-act pattern every route uses. */
export function required<T>(value: T | null | undefined, what: string): T {
  if (value == null) notFound(what);
  return value;
}
