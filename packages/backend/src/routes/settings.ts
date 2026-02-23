import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db, userSettings } from "../db/index.js";
import { config } from "../lib/config.js";
import { updateSettingsSchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const settings = new Hono<AppEnv>();
settings.use("*", authMiddleware);

async function getOrCreateSettings(userId: string) {
  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  if (existing) return existing;

  const { theme, locale, baseCurrency } = config.defaults;
  await db.insert(userSettings).values({ userId, theme, locale, baseCurrency });
  const created = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  if (!created) throw new HTTPException(500, { message: "Failed to create settings" });
  return created;
}

settings.get("/", async (c) => {
  const userId = c.get("userId");
  const row = await getOrCreateSettings(userId);
  return c.json(row);
});

settings.patch("/", zValidator("json", updateSettingsSchema), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");

  // Ensure row exists
  await getOrCreateSettings(userId);

  await db
    .update(userSettings)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(userSettings.userId, userId));

  const updated = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  return c.json(updated);
});

export default settings;
