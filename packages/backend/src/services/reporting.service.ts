import { prisma } from "../lib/prisma.js";
import type { ReportingData } from "@presto/shared";

export async function getYearlyReport(
  userId: string,
  year: number
): Promise<ReportingData> {
  const cras = await prisma.cra.findMany({
    where: { userId, year },
    include: {
      mission: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });

  let totalDays = 0;
  let totalRevenue = 0;
  let tjmSum = 0;
  let tjmCount = 0;

  const monthlyMap = new Map<number, { days: number; revenue: number }>();
  const clientMap = new Map<
    string,
    { clientId: string; clientName: string; days: number; revenue: number }
  >();

  for (const cra of cras) {
    totalDays += cra.totalDays;
    const revenue = cra.totalDays * (cra.mission.tjm ?? 0);
    totalRevenue += revenue;

    if (cra.mission.tjm) {
      tjmSum += cra.mission.tjm;
      tjmCount++;
    }

    // Monthly
    const existing = monthlyMap.get(cra.month) ?? { days: 0, revenue: 0 };
    monthlyMap.set(cra.month, {
      days: existing.days + cra.totalDays,
      revenue: existing.revenue + revenue,
    });

    // Client
    const clientKey = cra.mission.client.id;
    const clientExisting = clientMap.get(clientKey) ?? {
      clientId: cra.mission.client.id,
      clientName: cra.mission.client.name,
      days: 0,
      revenue: 0,
    };
    clientMap.set(clientKey, {
      ...clientExisting,
      days: clientExisting.days + cra.totalDays,
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
    averageTjm: tjmCount > 0 ? tjmSum / tjmCount : 0,
    monthlyData,
    clientData: Array.from(clientMap.values()),
  };
}
