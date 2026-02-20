import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Create demo user
  const password = await Bun.password.hash("demo1234", {
    algorithm: "bcrypt",
    cost: 10,
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@presto.dev" },
    update: {},
    create: {
      email: "demo@presto.dev",
      password,
      firstName: "Jean",
      lastName: "Dupont",
      company: "JD Consulting",
    },
  });

  // Create demo client
  const client = await prisma.client.upsert({
    where: { id: "demo-client-1" },
    update: {},
    create: {
      id: "demo-client-1",
      name: "Acme Corp",
      businessId: "12345678901234",
      email: "contact@acme.com",
      address: "123 rue de Paris, 75001 Paris",
      userId: user.id,
    },
  });

  // Create demo mission
  await prisma.mission.upsert({
    where: { id: "demo-mission-1" },
    update: {},
    create: {
      id: "demo-mission-1",
      name: "Web Platform Development",
      clientId: client.id,
      userId: user.id,
      dailyRate: 550,
      isActive: true,
    },
  });

  console.log("Seed completed: demo@presto.dev / demo1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
