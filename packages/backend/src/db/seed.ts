import { getHolidayName, getMonthDates, isWeekend } from "@presto/shared";
import { logger } from "../lib/logger.js";
import { createId } from "./id.js";
import {
  activityReports,
  clients,
  closeDb,
  companies,
  db,
  missions,
  reportEntries,
  userSettings,
  users,
} from "./index.js";

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
  /** Probability of filling a workday (0–1). Solo mission ≈ 0.9, part-time ≈ 0.4–0.6. */
  fillRate?: number;
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
  for (let i = 0; i < draftMonths && i < result.length; i++) {
    result[result.length - 1 - i].status = "DRAFT";
  }
  return result;
}

async function main() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // --- User ---
  const userId = createId();
  const password = await Bun.password.hash("demo1234", { algorithm: "bcrypt", cost: 10 });

  await db.insert(users).values({
    id: userId,
    email: "demo@presto.dev",
    password,
    firstName: "Vrael",
    lastName: "Synthor",
  });

  const companyId = createId();
  await db.insert(companies).values({
    id: companyId,
    name: "Korvalis",
    isDefault: true,
    userId,
  });

  await db.insert(userSettings).values({
    userId,
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

  const clientIds: Record<string, { id: string; holidayCountry: string }> = {};
  const clientRows = clientDefs.map((def) => {
    const id = createId();
    clientIds[def.name] = { id, holidayCountry: def.holidayCountry };
    return { id, ...def, userId };
  });
  await db.insert(clients).values(clientRows);

  // --- Missions ---
  // Realistic freelancer timeline: max 2 concurrent missions, fillRate controls time split.
  // N-3: SocGen solo → BNP solo
  // N-2: BNP+Swisscom part-time → Zalando solo
  // N-1: Zalando solo → SocGen+Zalando part-time → +Deloitte
  // N:   SocGen+Zalando+Deloitte (brief 3-way overlap, ~130% occupation)
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
          endYear: currentYear - 3,
          endMonth: 10,
          fillRate: 0.9,
        },
        {
          name: "API Open Banking",
          dailyRate: 700,
          isActive: true,
          startYear: currentYear - 1,
          startMonth: 3,
          fillRate: 0.55,
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
          startMonth: 11,
          endYear: currentYear - 2,
          endMonth: 8,
          fillRate: 0.55,
        },
      ],
    },
    {
      clientName: "Swisscom AG",
      missions: [
        {
          name: "Modernisation infrastructure 5G",
          dailyRate: 950,
          isActive: false,
          startYear: currentYear - 2,
          startMonth: 1,
          endYear: currentYear - 2,
          endMonth: 7,
          fillRate: 0.45,
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
          startYear: currentYear - 2,
          startMonth: 9,
          endYear: currentYear - 1,
          endMonth: 4,
          fillRate: 0.9,
        },
        {
          name: "Microservices catalogue produits",
          dailyRate: 700,
          isActive: true,
          startYear: currentYear - 1,
          startMonth: 5,
          fillRate: 0.45,
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
          startMonth: 11,
          fillRate: 0.35,
        },
      ],
    },
  ];

  // Pre-generate all missions, reports, and entries in memory
  type MissionInsert = typeof missions.$inferInsert;
  type ReportInsert = typeof activityReports.$inferInsert;
  type EntryInsert = typeof reportEntries.$inferInsert;
  const missionRows: MissionInsert[] = [];
  const reportRows: ReportInsert[] = [];
  const entryRows: EntryInsert[] = [];

  for (const { clientName, missions: mDefs } of missionDefs) {
    const client = clientIds[clientName];

    for (const mDef of mDefs) {
      const missionId = createId();
      const startDate = new Date(mDef.startYear, mDef.startMonth - 1, 1);
      const endDate = mDef.endYear ? new Date(mDef.endYear, (mDef.endMonth ?? 12) - 1, 28) : undefined;

      missionRows.push({
        id: missionId,
        name: mDef.name,
        clientId: client.id,
        companyId,
        userId,
        dailyRate: mDef.dailyRate,
        isActive: mDef.isActive,
        startDate,
        endDate: endDate ?? null,
      });

      // Generate reports + entries for this mission
      const reportEndYear = mDef.endYear ?? currentYear;
      const reportEndMonth = mDef.endYear ? (mDef.endMonth ?? 12) : currentMonth;
      const draftMonths = mDef.isActive && !mDef.endYear ? 1 : 0;
      const periods = monthRange(mDef.startYear, mDef.startMonth, reportEndYear, reportEndMonth, draftMonths);
      const fillRate = mDef.fillRate ?? 0.9;

      for (const { month, year, status } of periods) {
        const reportId = createId();
        const dates = getMonthDates(year, month);

        let totalDays = 0;
        for (const date of dates) {
          const weekend = isWeekend(date);
          const holiday = !!getHolidayName(date, client.holidayCountry);
          const isWorkday = !weekend && !holiday;

          let value = 0;
          if (isWorkday && Math.random() < fillRate) {
            value = Math.random() < 0.1 ? 0.5 : 1;
          }

          let note: string | null = null;
          if (value > 0 && Math.random() < 0.35) {
            note = pick(NOTES_FR);
          }

          totalDays += value;
          entryRows.push({ id: createId(), date, value, isWeekend: weekend, isHoliday: holiday, note, reportId });
        }

        reportRows.push({
          id: reportId,
          month,
          year,
          userId,
          missionId,
          status,
          totalDays,
          dailyRate: mDef.dailyRate,
          holidayCountry: client.holidayCountry,
        });
      }
    }
  }

  // Bulk inserts
  await db.insert(missions).values(missionRows);
  await db.insert(activityReports).values(reportRows);
  await db.insert(reportEntries).values(entryRows);

  logger.success(
    `Seed completed: demo@presto.dev / demo1234 — ${clientDefs.length} clients, ${reportRows.length} reports, ${entryRows.length} entries (${currentYear - 3}–${currentYear})`,
  );
  await closeDb();
}

await main().catch((err) => {
  logger.error("Seed failed:", err);
  process.exit(1);
});
