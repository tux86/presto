import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { config } from "../lib/config.js";
import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

type AuthEnv = {
  Variables: {
    userId: string;
    userEmail: string;
  };
};

async function getOrCreateDefaultUser(): Promise<{ id: string; email: string }> {
  const { email, password, firstName, lastName } = config.auth.defaultUser;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hashedPassword = password
      ? await Bun.password.hash(password, { algorithm: "bcrypt", cost: config.auth.bcryptCost })
      : "";
    user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName },
    });
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
    return next();
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
  c.set("userId", payload.sub);
  c.set("userEmail", payload.email);
  await next();
});
