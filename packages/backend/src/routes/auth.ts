import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { createToken } from "../lib/jwt.js";
import { authMiddleware } from "../middleware/auth.js";
import { config } from "../lib/config.js";
import type { AppEnv } from "../lib/types.js";

const auth = new Hono<AppEnv>();

auth.use("*", async (c, next) => {
  if (!config.auth.enabled && c.req.path !== "/api/auth/me") {
    return c.json({ error: "Auth is disabled" }, 404);
  }
  return next();
});

auth.post("/register", async (c) => {
  const { email, password, firstName, lastName, company } = await c.req.json();

  if (!email || !password || !firstName || !lastName) {
    return c.json({ error: "Missing required fields" }, 400);
  }

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

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  }, 201);
});

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await Bun.password.verify(password, user.password);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await createToken(user.id, user.email);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  });
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
