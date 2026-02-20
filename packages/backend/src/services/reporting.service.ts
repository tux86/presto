import type { ReportingData } from "@presto/shared";
import { prisma } from "../lib/prisma.js";

export async function getYearlyReport(userId: string, year: number): Promise<ReportingData> {
  const reports = await prisma.activityReport.findMany({
    where: { userId, year },
    include: {
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });

  let totalDays = 0;
  let totalRevenue = 0;
  let dailyRateSum = 0;
  let dailyRateCount = 0;

  const monthlyMap = new Map<number, { days: number; revenue: number }>();
  const clientMap = new Map<string, { clientId: string; clientName: string; days: number; revenue: number }>();

  for (const report of reports) {
    totalDays += report.totalDays;
    const revenue = report.totalDays * (report.mission.dailyRate ?? 0);
    totalRevenue += revenue;

    if (report.mission.dailyRate) {
      dailyRateSum += report.mission.dailyRate;
      dailyRateCount++;
    }

    // Monthly
    const existing = monthlyMap.get(report.month) ?? { days: 0, revenue: 0 };
    monthlyMap.set(report.month, {
      days: existing.days + report.totalDays,
      revenue: existing.revenue + revenue,
    });

    // Client
    const clientKey = report.mission.client.id;
    const clientExisting = clientMap.get(clientKey) ?? {
      clientId: report.mission.client.id,
      clientName: report.mission.client.name,
      days: 0,
      revenue: 0,
    };
    clientMap.set(clientKey, {
      ...clientExisting,
      days: clientExisting.days + report.totalDays,
      revenue: clientExisting.revenue + revenue,
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
    totalDays,
    totalRevenue,
    averageDailyRate: dailyRateCount > 0 ? dailyRateSum / dailyRateCount : 0,
    monthlyData,
    clientData: Array.from(clientMap.values()),
  };
}
