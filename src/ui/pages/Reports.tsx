import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { monthName } from "../../core/dates.ts";
import { buildMonthGrid, isWorkday } from "../../core/grid.ts";
import { revenue, totalDays } from "../../core/totals.ts";
import type { Report } from "../../core/types.ts";
import { ApiError, api } from "../api.ts";
import { PageHeader } from "../components/Layout.tsx";
import {
  Badge,
  Button,
  EmptyState,
  ErrorText,
  Field,
  FilterChips,
  Modal,
  ModalActions,
  Secret,
  Select,
} from "../components/ui.tsx";
import { COLORS, cn, colorOf, days as fmtDays, money } from "../format.ts";
import { useT } from "../prefs.tsx";
import { useStore } from "../store.tsx";

const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = new Date().getMonth() + 1;

/** A month at a glance: one dot per day, filled by how much was worked. */
function MiniMonth({ report, color }: { report: Report; color: string }) {
  const { holidaysFor } = useStore();
  const grid = buildMonthGrid(report.year, report.month, holidaysFor(report.holidayCountry), report.days);
  return (
    <div className="flex flex-wrap gap-[3px]">
      {grid.map((day) => (
        <span
          key={day.iso}
          title={String(day.day)}
          className={cn(
            "size-2 rounded-[2px]",
            day.value === 1 && color,
            day.value === 0.5 && `${color} opacity-50`,
            day.value === 0 && (isWorkday(day) ? "bg-inset" : "bg-edge/60"),
          )}
        />
      ))}
    </div>
  );
}

function ReportCard({ report, isCurrent }: { report: Report; isCurrent: boolean }) {
  const { t, locale } = useT();
  const { mission, client } = useStore();
  const m = mission(report.missionId);
  const c = m ? client(m.clientId) : undefined;
  const color = COLORS[colorOf(c?.name ?? "", c?.color ?? null)];

  const total = totalDays(report.days);
  const earned = revenue(total, report.dailyRate ?? m?.dailyRate ?? null);

  return (
    <Link
      to={`/reports/${report.id}`}
      className={cn(
        "flex h-full flex-col rounded-xl border border-edge bg-panel p-4 transition-shadow hover:shadow-md",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isCurrent && "ring-2 ring-accent/40",
      )}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="font-semibold text-heading">
          {monthName(report.month, locale)} {report.year}
        </span>
        <Badge tone={report.status === "completed" ? "success" : "neutral"}>
          {t(report.status === "completed" ? "status.completed" : "status.draft")}
        </Badge>
      </div>
      <p className="mb-3 truncate text-xs text-muted">{m?.name}</p>

      <MiniMonth report={report} color={color.solid} />

      {/* mt-auto keeps the totals on the baseline even when a card above has
          an extra line, so a row of cards reads as a row. */}
      <div className="mt-auto flex items-center justify-between pt-3 text-sm">
        <span className="tabular text-muted">
          {fmtDays(total)} {t("common.days")}
        </span>
        {earned !== null && c ? (
          <Secret className="font-semibold tabular text-accent-text">{money(earned, c.currency, locale)}</Secret>
        ) : null}
      </div>
      {isCurrent ? <p className="mt-2 text-[11px] font-medium text-accent-text">{t("reports.thisMonth")}</p> : null}
    </Link>
  );
}

