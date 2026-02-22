import { getHolidayName, getMonthDates, isWeekend } from "@presto/shared";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const NOTES = [
  "Sprint planning + dev",
  "Code review & merge",
  "Feature development",
  "Bug fixes",
  "API integration",
  "Frontend refactoring",
  "Database optimization",
  "Deployment & monitoring",
  "Client meeting",
  "Architecture design",
  "Documentation",
  "Performance tuning",
  "Unit testing",
  "UI/UX improvements",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const year = new Date().getFullYear();

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
      email: "contact@acme.com",
      phone: "+33 1 23 45 67 89",
      address: "123 rue de Paris, 75001 Paris",
      businessId: "12345678901234",
      currency: "EUR",
      userId: user.id,
    },
  });

  // Create demo mission
  const mission = await prisma.mission.upsert({
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

  // Generate reports: last 6 months of previous year + all 12 months of current year
  const months: { month: number; year: number }[] = [];
  for (let m = 7; m <= 12; m++) months.push({ month: m, year: year - 1 });
  for (let m = 1; m <= 12; m++) months.push({ month: m, year });

  for (const { month, year: y } of months) {
    const dates = getMonthDates(y, month);

    const entries = dates.map((date) => {
      const weekend = isWeekend(date);
      const holiday = !!getHolidayName(date, "FR");
      const isWorkday = !weekend && !holiday;

      // Working days: mostly full days, sometimes half days, rarely absent
      let value = 0;
      if (isWorkday) {
        const rand = Math.random();
        value = rand < 0.08 ? 0 : rand < 0.15 ? 0.5 : 1;
      }

      // Add notes to ~40% of worked days
      let note: string | null = null;
      if (value > 0 && Math.random() < 0.4) {
        note = pick(NOTES);
      }

      return { date, value, isWeekend: weekend, isHoliday: holiday, note };
    });

    const totalDays = entries.reduce((sum, e) => sum + e.value, 0);
    await prisma.activityReport.create({
      data: {
        month,
        year: y,
        userId: user.id,
        missionId: mission.id,
        status: "COMPLETED",
        totalDays,
        entries: { create: entries },
      },
    });
  }

  console.log(`Seed completed: demo@presto.dev / demo1234 (${year - 1}-${year}, 18 months)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
