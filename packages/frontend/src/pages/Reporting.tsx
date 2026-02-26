import type { ReportingData } from "@presto/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { api } from "@/api/client";
import { Header } from "@/components/layout/Header";
import { ClientDonutChart } from "@/components/reporting/ClientDonutChart";
import { KpiCard } from "@/components/reporting/KpiCard";
import { MonthlyChart } from "@/components/reporting/MonthlyChart";
import { RevenueAreaChart } from "@/components/reporting/RevenueAreaChart";
import { FilterChips } from "@/components/ui/FilterChips";
import { Skeleton } from "@/components/ui/Skeleton";
import { YearNavigator } from "@/components/ui/YearNavigator";
import { useT } from "@/i18n";
import { CHART_COLORS } from "@/lib/constants";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

function computeDelta(
  current: number,
  previous: number | undefined,
): { value: string; direction: "up" | "down" | "neutral" } | undefined {
  if (previous === undefined || previous === 0) return undefined;
  const diff = ((current - previous) / previous) * 100;
  const sign = diff >= 0 ? "+" : "";
  return {
    value: `${sign}${diff.toFixed(0)}%`,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
  };
}

export function Reporting() {
  const [year, setYearRaw] = useState(new Date().getFullYear());
  const [filterClientId, setFilterClientId] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState("");
  const { t } = useT();

  const setYear = useCallback((y: number) => {
    setYearRaw(y);
    setFilterClientId("");
    setFilterCompanyId("");
  }, []);

  const { data: fullReport, isLoading } = useQuery({
    queryKey: ["reporting", year],
    queryFn: () => api.get<ReportingData>(`/reporting?year=${year}`),
  });

  // Derive filtered view client-side from the single API response
  const report = useMemo(() => {
    if (!fullReport || (!filterClientId && !filterCompanyId)) return fullReport ?? null;
    const clientData = fullReport.clientData.filter(
      (c) =>
        (!filterClientId || c.clientId === filterClientId) && (!filterCompanyId || c.companyId === filterCompanyId),
    );
    const totalDays = clientData.reduce((sum, c) => sum + c.days, 0);
    const totalRevenue = clientData.reduce((sum, c) => sum + c.convertedRevenue, 0);
    const filteredMonthlyClient = fullReport.monthlyClientRevenue.map((m) => ({
      ...m,
      clients: m.clients.filter(
        (c) =>
          (!filterClientId || c.clientId === filterClientId) && (!filterCompanyId || c.companyId === filterCompanyId),
      ),
    }));
    const monthlyData = filteredMonthlyClient.map((m) => ({
      month: m.month,
      days: m.clients.reduce((s, c) => s + c.days, 0),
      revenue: m.clients.reduce((s, c) => s + c.revenue, 0),
    }));
    return {
      ...fullReport,
      totalDays,
      totalRevenue,
      averageDailyRate: totalDays > 0 ? totalRevenue / totalDays : 0,
      clientData,
      monthlyData,
      monthlyClientRevenue: filteredMonthlyClient,
    };
  }, [fullReport, filterClientId, filterCompanyId]);

  const hasFilter = !!(filterClientId || filterCompanyId);

  // Client list for area chart
  const clientIds = useMemo(() => {
    const src = hasFilter ? report : fullReport;
    if (!src) return [];
    return src.clientData.map((c) => ({
      clientId: c.clientId,
      clientName: c.clientName,
      clientColor: c.clientColor,
    }));
  }, [fullReport, report, hasFilter]);

  // Utilization percentage
  const utilization = report
    ? report.workingDaysInYear > 0
      ? (report.totalDays / report.workingDaysInYear) * 100
      : 0
    : 0;

  // YoY deltas
  const prev = report?.previousYear;
  const daysDelta = prev ? computeDelta(report!.totalDays, prev.totalDays) : undefined;
  const revenueDelta = prev ? computeDelta(report!.totalRevenue, prev.totalRevenue) : undefined;

  // Sparkline data from monthly data
  const daysSpark = report?.monthlyData.map((m) => m.days);
  const revenueSpark = report?.monthlyData.map((m) => m.revenue);

  return (
    <div>
      <Header
        title={t("reporting.title")}
        subtitle={t("reporting.subtitle", { year })}
        actions={<YearNavigator year={year} onChange={setYear} />}
      />

      {!isLoading && fullReport && (
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-5">
          <FilterChips
            items={fullReport.companyData.map((c) => ({
              id: c.companyId,
              name: c.companyName,
            }))}
            value={filterCompanyId}
            onChange={setFilterCompanyId}
            allLabel={t("reporting.allCompanies")}
            label={t("reporting.filterCompany")}
          />
          {fullReport.companyData.length >= 2 && fullReport.clientData.length >= 2 && (
            <div className="hidden md:block h-5 w-px bg-edge shrink-0" />
          )}
          <FilterChips
            items={fullReport.clientData.map((c) => ({
              id: c.clientId,
              name: c.clientName,
              color: c.clientColor,
            }))}
            value={filterClientId}
            onChange={setFilterClientId}
            label={t("reporting.filterClient")}
          />
        </div>
      )}

      {isLoading ? (
        <Skeleton count={4} height="h-28" grid="grid grid-cols-1 md:grid-cols-4 gap-4" />
      ) : report ? (
        <div className="space-y-6">
          {/* KPIs row */}
          <div className={cn("grid grid-cols-1 gap-4", hasFilter ? "md:grid-cols-3" : "md:grid-cols-4")}>
            <KpiCard
              label={t("reporting.daysWorked")}
              value={formatNumber(report.totalDays)}
              subtitle={prev ? t("reporting.vsYear", { year: year - 1 }) : t("reporting.onYear", { year })}
              delta={daysDelta}
              sparkData={daysSpark}
              sparkColor={CHART_COLORS.indigo}
            />
            <KpiCard
              label={t("reporting.revenue")}
              value={formatCurrency(report.totalRevenue, report.baseCurrency)}
              subtitle={t("reporting.avgDailyRate", {
                value: formatCurrency(report.averageDailyRate, report.baseCurrency),
              })}
              delta={revenueDelta}
              sparkData={revenueSpark}
              sparkColor={CHART_COLORS.emerald}
            />
            {!hasFilter && (
              <KpiCard
                label={t("reporting.activeClients")}
                value={String(report.clientData.length)}
                subtitle={report.clientData.map((c) => c.clientName).join(", ") || t("reporting.none")}
              />
            )}
            {/* Utilization gauge */}
            <div className="rounded-xl border border-edge bg-panel p-5 flex flex-col items-center justify-center">
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
                {t("reporting.utilization")}
              </p>
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--th-inset)" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--th-accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.min(utilization, 100) * 0.974} ${100 * 0.974}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-heading tabular-nums">
                  {formatNumber(utilization, 0)}%
                </span>
              </div>
              <p className="mt-2 text-xs text-muted text-center">
                {t("reporting.workingDays", {
                  worked: formatNumber(report.totalDays),
                  total: String(report.workingDaysInYear),
                })}
              </p>
            </div>
          </div>

          {/* Charts */}
          {!hasFilter && clientIds.length > 1 ? (
            <>
              {/* Multi-client: stacked area (3/5) + donut (2/5) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3">
                  <RevenueAreaChart
                    data={report.monthlyClientRevenue}
                    clientIds={clientIds}
                    label={t("reporting.revenueByClient")}
                    baseCurrency={report.baseCurrency}
                  />
                </div>
                <div className="lg:col-span-2">
                  <ClientDonutChart
                    data={report.clientData}
                    baseCurrency={report.baseCurrency}
                    totalDays={report.totalDays}
                  />
                </div>
              </div>
            </>
          ) : null}

          {/* Revenue + Days bar charts — always visible */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MonthlyChart
              data={report.monthlyData}
              dataKey="revenue"
              label={t("reporting.revenuePerMonth")}
              color={CHART_COLORS.emerald}
              formatValue={(v) => formatCurrency(v, report.baseCurrency)}
            />
            <MonthlyChart
              data={report.monthlyData}
              dataKey="days"
              label={t("reporting.daysPerMonth")}
              color={CHART_COLORS.indigo}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
