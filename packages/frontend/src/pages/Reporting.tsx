import type { ReportingData } from "@presto/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import { Header } from "@/components/layout/Header";
import { KpiCard } from "@/components/reporting/KpiCard";
import { MonthlyChart } from "@/components/reporting/MonthlyChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { YearNavigator } from "@/components/ui/YearNavigator";
import { useT } from "@/i18n";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function Reporting() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { t } = useT();

  const { data: report, isLoading } = useQuery({
    queryKey: ["reporting", year],
    queryFn: () => api.get<ReportingData>(`/reporting?year=${year}`),
  });

  return (
    <div>
      <Header
        title={t("reporting.title")}
        subtitle={t("reporting.subtitle", { year })}
        actions={<YearNavigator year={year} onChange={setYear} />}
      />

      {isLoading ? (
        <Skeleton count={3} height="h-28" grid="grid grid-cols-1 md:grid-cols-3 gap-4" />
      ) : report ? (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label={t("reporting.daysWorked")}
              value={formatNumber(report.totalDays)}
              subtitle={t("reporting.onYear", { year })}
            />
            <KpiCard
              label={t("reporting.revenue")}
              value={formatCurrency(report.totalRevenue)}
              subtitle={t("reporting.avgDailyRate", { value: formatCurrency(report.averageDailyRate) })}
            />
            <KpiCard
              label={t("reporting.activeClients")}
              value={String(report.clientData.length)}
              subtitle={report.clientData.map((c) => c.clientName).join(", ") || t("reporting.none")}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MonthlyChart
              data={report.monthlyData}
              dataKey="days"
              label={t("reporting.daysPerMonth")}
              color="#6366f1"
            />
            <MonthlyChart
              data={report.monthlyData}
              dataKey="revenue"
              label={t("reporting.revenuePerMonth")}
              color="#10b981"
              formatValue={(v) => formatCurrency(v)}
            />
          </div>

          {/* Client breakdown */}
          {report.clientData.length > 0 && (
            <div className="rounded-xl border border-edge bg-panel p-5">
              <h3 className="text-sm font-medium text-body mb-4">{t("reporting.clientBreakdown")}</h3>
              <div className="space-y-3">
                {report.clientData.map((client) => {
                  const percent = report.totalDays > 0 ? (client.days / report.totalDays) * 100 : 0;
                  return (
                    <div key={client.clientId}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm text-body">{client.clientName}</span>
                        <span className="text-xs text-faint">
                          {formatNumber(client.days)}j &middot; {formatCurrency(client.revenue)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-inset overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
