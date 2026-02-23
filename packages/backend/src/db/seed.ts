import { getHolidayName, getMonthDates, isWeekend } from "@presto/shared";
import { eq } from "drizzle-orm";
import { insertReturning } from "./helpers.js";
import { activityReports, clients, closeDb, db, missions, reportEntries, users } from "./index.js";
import { runMigrations } from "./migrate.js";

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
  await runMigrations();

  const year = new Date().getFullYear();

  // Create demo user (find or create)
  const password = await Bun.password.hash("demo1234", {
    algorithm: "bcrypt",
    cost: 10,
  });

  let user = await db.query.users.findFirst({ where: eq(users.email, "demo@presto.dev") });
  if (!user) {
    user = await insertReturning(users, {
      email: "demo@presto.dev",
      password,
      firstName: "Jean",
      lastName: "Dupont",
      company: "JD Consulting",
    });
  }

  // Create demo client (find or create)
  const clientId = "demo-client-1";
  let client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  if (!client) {
    client = await insertReturning(clients, {
      id: clientId,
      name: "Acme Corp",
      email: "contact@acme.com",
      phone: "+33 1 23 45 67 89",
      address: "123 rue de Paris, 75001 Paris",
      businessId: "12345678901234",
      currency: "EUR",
      holidayCountry: "FR",
      userId: user.id,
    });
  }

  // Create demo mission (find or create)
  const missionId = "demo-mission-1";
  let mission = await db.query.missions.findFirst({ where: eq(missions.id, missionId) });
  if (!mission) {
    mission = await insertReturning(missions, {
      id: missionId,
      name: "Web Platform Development",
      clientId: client.id,
      userId: user.id,
      dailyRate: 550,
      isActive: true,
    });
  }

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

      let value = 0;
      if (isWorkday) {
        const rand = Math.random();
        value = rand < 0.08 ? 0 : rand < 0.15 ? 0.5 : 1;
      }

      let note: string | null = null;
      if (value > 0 && Math.random() < 0.4) {
        note = pick(NOTES);
      }

      return { date, value, isWeekend: weekend, isHoliday: holiday, note };
    });

    const totalDays = entries.reduce((sum, e) => sum + e.value, 0);

    const report = await insertReturning(activityReports, {
      month,
      year: y,
      userId: user.id,
      missionId: mission.id,
      status: "COMPLETED",
      totalDays,
      holidayCountry: "FR",
    });

    await db.insert(reportEntries).values(
      entries.map((e) => ({
        date: e.date,
        value: e.value,
        isWeekend: e.isWeekend,
        isHoliday: e.isHoliday,
        note: e.note,
        reportId: report.id,
      })),
    );
  }

  console.log(`Seed completed: demo@presto.dev / demo1234 (${year - 1}-${year}, 18 months)`);
}

main()
  .catch(console.error)
  .finally(() => closeDb());