function NewReportModal({ open, onClose, year }: { open: boolean; onClose: () => void; year: number }) {
  const { t, locale } = useT();
  const { missions, client, upsertReport, coversHolidayYear, reload } = useStore();
  const [missionId, setMissionId] = useState("");
  const [month, setMonth] = useState(THIS_MONTH);
  const [reportYear, setReportYear] = useState(year);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const active = useMemo(() => missions.filter((m) => m.isActive), [missions]);

  // Re-seed the form each time the modal opens, not on every render.
  useEffect(() => {
    if (!open) return;
    setReportYear(year);
    setError(null);
    setMissionId(active[0]?.id ?? "");
  }, [open, year, active]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      upsertReport(await api.createReport({ missionId, year: reportYear, month }));
      // The server only ships holiday calendars for years it knew about. A
      // report in a new year needs a refetch, or its mini-month would shade
      // public holidays as ordinary unworked days for the rest of the session.
      if (!coversHolidayYear(reportYear)) await reload();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("reports.new")}>
      {active.length === 0 ? (
        <p className="text-sm text-muted">{t("reports.needsMission")}</p>
      ) : (
        <div className="space-y-3">
          <Field label={t("reports.mission")}>
            <Select value={missionId} onChange={(e) => setMissionId(e.target.value)}>
              {active.map((m) => (
                <option key={m.id} value={m.id}>
                  {client(m.clientId)?.name} — {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("reports.month")}>
              <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {monthName(m, locale)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("reports.year")}>
              <Select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}>
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <ErrorText error={error} />
          <ModalActions>
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button busy={busy} disabled={!missionId} onClick={submit}>
              {t("common.create")}
            </Button>
          </ModalActions>
        </div>
      )}
    </Modal>
  );
}

export function Reports() {
  const { t } = useT();
  const { reports, missions, clients, companies, mission, client } = useStore();
  const [year, setYear] = useState(THIS_YEAR);
  const [creating, setCreating] = useState(false);
  const [clientFilter, setClientFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const currentRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const byClient = new Map<string, { name: string; reports: Report[] }>();
    for (const report of reports) {
      if (report.year !== year) continue;
      const m = mission(report.missionId);
      if (!m) continue;
      if (companyFilter && m.companyId !== companyFilter) continue;
      if (clientFilter && m.clientId !== clientFilter) continue;
      const c = client(m.clientId);
      const group = byClient.get(m.clientId) ?? { name: c?.name ?? "—", reports: [] };
      group.reports.push(report);
      byClient.set(m.clientId, group);
    }
    return [...byClient.entries()]
      .map(([id, g]) => ({ id, ...g, reports: g.reports.sort((a, b) => b.month - a.month) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reports, year, clientFilter, companyFilter, mission, client]);

  // Bring the month you are most likely to want into view.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const usedClients = clients.filter((c) => missions.some((m) => m.clientId === c.id));
  let currentAssigned = false;

  return (
    <div>
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle", { year })}
        actions={
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
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t("reports.new")}
            </Button>
          </>
        }
      />

      {groups.length > 0 ? (
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
          <FilterChips
            label={t("filter.company")}
            allLabel={t("filter.all")}
            value={companyFilter}
            onChange={setCompanyFilter}
            items={companies.map((c) => ({ id: c.id, label: c.name }))}
          />
          <FilterChips
            label={t("filter.client")}
            allLabel={t("filter.all")}
            value={clientFilter}
            onChange={setClientFilter}
            items={usedClients.map((c) => ({
              id: c.id,
              label: c.name,
              dot: COLORS[colorOf(c.name, c.color)].dot,
              count: reports.filter((r) => r.year === year && mission(r.missionId)?.clientId === c.id).length,
            }))}
          />
        </div>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-9" strokeWidth={1.5} />}
          title={t("reports.empty", { year })}
          hint={missions.length === 0 ? t("reports.needsMission") : t("reports.emptyHint")}
          action={
            missions.length > 0 ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                {t("reports.new")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-7">
          {groups.map((group) => {
            const c = client(group.id);
            return (
              <section key={group.id}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", COLORS[colorOf(group.name, c?.color ?? null)].dot)} />
                  <h2 className="text-sm font-semibold text-heading">{group.name}</h2>
                  <span className="text-xs text-faint">({group.reports.length})</span>
                </div>
                <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {group.reports.map((report) => {
                    const isCurrent = report.year === THIS_YEAR && report.month === THIS_MONTH;
                    const attach = isCurrent && !currentAssigned;
                    if (attach) currentAssigned = true;
                    return (
                      <div key={report.id} ref={attach ? currentRef : undefined} className="h-full">
                        <ReportCard report={report} isCurrent={isCurrent} />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <NewReportModal open={creating} onClose={() => setCreating(false)} year={year} />
    </div>
  );
}
