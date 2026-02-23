import { defineConfig } from "drizzle-kit";

const dialect = (process.env.DB_DIALECT ?? "postgresql") as "postgresql" | "mysql" | "sqlite";
const schemaFile = dialect === "mysql" ? "mysql.schema.ts" : dialect === "sqlite" ? "sqlite.schema.ts" : "pg.schema.ts";
const outDir = dialect === "postgresql" ? "pg" : dialect;

export default defineConfig({
  dialect,
  schema: `./src/db/schema/${schemaFile}`,
  out: `./src/db/migrations/${outDir}`,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
