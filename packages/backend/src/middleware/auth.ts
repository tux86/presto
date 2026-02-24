import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { insertReturning } from "../db/helpers.js";
import { db, users } from "../db/index.js";
import { config } from "../lib/config.js";
import { verifyToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string;
  };
};

async function getOrCreateDefaultUser(): Promise<{ id: string; email: string }> {
  const { email, password, firstName, lastName } = config.auth.defaultUser;
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    const hashedPassword = await Bun.password.hash(password || crypto.randomUUID(), {
      algorithm: "bcrypt",
      cost: config.auth.bcryptCost,
    });
    user = await insertReturning(users, { email, password: hashedPassword, firstName, lastName });
  }
  return { id: user.id, email: user.email };
}

let singleUserCache: { id: string; email: string } | null = null;

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  if (config.auth.disabled) {
    if (!singleUserCache) {
      singleUserCache = await getOrCreateDefaultUser();
    }
    c.set("userId", singleUserCache.id);
    c.set("userEmail", singleUserCache.email);
    return await next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    logger.debug("Auth rejected: missing or invalid Authorization header");
    throw new HTTPException(401, { message: "Missing or invalid token" });
  }

  const token = authHeader.slice(7);
  let payload: Awaited<ReturnType<typeof verifyToken>>;
  try {
    payload = await verifyToken(token);
  } catch {
    logger.debug("Auth rejected: invalid or expired token");
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
    columns: { id: true },
  });
  if (!user) {
    logger.warn("Auth rejected: user no longer exists", payload.sub);
    throw new HTTPException(401, { message: "User no longer exists" });
  }

  c.set("userId", payload.sub);
  c.set("userEmail", payload.email);
  return await next();
});
