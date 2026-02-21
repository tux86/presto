import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { findOwned } from "../lib/helpers.js";
import { prisma } from "../lib/prisma.js";
import { createClientSchema, updateClientSchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const clients = new Hono<AppEnv>();
clients.use("*", authMiddleware);

clients.get("/", async (c) => {
  const userId = c.get("userId");
  const list = await prisma.client.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return c.json(list);
});

clients.post("/", zValidator("json", createClientSchema), async (c) => {
  const userId = c.get("userId");
  const { name, businessId, email, address } = c.req.valid("json");

  const client = await prisma.client.create({
    data: { name, businessId, email, address, userId },
  });
  return c.json(client, 201);
});

clients.put("/:id", zValidator("json", updateClientSchema), async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = c.req.valid("json");

  await findOwned("client", id, userId);

  const client = await prisma.client.update({
    where: { id },
    data: {
      name: data.name,
      businessId: data.businessId,
      email: data.email,
      address: data.address,
    },
  });
  return c.json(client);
});

clients.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  await findOwned("client", id, userId);

  await prisma.client.delete({ where: { id } });
  return c.json({ success: true });
});

export default clients;
