import { zValidator } from "@hono/zod-validator";
import { and, eq, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { findOwned, insertReturning, updateReturning } from "../db/helpers.js";
import { companies, db, missions } from "../db/index.js";
import { createCompanySchema, updateCompanySchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const companiesRouter = new Hono<AppEnv>();
companiesRouter.use("*", authMiddleware);

companiesRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const list = await db.query.companies.findMany({
    where: eq(companies.userId, userId),
    orderBy: (co, { asc }) => [asc(co.name)],
  });
  return c.json(list);
});

companiesRouter.post("/", zValidator("json", createCompanySchema), async (c) => {
  const userId = c.get("userId");
  const { name, address, businessId, isDefault } = c.req.valid("json");

  // Check if this is the first company for the user
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companies)
    .where(eq(companies.userId, userId));
  const forceDefault = count === 0;

  const wantDefault = forceDefault || isDefault === true;

  const company = await db.transaction(async (trx) => {
    // Only unset existing defaults when there are other companies (not the first one)
    if (wantDefault && !forceDefault) {
      await trx
        .update(companies)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(companies.userId, userId), eq(companies.isDefault, true)));
    }
    return insertReturning(
      companies,
      {
        name,
        address: address ?? null,
        businessId: businessId ?? null,
        isDefault: wantDefault,
        userId,
      },
      trx as typeof db,
    );
  });

  c.header("Location", `/api/companies/${company.id}`);
  return c.json(company, 201);
});

companiesRouter.patch("/:id", zValidator("json", updateCompanySchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = c.req.valid("json");

  const existing = await findOwned("company", id, userId);

  // Prevent unsetting the only default
  if (data.isDefault === false && existing.isDefault) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(and(eq(companies.userId, userId), eq(companies.isDefault, true), ne(companies.id, id)));
    if (count === 0) {
      throw new HTTPException(400, { message: "Cannot unset the only default company" });
    }
  }

  if (data.isDefault === true) {
    const company = await db.transaction(async (trx) => {
      await trx
        .update(companies)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(companies.userId, userId), eq(companies.isDefault, true), ne(companies.id, id)));
      return updateReturning(companies, id, { ...data, updatedAt: new Date() });
    });
    return c.json(company);
  }

  const company = await updateReturning(companies, id, { ...data, updatedAt: new Date() });
  return c.json(company);
});

companiesRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await findOwned("company", id, userId);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(missions)
    .where(eq(missions.companyId, id));
  if (count > 0) {
    return c.json(
      {
        error: "Cannot delete: has dependent records",
        code: "FK_CONSTRAINT",
        entity: "missions",
        dependentCount: count,
      },
      409,
    );
  }

  await db.delete(companies).where(eq(companies.id, id));
  return c.body(null, 204);
});

export default companiesRouter;
