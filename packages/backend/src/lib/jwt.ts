import { sign, verify } from "hono/jwt";
import { config } from "./config.js";

const SECRET = config.jwt.secret;

export interface JwtPayload {
  sub: string;
  email: string;
  exp: number;
}

export async function createToken(userId: string, email: string): Promise<string> {
  const payload = {
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  return await sign(payload, SECRET, "HS256");
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const decoded = await verify(token, SECRET, "HS256");
  return decoded as unknown as JwtPayload;
}
