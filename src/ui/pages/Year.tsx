import { BarChart3, ChevronLeft, ChevronRight, Download, FileJson } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthShort } from "../../core/dates.ts";
import { averageRate, type YearSummary } from "../../core/reporting.ts";
import { api, download } from "../api.ts";
import { PageHeader } from "../components/Layout.tsx";
import { Button, Card, EmptyState, ErrorText, Select, Spinner } from "../components/ui.tsx";
import { cn, colorOf, compact, days as fmtDays, hexOf, money, percent } from "../format.ts";
import { useT } from "../prefs.tsx";

const THIS_YEAR = new Date().getFullYear();

const TOOLTIP = {
  background: "var(--th-panel)",
  border: "1px solid var(--th-edge)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--th-body)",
} as const;

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular", accent ? "text-accent-text" : "text-heading")}>
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-faint">{hint}</div> : null}
    </Card>
  );
}

/** Signed percentage change, or null when last year had nothing to compare to. */
function delta(current: number, previous: number): string | null {
  if (previous === 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change >= 0 ? "+" : ""}${change}%`;
}

export function Year() {
  const { t, locale } = useT();
  const [year, setYear] = useState(THIS_YEAR);
  const [summary, setSummary] = useState<YearSummary | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setSummary(null);
    setError(null);
    api
      .year(year)
      .then((next) => {
        if (!live) return;
        setSummary(next);
        setCurrency(next.currencies[0] ?? null);
      })
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [year]);

  const monthly = useMemo(
    () =>
      summary?.months.map((m) => ({
        label: monthShort(m.month, locale),
        days: m.days,
        revenue: currency ? (m.revenue[currency] ?? 0) : 0,
      })) ?? [],
    [summary, currency, locale],
  );

  const byClient = useMemo(
    () => summary?.clients.filter((c) => !currency || c.currency === currency) ?? [],
    [summary, currency],
  );

  const byCompany = useMemo(
    () => summary?.companies.filter((c) => !currency || c.currency === currency) ?? [],
    [summary, currency],
  );

  const nav = (
    <>
      <div className="flex items-center gap-1 rounded-lg border border-edge bg-panel p-1">
        <button
          type="button"
          aria-label={String(year - 1)}
          onClick={() => setYear(year - 1)}
          className="cursor-pointer rounded p-1 text-muted hover:text-heading"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-12 text-center text-sm font-semibold tabular text-heading">{year}</span>
        <button
          type="button"
          aria-label={String(year + 1)}
          onClick={() => setYear(year + 1)}
          className="cursor-pointer rounded p-1 text-muted hover:text-heading"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <Button variant="secondary" onClick={() => download(`/export/csv?year=${year}&locale=${locale}`)}>
        <Download className="size-3.5" />
        {t("year.exportCsv")}
      </Button>
      <Button variant="ghost" onClick={() => download("/export/json")}>
        <FileJson className="size-3.5" />
        {t("year.exportJson")}
      </Button>
    </>
  );

  if (error) {
    return (
      <div>
        <PageHeader title={t("year.title")} actions={nav} />
        <ErrorText error={error} />
      </div>
    );
  }
  if (!summary) {
    return (
      <div>
        <PageHeader title={t("year.title")} actions={nav} />
        <Spinner label={t("common.loading")} />
      </div>
    );
  }

  const bucket = currency ? summary.byCurrency[currency] : undefined;
  const utilization = summary.workdaysInYear > 0 ? (summary.totalDays / summary.workdaysInYear) * 100 : 0;
  const previousRevenue = currency ? (summary.previous?.byCurrency[currency] ?? 0) : 0;
  const revenueDelta = bucket ? delta(bucket.revenue, previousRevenue) : null;
  const daysDelta = summary.previous ? delta(summary.totalDays, summary.previous.totalDays) : null;

  /** "+12% vs 2025", or "vs the same months of 2025" while the year is running. */
  const versus = (change: string | null) =>
    change === null
      ? undefined
      : `${change} ${t(summary.previous?.partial ? "year.vsPreviousPeriod" : "year.vsPrevious", { year: year - 1 })}`;

  return (
    <div>
      <PageHeader title={t("year.title")} subtitle={String(year)} actions={nav} />

      {summary.currencies.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="size-9" strokeWidth={1.5} />}
          title={t("year.empty", { year })}
          hint={t("year.emptyHint")}
        />
      ) : (
        <div className="space-y-5">
          {summary.currencies.length > 1 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-edge bg-elevated px-3 py-2">
              <p className="text-xs text-muted">{t("year.multiCurrency")}</p>
              <Select compact value={currency ?? ""} onChange={(e) => setCurrency(e.target.value)} className="ml-auto">
                {summary.currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label={t("year.totalDays")} value={fmtDays(summary.totalDays)} hint={versus(daysDelta)} />
            <Kpi
              label={t("year.totalRevenue")}
              accent
              value={bucket && currency ? money(bucket.revenue, currency, locale) : "—"}
              hint={versus(revenueDelta)}
            />
            <Kpi
              label={t("year.averageRate")}
              value={currency ? money(averageRate(summary, currency), currency, locale) : "—"}
            />
            <Kpi
              label={t("year.utilization")}
              value={percent(utilization)}
              hint={t("year.utilizationHint", {
                days: fmtDays(summary.totalDays),
                workdays: summary.workdaysInYear,
                year,
              })}
            />
          </div>

          <Card className="p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-heading">{t("year.byMonth")}</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--th-faint)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="days"
                    tick={{ fontSize: 11, fill: "var(--th-faint)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    tickFormatter={compact}
                    tick={{ fontSize: 11, fill: "var(--th-faint)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP}
                    cursor={{ fill: "var(--th-elevated)" }}
                    formatter={(value, key) =>
                      key === "revenue" && currency ? money(Number(value), currency, locale) : fmtDays(Number(value))
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(key) => (key === "revenue" ? t("year.totalRevenue") : t("year.totalDays"))}
                  />
                  {/* Animation off: it adds nothing here, and Recharts' entry
                      transition does not survive React's StrictMode double render. */}
                  <Bar
                    yAxisId="days"
                    dataKey="days"
                    fill="var(--th-accent)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={26}
                    isAnimationActive={false}
                  />
                  <Bar
                    yAxisId="revenue"
                    dataKey="revenue"
                    fill="var(--th-success)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={26}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-heading">{t("year.byClient")}</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byClient}
                      dataKey="revenue"
                      nameKey="clientName"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {byClient.map((c) => (
                        <Cell key={`${c.clientId}-${c.companyId}`} fill={hexOf(c.clientName, c.color)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP}
                      formatter={(value) => (currency ? money(Number(value), currency, locale) : String(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-1.5">
                {byClient.map((c) => (
                  <li key={`${c.clientId}-${c.companyId}`} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: hexOf(c.clientName, c.color) }}
                    />
                    <span className="truncate text-body">{c.clientName}</span>
                    <span className="ml-auto shrink-0 tabular text-muted">
                      {fmtDays(c.days)} {t("common.days")}
                    </span>
                    <span className="w-24 shrink-0 text-right font-medium tabular text-heading">
                      {money(c.revenue, c.currency, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-heading">{t("year.byCompany")}</h2>
              <ul className="space-y-2.5">
                {byCompany.map((c) => {
                  const total = byCompany.reduce((sum, row) => sum + row.days, 0);
                  const share = total > 0 ? (c.days / total) * 100 : 0;
                  return (
                    <li key={`${c.companyId}-${c.currency}`}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate text-body">{c.companyName}</span>
                        <span className="shrink-0 font-medium tabular text-heading">
                          {money(c.revenue, c.currency, locale)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-inset">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              backgroundColor: hexOf(c.companyName, colorOf(c.companyName, null)),
                            }}
                          />
                        </div>
                        <span className="w-20 shrink-0 text-right text-xs tabular text-faint">
                          {fmtDays(c.days)} {t("common.days")}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
