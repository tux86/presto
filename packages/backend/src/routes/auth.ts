import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { config } from "../lib/config.js";
import { createToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { loginSchema, registerSchema } from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { authMiddleware } from "../middleware/auth.js";

const auth = new Hono<AppEnv>();

auth.use("*", async (c, next) => {
  if (!config.auth.enabled && c.req.path !== "/api/auth/me") {
    return c.json({ error: "Auth is disabled" }, 404);
  }
  return next();
});

const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "unknown",
});

function serializeUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    company: user.company,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

auth.post("/register", authLimiter, zValidator("json", registerSchema), async (c) => {
  const { email, password, firstName, lastName, company } = c.req.valid("json");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      company: company || null,
    },
  });

  const token = await createToken(user.id, user.email);
  return c.json({ token, user: serializeUser(user) }, 201);
});

auth.post("/login", authLimiter, zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await Bun.password.verify(password, user.password);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await createToken(user.id, user.email);
  return c.json({ token, user: serializeUser(user) });
});

auth.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

export default auth;
