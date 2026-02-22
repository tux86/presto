function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
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
    holidayCountry: env("HOLIDAY_COUNTRY", "FR"),
  },
  auth: {
    enabled: envBool("AUTH_ENABLED", true),
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
    secret: envRequired("JWT_SECRET"),
  },
  cors: {
    origins: env("CORS_ORIGINS", "http://localhost:5173")
      .split(",")
      .map((s) => s.trim()),
  },
} as const;

/** Public config safe to expose to the frontend */
export function getPublicConfig() {
  return {
    appName: config.app.name,
    theme: config.app.theme,
    authEnabled: config.auth.enabled,
    locale: config.app.locale,
    holidayCountry: config.app.holidayCountry,
  };
}
