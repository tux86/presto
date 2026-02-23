import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { insertReturning } from "../db/helpers.js";
import { db, users } from "../db/index.js";
import { config } from "../lib/config.js";
import { verifyToken } from "../lib/jwt.js";

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
  if (!config.auth.enabled) {
    if (!singleUserCache) {
      singleUserCache = await getOrCreateDefaultUser();
    }
    c.set("userId", singleUserCache.id);
    c.set("userEmail", singleUserCache.email);
    return await next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing or invalid token" });
  }

  const token = authHeader.slice(7);
  let payload: Awaited<ReturnType<typeof verifyToken>>;
  try {
    payload = await verifyToken(token);
  } catch {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
    columns: { id: true },
  });
  if (!user) {
    throw new HTTPException(401, { message: "User no longer exists" });
  }

  c.set("userId", payload.sub);
  c.set("userEmail", payload.email);
  await next();
});
