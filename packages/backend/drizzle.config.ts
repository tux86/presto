import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/pg.schema.ts",
  out: "./src/db/migrations/pg",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
