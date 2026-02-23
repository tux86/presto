import type { CurrencyCode, ReportingData } from "@presto/shared";
import { and, eq } from "drizzle-orm";
import { MISSION_WITH } from "../db/helpers.js";
import { activityReports, db } from "../db/index.js";
import { convertAmount } from "./exchange-rate.service.js";

export async function getYearlyReport(userId: string, year: number, baseCurrency: string): Promise<ReportingData> {
  const reports = await db.query.activityReports.findMany({
    where: and(
      eq(activityReports.userId, userId),
      eq(activityReports.year, year),
      eq(activityReports.status, "COMPLETED"),
    ),
    with: {
      mission: { with: MISSION_WITH },
    },
  });

  let totalDays = 0;
  let totalRevenue = 0;

  const monthlyMap = new Map<number, { days: number; revenue: number }>();
  const clientMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      currency: CurrencyCode;
      days: number;
      revenue: number;
      convertedRevenue: number;
    }
  >();

  for (const report of reports) {
    const days = report.totalDays;
    const revenue = days * (report.mission.dailyRate ?? 0);
    const clientCurrency = report.mission.client.currency as CurrencyCode;
    const converted = await convertAmount(revenue, clientCurrency, baseCurrency);

    totalDays += days;
    totalRevenue += converted;

    // Monthly (in baseCurrency)
    const existing = monthlyMap.get(report.month) ?? { days: 0, revenue: 0 };
    monthlyMap.set(report.month, {
      days: existing.days + days,
      revenue: existing.revenue + converted,
    });

    // Client
    const clientKey = report.mission.client.id;
    const clientExisting = clientMap.get(clientKey) ?? {
      clientId: report.mission.client.id,
      clientName: report.mission.client.name,
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

  // Build monthly data for all 12 months
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const data = monthlyMap.get(month);
    return {
      month,
      days: data?.days ?? 0,
      revenue: data?.revenue ?? 0,
    };
  });

  return {
    year,
    baseCurrency,
    totalDays,
    totalRevenue,
    averageDailyRate: totalDays > 0 ? totalRevenue / totalDays : 0,
    monthlyData,
    clientData: Array.from(clientMap.values()),
  };
}
