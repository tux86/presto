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
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../lib/schemas.js";
import type { AppEnv } from "../lib/types.js";
import { sanitizeUser } from "../lib/utils.js";
import { authMiddleware } from "../middleware/auth.js";

const auth = new Hono<AppEnv>();

// Pre-computed dummy hash for constant-time login rejection (mitigates timing attacks)
const DUMMY_HASH = await Bun.password.hash("dummy-timing-pad", { algorithm: "bcrypt", cost: config.auth.bcryptCost });

auth.use("*", async (c, next) => {
  if (
    config.auth.disabled &&
    c.req.path !== "/api/auth/me" &&
    c.req.path !== "/api/auth/profile" &&
    c.req.path !== "/api/auth/password" &&
    c.req.path !== "/api/auth/delete-account" &&
    c.req.path !== "/api/auth/export-data"
  ) {
    throw new HTTPException(403, { message: "Auth is disabled" });
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
            if (!config.app.trustProxy) return "127.0.0.1";
            // Behind a trusted reverse proxy: prefer x-real-ip over x-forwarded-for
            return c.req.header("x-real-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
          }
        },
      })
    : noopMiddleware;

// Per-account login lockout: 10 failures in 15 min → 15 min cooldown
const LOGIN_LOCKOUT_MAX = 10;
const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function checkAccountLockout(email: string): boolean {
  const entry = loginAttempts.get(email);
  if (!entry) return false;
  if (Date.now() - entry.firstAttempt > LOGIN_LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(email);
    return false;
  }
  return entry.count >= LOGIN_LOCKOUT_MAX;
}

function recordFailedLogin(email: string): void {
  const now = Date.now();

  // Evict stale entries to prevent unbounded memory growth
  if (loginAttempts.size > 10_000) {
    for (const [key, val] of loginAttempts) {
      if (now - val.firstAttempt > LOGIN_LOCKOUT_WINDOW_MS) loginAttempts.delete(key);
    }
  }

  const entry = loginAttempts.get(email);
  if (!entry || now - entry.firstAttempt > LOGIN_LOCKOUT_WINDOW_MS) {
    loginAttempts.set(email, { count: 1, firstAttempt: now });
  } else {
    entry.count++;
  }
}

function resetLoginAttempts(email: string): void {
  loginAttempts.delete(email);
}

auth.post("/register", authLimiter, zValidator("json", registerSchema), async (c) => {
  if (!config.auth.registrationEnabled || config.app.demoData) {
    throw new HTTPException(403, { message: "Registration is disabled" });
  }

  const { password, firstName, lastName } = c.req.valid("json");
  const email = c.req.valid("json").email.toLowerCase();

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    // Hash anyway to prevent timing-based email enumeration
    await Bun.password.hash(password, { algorithm: "bcrypt", cost: config.auth.bcryptCost });
    logger.debug("Registration rejected: email conflict");
    throw new HTTPException(400, { message: "Unable to complete registration" });
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

  const token = await createToken(user.id, user.email);
  logger.info("User registered:", user.id);
  return c.json({ token, user: sanitizeUser(user) }, 201);
});

auth.post("/login", authLimiter, zValidator("json", loginSchema), async (c) => {
  const { password } = c.req.valid("json");
  const email = c.req.valid("json").email.toLowerCase();

  // Check account lockout (still do bcrypt work to prevent timing leak)
  if (checkAccountLockout(email)) {
    await Bun.password.verify(password, DUMMY_HASH);
    logger.debug("Login failed: account temporarily locked");
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    await Bun.password.verify(password, DUMMY_HASH); // constant-time path
    recordFailedLogin(email);
    logger.debug("Login failed: invalid credentials");
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  const valid = await Bun.password.verify(password, user.password);
  if (!valid) {
    recordFailedLogin(email);
    logger.debug("Login failed: invalid credentials");
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  resetLoginAttempts(email);
  const token = await createToken(user.id, user.email);
  logger.debug("Login successful:", user.id);
  return c.json({ token, user: sanitizeUser(user) });
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

const demoGuard = createMiddleware(async (_c, next) => {
  if (config.app.demoData) {
    throw new HTTPException(403, { message: "This action is disabled in demo mode" });
  }
  await next();
});

auth.patch("/profile", authMiddleware, demoGuard, zValidator("json", updateProfileSchema), async (c) => {
  const userId = c.get("userId");
  const body = c.req.valid("json");

  const updated = await updateReturning(users, userId, { ...body, updatedAt: new Date() });
  return c.json(sanitizeUser(updated));
});

auth.patch("/password", authMiddleware, demoGuard, zValidator("json", changePasswordSchema), async (c) => {
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

auth.post(
  "/delete-account",
  authMiddleware,
  demoGuard,
  authLimiter,
  zValidator("json", deleteAccountSchema),
  async (c) => {
    const userId = c.get("userId");
    const { password } = c.req.valid("json");

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      throw new HTTPException(404, { message: "User not found" });
    }

    const valid = await Bun.password.verify(password, user.password);
    if (!valid) {
      throw new HTTPException(401, { message: "Invalid password" });
    }

    await db.delete(users).where(eq(users.id, userId));
    logger.info("Account deleted:", userId);
    return c.body(null, 204);
  },
);

auth.get("/export-data", authMiddleware, demoGuard, async (c) => {
  const userId = c.get("userId");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { password: false },
    with: {
      settings: true,
      companies: true,
      clients: true,
      missions: {
        with: {
          activityReports: {
            with: { entries: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const { settings, companies: userCompanies, clients: userClients, missions: userMissions, ...profile } = user;

  const today = new Date().toISOString().slice(0, 10);

  const data = {
    exportedAt: new Date().toISOString(),
    user: profile,
    userSettings: settings,
    companies: userCompanies,
    clients: userClients,
    missions: userMissions.map(({ activityReports, ...mission }) => ({
      ...mission,
      activityReports: activityReports.map(({ entries, ...report }) => ({
        ...report,
        reportEntries: entries,
      })),
    })),
  };

  const json = JSON.stringify(data, null, 2);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="presto-export-${today}.json"`,
    },
  });
});

export default auth;
