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
  return value ? parseInt(value, 10) : fallback;
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
    theme: env("APP_THEME", "light") as "light" | "dark",
    locale: env("APP_LOCALE", "en") as "fr" | "en",
  },
  auth: {
    enabled: envBool("AUTH_ENABLED", true),
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
      const s = envRequired("JWT_SECRET");
      const WEAK = ["change-me-in-production", "dev-secret-change-in-production"];
      if (WEAK.includes(s) || s.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters and not a known default");
      }
      return s;
    })(),
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
    theme: config.app.theme,
    authEnabled: config.auth.enabled,
    registrationEnabled: config.auth.registrationEnabled,
    locale: config.app.locale,
  };
}
