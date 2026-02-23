import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { findOwned, insertReturning, updateReturning } from "../db/helpers.js";
import { clients, db } from "../db/index.js";
import { createClientSchema, updateClientSchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const clientsRouter = new Hono<AppEnv>();
clientsRouter.use("*", authMiddleware);

clientsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const list = await db.query.clients.findMany({
    where: eq(clients.userId, userId),
    orderBy: (cl, { asc }) => [asc(cl.name)],
  });
  return c.json(list);
});

clientsRouter.post("/", zValidator("json", createClientSchema), async (c) => {
  const userId = c.get("userId");
  const { name, email, phone, address, businessId, color, currency, holidayCountry } = c.req.valid("json");

  const client = await insertReturning(clients, {
    name,
    email: email ?? null,
    phone: phone ?? null,
    address: address ?? null,
    businessId: businessId ?? null,
    color: color ?? null,
    currency,
    holidayCountry,
    userId,
  });
  c.header("Location", `/api/clients/${client.id}`);
  return c.json(client, 201);
});

clientsRouter.patch("/:id", zValidator("json", updateClientSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = c.req.valid("json");

  await findOwned("client", id, userId);

  const client = await updateReturning(clients, id, {
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    businessId: data.businessId,
    color: data.color,
    currency: data.currency,
    holidayCountry: data.holidayCountry,
    updatedAt: new Date(),
  });
  return c.json(client);
});

clientsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await findOwned("client", id, userId);

  await db.delete(clients).where(eq(clients.id, id));
  return c.body(null, 204);
});

export default clientsRouter;
