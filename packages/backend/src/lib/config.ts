import type { Locale } from "@presto/shared";

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function envRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env variable: ${key}`);
  }
  return value;
}

function envInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) throw new Error(`Invalid integer for env variable ${key}: "${value}"`);
  return n;
}

function envBool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (!value) return fallback;
  return value === "true" || value === "1";
}

export const config = {
  app: {
    name: env("APP_NAME", "Presto"),
    port: envInt("PORT", 3001),
    logLevel: env("LOG_LEVEL", "info"),
  },
  defaults: {
    theme: env("DEFAULT_THEME", "light") as "light" | "dark" | "auto",
    locale: env("DEFAULT_LOCALE", "en") as Locale,
    baseCurrency: env("DEFAULT_BASE_CURRENCY", "EUR"),
  },
  auth: {
    disabled: envBool("AUTH_DISABLED", false),
    registrationEnabled: envBool("REGISTRATION_ENABLED", true),
    bcryptCost: envInt("BCRYPT_COST", 10),
    defaultUser: {
      email: env("DEFAULT_USER_EMAIL", "admin@localhost"),
      password: env("DEFAULT_USER_PASSWORD", ""),
      firstName: env("DEFAULT_USER_FIRST_NAME", "Admin"),
      lastName: env("DEFAULT_USER_LAST_NAME", ""),
    },
  },
  database: {
    url: envRequired("DATABASE_URL"),
  },
  jwt: {
    secret: (() => {
      if (envBool("AUTH_DISABLED", false)) return "auth-disabled";
      const s = envRequired("JWT_SECRET");
      const WEAK = [
        "change-me-in-production",
        "dev-secret-change-in-production",
        "dev-only-local-secret-not-for-production-use-1234",
      ];
      if (WEAK.includes(s) || s.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters and not a known default");
      }
      return s;
    })(),
  },
  rateLimit: {
    windowMs: envInt("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    limit: envInt("RATE_LIMIT_MAX", 20),
  },
  cors: {
    origins: env("CORS_ORIGINS", "http://localhost:5173")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },
} as const;

/** Public config safe to expose to the frontend */
export function getPublicConfig() {
  return {
    appName: config.app.name,
    authDisabled: config.auth.disabled,
    registrationEnabled: config.auth.registrationEnabled,
    defaults: config.defaults,
  };
}
