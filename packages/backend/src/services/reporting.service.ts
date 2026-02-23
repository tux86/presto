import type { ClientColorKey, CurrencyCode, ReportingData } from "@presto/shared";
import { getWorkingDaysInYear } from "@presto/shared";
import { and, eq } from "drizzle-orm";
import { MISSION_WITH } from "../db/helpers.js";
import { activityReports, db } from "../db/index.js";
import { convertAmount } from "./exchange-rate.service.js";

export async function getYearlyReport(userId: string, year: number, baseCurrency: string): Promise<ReportingData> {
  // Fetch current + previous year in parallel
  const [reports, prevReports] = await Promise.all([
    db.query.activityReports.findMany({
      where: and(
        eq(activityReports.userId, userId),
        eq(activityReports.year, year),
        eq(activityReports.status, "COMPLETED"),
      ),
      with: { mission: { with: MISSION_WITH } },
    }),
    db.query.activityReports.findMany({
      where: and(
        eq(activityReports.userId, userId),
        eq(activityReports.year, year - 1),
        eq(activityReports.status, "COMPLETED"),
      ),
      with: { mission: { with: MISSION_WITH } },
    }),
  ]);

  // Convert all currencies in parallel (current + previous year)
  const allReports = [...reports, ...prevReports];
  const conversions = await Promise.all(
    allReports.map((r) => {
      const revenue = r.totalDays * (r.mission.dailyRate ?? 0);
      return convertAmount(revenue, r.mission.client.currency, baseCurrency);
    }),
  );

  // --- Current year aggregation ---
  let totalDays = 0;
  let totalRevenue = 0;

  const monthlyMap = new Map<number, { days: number; revenue: number }>();
  const monthlyClientMap = new Map<
    string,
    { clientId: string; clientName: string; clientColor: ClientColorKey | null; days: number; revenue: number }
  >();
  const clientMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      clientColor: ClientColorKey | null;
      currency: CurrencyCode;
      days: number;
      revenue: number;
      convertedRevenue: number;
    }
  >();

  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    const days = report.totalDays;
    const revenue = days * (report.mission.dailyRate ?? 0);
    const converted = conversions[i];
    const clientCurrency = report.mission.client.currency as CurrencyCode;

    totalDays += days;
    totalRevenue += converted;

    // Monthly aggregate
    const existing = monthlyMap.get(report.month) ?? { days: 0, revenue: 0 };
    monthlyMap.set(report.month, {
      days: existing.days + days,
      revenue: existing.revenue + converted,
    });

    // Monthly per-client data
    const mck = `${report.month}-${report.mission.client.id}`;
    const mcExisting = monthlyClientMap.get(mck) ?? {
      clientId: report.mission.client.id,
      clientName: report.mission.client.name,
      clientColor: (report.mission.client.color as ClientColorKey) ?? null,
      days: 0,
      revenue: 0,
    };
    monthlyClientMap.set(mck, { ...mcExisting, days: mcExisting.days + days, revenue: mcExisting.revenue + converted });

    // Client aggregate
    const clientKey = report.mission.client.id;
    const clientExisting = clientMap.get(clientKey) ?? {
      clientId: report.mission.client.id,
      clientName: report.mission.client.name,
      clientColor: (report.mission.client.color as ClientColorKey) ?? null,
      currency: clientCurrency,
      days: 0,
      revenue: 0,
      convertedRevenue: 0,
    };
    clientMap.set(clientKey, {
      ...clientExisting,
      days: clientExisting.days + days,
      revenue: clientExisting.revenue + revenue,
      convertedRevenue: clientExisting.convertedRevenue + converted,
    });
  }

  // --- Previous year aggregation ---
  let previousYear: ReportingData["previousYear"] = null;
  if (prevReports.length > 0) {
    let prevDays = 0;
    let prevRevenue = 0;
    const prevClients = new Set<string>();
    for (let i = 0; i < prevReports.length; i++) {
      prevDays += prevReports[i].totalDays;
      prevRevenue += conversions[reports.length + i];
      prevClients.add(prevReports[i].mission.client.id);
    }
    previousYear = {
      totalDays: prevDays,
      totalRevenue: prevRevenue,
      averageDailyRate: prevDays > 0 ? prevRevenue / prevDays : 0,
      clientCount: prevClients.size,
    };
  }

  // Build monthly data for all 12 months
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const data = monthlyMap.get(month);
    return { month, days: data?.days ?? 0, revenue: data?.revenue ?? 0 };
  });

  // Build monthly client revenue for all 12 months
  const monthlyClientRevenue = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const clients: {
      clientId: string;
      clientName: string;
      clientColor: ClientColorKey | null;
      days: number;
      revenue: number;
    }[] = [];
    for (const [key, value] of monthlyClientMap) {
      if (key.startsWith(`${month}-`)) {
        clients.push(value);
      }
    }
    return { month, clients };
  });

  return {
    year,
    baseCurrency,
    totalDays,
    totalRevenue,
    averageDailyRate: totalDays > 0 ? totalRevenue / totalDays : 0,
    workingDaysInYear: getWorkingDaysInYear(year),
    previousYear,
    monthlyData,
    monthlyClientRevenue,
    clientData: Array.from(clientMap.values()),
  };
}
