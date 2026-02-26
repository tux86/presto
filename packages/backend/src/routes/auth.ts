import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getConnInfo } from "hono/bun";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { rateLimiter } from "hono-rate-limiter";
import { insertReturning, updateReturning } from "../db/helpers.js";
import { companies, db, users } from "../db/index.js";
import { config } from "../lib/config.js";
import { createToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const auth = new Hono<AppEnv>();

auth.use("*", async (c, next) => {
  if (
    config.auth.disabled &&
    c.req.path !== "/api/auth/me" &&
    c.req.path !== "/api/auth/profile" &&
    c.req.path !== "/api/auth/password"
  ) {
    throw new HTTPException(404, { message: "Auth is disabled" });
  }
  return next();
});

const noopMiddleware = createMiddleware(async (_c, next) => next());

const authLimiter =
  config.rateLimit.limit > 0
    ? rateLimiter({
        windowMs: config.rateLimit.windowMs,
        limit: config.rateLimit.limit,
        keyGenerator: (c) => {
          try {
            const info = getConnInfo(c);
            return info.remote.address ?? "127.0.0.1";
          } catch {
            // Behind a reverse proxy: trust x-real-ip (set by proxy) over x-forwarded-for (spoofable)
            return c.req.header("x-real-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
          }
        },
      })
    : noopMiddleware;

auth.post("/register", authLimiter, zValidator("json", registerSchema), async (c) => {
  if (!config.auth.registrationEnabled) {
    throw new HTTPException(403, { message: "Registration is disabled" });
  }

  const { password, firstName, lastName } = c.req.valid("json");
  const email = c.req.valid("json").email.toLowerCase();

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    logger.debug("Registration rejected: email already exists", email);
    throw new HTTPException(409, { message: "Email already registered" });
  }

  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: config.auth.bcryptCost,
  });

  const user = await db.transaction(async (trx) => {
    const u = await insertReturning(users, { email, password: hashedPassword, firstName, lastName }, trx as typeof db);
    await insertReturning(companies, { name: "Default", isDefault: true, userId: u.id }, trx as typeof db);
    return u;
  });

  const { password: _, ...safeUser } = user;
  const token = await createToken(user.id, user.email);
  logger.info("User registered:", email);
  return c.json({ token, user: safeUser }, 201);
});

auth.post("/login", authLimiter, zValidator("json", loginSchema), async (c) => {
  const { password } = c.req.valid("json");
  const email = c.req.valid("json").email.toLowerCase();

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    logger.debug("Login failed: unknown email", email);
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const valid = await Bun.password.verify(password, user.password);
  if (!valid) {
    logger.debug("Login failed: wrong password for", email);
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const { password: _, ...safeUser } = user;
  const token = await createToken(user.id, user.email);
  logger.debug("Login successful:", email);
  return c.json({ token, user: safeUser });
});

auth.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json(user);
});

auth.patch("/profile", authMiddleware, zValidator("json", updateProfileSchema), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");

  const updated = await updateReturning(users, userId, { ...body, updatedAt: new Date() });
  const { password: _, ...safeUser } = updated;
  return c.json(safeUser);
});

auth.patch("/password", authMiddleware, zValidator("json", changePasswordSchema), async (c) => {
  const userId = c.get("userId");
  const { currentPassword, newPassword } = c.req.valid("json");

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const valid = await Bun.password.verify(currentPassword, user.password);
  if (!valid) {
    throw new HTTPException(401, { message: "Invalid current password" });
  }

  const hashedPassword = await Bun.password.hash(newPassword, {
    algorithm: "bcrypt",
    cost: config.auth.bcryptCost,
  });

  await updateReturning(users, userId, { password: hashedPassword, updatedAt: new Date() });
  return c.body(null, 204);
});

export default auth;
