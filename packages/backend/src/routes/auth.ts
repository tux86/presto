import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getConnInfo } from "hono/bun";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { rateLimiter } from "hono-rate-limiter";
import { insertReturning } from "../db/helpers.js";
import { db, users } from "../db/index.js";
import { config } from "../lib/config.js";
import { createToken } from "../lib/jwt.js";
import { loginSchema, registerSchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const auth = new Hono<AppEnv>();

auth.use("*", async (c, next) => {
  if (!config.auth.enabled && c.req.path !== "/api/auth/me") {
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
            return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "127.0.0.1";
          }
        },
      })
    : noopMiddleware;

auth.post("/register", authLimiter, zValidator("json", registerSchema), async (c) => {
  if (!config.auth.registrationEnabled) {
    throw new HTTPException(403, { message: "Registration is disabled" });
  }

  const { email, password, firstName, lastName, company } = c.req.valid("json");

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    throw new HTTPException(409, { message: "Email already registered" });
  }

  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: config.auth.bcryptCost,
  });

  const user = await insertReturning(users, {
    email,
    password: hashedPassword,
    firstName,
    lastName,
    company: company || null,
  });

  const { password: _, ...safeUser } = user;
  const token = await createToken(user.id, user.email);
  return c.json({ token, user: safeUser }, 201);
});

auth.post("/login", authLimiter, zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const valid = await Bun.password.verify(password, user.password);
  if (!valid) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const { password: _, ...safeUser } = user;
  const token = await createToken(user.id, user.email);
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
      company: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json(user);
});

export default auth;
