import { getHolidayName, getMonthDates, isWeekend } from "@presto/shared";
import { insertReturning } from "./helpers.js";
import { activityReports, clients, db, missions, reportEntries, userSettings, users } from "./index.js";
import { runMigrations } from "./migrate.js";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const NOTES_FR = [
  "Sprint planning + développement",
  "Revue de code & merge",
  "Développement fonctionnel",
  "Correction de bugs",
  "Intégration API",
  "Refactoring frontend",
  "Optimisation base de données",
  "Déploiement & supervision",
  "Réunion client",
  "Conception architecture",
  "Rédaction documentation",
  "Optimisation performance",
  "Tests unitaires",
  "Améliorations UI/UX",
  "Migration de données",
  "Mise en place CI/CD",
  "Atelier technique",
  "Formation équipe",
];

interface ClientDef {
  name: string;
  email: string;
  phone: string;
  address: string;
  businessId: string;
  color: string;
  currency: string;
  holidayCountry: string;
}

interface MissionDef {
  name: string;
  dailyRate: number;
  isActive: boolean;
  startYear: number;
  startMonth: number;
  endYear?: number;
  endMonth?: number;
}

async function createReports(
  userId: string,
  missionId: string,
  holidayCountry: string,
  periods: { month: number; year: number; status: "DRAFT" | "COMPLETED" }[],
) {
  for (const { month, year, status } of periods) {
    const dates = getMonthDates(year, month);

    const entries = dates.map((date) => {
      const weekend = isWeekend(date);
      const holiday = !!getHolidayName(date, holidayCountry);
      const isWorkday = !weekend && !holiday;

      let value = 0;
      if (isWorkday) {
        const rand = Math.random();
        value = rand < 0.06 ? 0 : rand < 0.14 ? 0.5 : 1;
      }

      let note: string | null = null;
      if (value > 0 && Math.random() < 0.35) {
        note = pick(NOTES_FR);
      }

      return { date, value, isWeekend: weekend, isHoliday: holiday, note };
    });

    const totalDays = entries.reduce((sum, e) => sum + e.value, 0);

    const report = await insertReturning(activityReports, {
      month,
      year,
      userId,
      missionId,
      status,
      totalDays,
      holidayCountry,
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
}

function monthRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  draftMonths = 0,
): { month: number; year: number; status: "DRAFT" | "COMPLETED" }[] {
  const result: { month: number; year: number; status: "DRAFT" | "COMPLETED" }[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    result.push({ month: m, year: y, status: "COMPLETED" });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  // Mark last N months as DRAFT
  for (let i = 0; i < draftMonths && i < result.length; i++) {
    result[result.length - 1 - i].status = "DRAFT";
  }
  return result;
}

async function main() {
  await runMigrations();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // --- User ---
  const password = await Bun.password.hash("demo1234", { algorithm: "bcrypt", cost: 10 });

  const user = await insertReturning(users, {
    email: "demo@presto.dev",
    password,
    firstName: "Walid",
    lastName: "Benghabrit",
    company: "AxForge",
  });

  await db.insert(userSettings).values({
    userId: user.id,
    theme: "dark",
    locale: "fr",
    baseCurrency: "EUR",
  });

  // --- Clients ---
  const clientDefs: ClientDef[] = [
    {
      name: "Société Générale",
      email: "projets.it@socgen.fr",
      phone: "+33 1 42 14 20 00",
      address: "29 boulevard Haussmann, 75009 Paris",
      businessId: "55212022200013",
      color: "blue",
      currency: "EUR",
      holidayCountry: "FR",
    },
    {
      name: "BNP Paribas",
      email: "digital@bnpparibas.com",
      phone: "+33 1 40 14 45 46",
      address: "16 boulevard des Italiens, 75009 Paris",
      businessId: "66210806400091",
      color: "emerald",
      currency: "EUR",
      holidayCountry: "FR",
    },
    {
      name: "Swisscom AG",
      email: "enterprise@swisscom.ch",
      phone: "+41 58 221 99 11",
      address: "Alte Tiefenaustrasse 6, 3048 Worblaufen, Suisse",
      businessId: "CHE-101.415.506",
      color: "purple",
      currency: "CHF",
      holidayCountry: "CH",
    },
    {
      name: "Zalando SE",
      email: "tech.partners@zalando.de",
      phone: "+49 30 2096 45 0",
      address: "Valeska-Gert-Strasse 5, 10243 Berlin, Allemagne",
      businessId: "DE260543988",
      color: "orange",
      currency: "EUR",
      holidayCountry: "DE",
    },
    {
      name: "Deloitte Luxembourg",
      email: "consulting@deloitte.lu",
      phone: "+352 45 14 52 1",
      address: "20 Boulevard de Kockelscheuer, 1821 Luxembourg",
      businessId: "LU16280220",
      color: "cyan",
      currency: "EUR",
      holidayCountry: "LU",
    },
  ];

  type Client = typeof clients.$inferSelect;
  const createdClients: Record<string, Client> = {};
  for (const def of clientDefs) {
    createdClients[def.name] = await insertReturning(clients, { ...def, userId: user.id });
  }

  // --- Missions ---
  // Each mission maps to a client with realistic date ranges covering 4 years
  const missionDefs: { clientName: string; missions: MissionDef[] }[] = [
    {
      clientName: "Société Générale",
      missions: [
        {
          name: "Refonte portail client",
          dailyRate: 650,
          isActive: false,
          startYear: currentYear - 3,
          startMonth: 1,
          endYear: currentYear - 2,
          endMonth: 6,
        },
        {
          name: "API Open Banking",
          dailyRate: 700,
          isActive: true,
          startYear: currentYear - 1,
          startMonth: 3,
        },
      ],
    },
    {
      clientName: "BNP Paribas",
      missions: [
        {
          name: "Migration cloud AWS",
          dailyRate: 720,
          isActive: false,
          startYear: currentYear - 3,
          startMonth: 6,
          endYear: currentYear - 1,
          endMonth: 8,
        },
        {
          name: "Plateforme data analytics",
          dailyRate: 750,
          isActive: true,
          startYear: currentYear - 1,
          startMonth: 9,
        },
      ],
    },
    {
      clientName: "Swisscom AG",
      missions: [
        {
          name: "Modernisation infrastructure 5G",
          dailyRate: 950,
          isActive: true,
          startYear: currentYear - 2,
          startMonth: 1,
        },
      ],
    },
    {
      clientName: "Zalando SE",
      missions: [
        {
          name: "Optimisation moteur de recherche",
          dailyRate: 680,
          isActive: false,
          startYear: currentYear - 3,
          startMonth: 3,
          endYear: currentYear - 2,
          endMonth: 12,
        },
        {
          name: "Microservices catalogue produits",
          dailyRate: 700,
          isActive: true,
          startYear: currentYear - 1,
          startMonth: 1,
        },
      ],
    },
    {
      clientName: "Deloitte Luxembourg",
      missions: [
        {
          name: "Audit SI & conformité DORA",
          dailyRate: 800,
          isActive: true,
          startYear: currentYear - 1,
          startMonth: 6,
        },
      ],
    },
  ];

  for (const { clientName, missions: mDefs } of missionDefs) {
    const client = createdClients[clientName];

    for (const mDef of mDefs) {
      const startDate = new Date(mDef.startYear, mDef.startMonth - 1, 1);
      const endDate = mDef.endYear ? new Date(mDef.endYear, (mDef.endMonth ?? 12) - 1, 28) : undefined;

      const mission = await insertReturning(missions, {
        name: mDef.name,
        clientId: client.id,
        userId: user.id,
        dailyRate: mDef.dailyRate,
        isActive: mDef.isActive,
        startDate,
        endDate: endDate ?? null,
      });

      // Generate reports for this mission's active period
      const reportEndYear = mDef.endYear ?? currentYear;
      const reportEndMonth = mDef.endYear ? (mDef.endMonth ?? 12) : currentMonth;

      // Last month is DRAFT if mission is still active and ends in current month
      const draftMonths = mDef.isActive && !mDef.endYear ? 1 : 0;

      const periods = monthRange(mDef.startYear, mDef.startMonth, reportEndYear, reportEndMonth, draftMonths);

      await createReports(user.id, mission.id, client.holidayCountry, periods);
    }
  }

  const totalReports = await db.select().from(activityReports);

  console.log(
    `Seed completed: demo@presto.dev / demo1234 — ${Object.keys(createdClients).length} clients, ${totalReports.length} reports (${currentYear - 3}–${currentYear})`,
  );
}

await main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
