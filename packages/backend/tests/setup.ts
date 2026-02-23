import { afterAll } from "bun:test";

// Run migrations against the test database
const migrate = Bun.spawnSync(["bunx", "prisma", "migrate", "deploy"], {
  cwd: `${import.meta.dir}/..`,
  stdout: "inherit",
  stderr: "inherit",
});

if (migrate.exitCode !== 0) {
  console.error("prisma migrate deploy failed");
  process.exit(1);
}

// Truncate all tables
const { prisma } = await import("../src/lib/prisma.js");

await prisma.$executeRawUnsafe(`
  TRUNCATE "User", "Client", "Mission", "ActivityReport", "ReportEntry" CASCADE
`);

afterAll(async () => {
  await prisma.$disconnect();
});
