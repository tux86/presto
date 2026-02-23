import { getMonthName } from "@presto/shared";
import { useMemo, useState } from "react";
import { ActivityReportCard } from "@/components/activity-report/ActivityReportRow";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { ClientFilterChips } from "@/components/ui/ClientFilterChips";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { YearNavigator } from "@/components/ui/YearNavigator";
import { useActivityReports, useCreateActivityReport } from "@/hooks/use-activity-reports";
import { useMissions } from "@/hooks/use-missions";
import { useT } from "@/i18n";
import { cn, getClientColor } from "@/lib/utils";

export function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [newReportMonth, setNewReportMonth] = useState(new Date().getMonth() + 1);
  const [newReportYear, setNewReportYear] = useState(new Date().getFullYear());
  const [newReportMissionId, setNewReportMissionId] = useState("");
  const [filterClientId, setFilterClientId] = useState("");

  const { data: reports, isLoading } = useActivityReports({ year: selectedYear });
  const { data: missions } = useMissions();
  const createReport = useCreateActivityReport();
  const { t, locale } = useT();

  const clientGroupedReports = useMemo(() => {
    if (!reports) return [];
    const groups = new Map<string, { name: string; color: string | null; reports: typeof reports }>();
    for (const r of reports) {
      const clientId = r.mission?.client?.id ?? "unknown";
      const group = groups.get(clientId) ?? {
        name: r.mission?.client?.name ?? "",
        color: r.mission?.client?.color ?? null,
        reports: [],
      };
      group.reports.push(r);
      groups.set(clientId, group);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, g]) => ({
        id,
        ...g,
        reports: g.reports.sort((a, b) => {
          const ka = `${a.year}-${String(a.month).padStart(2, "0")}`;
          const kb = `${b.year}-${String(b.month).padStart(2, "0")}`;
          return kb.localeCompare(ka);
        }),
      }));
  }, [reports]);

  const visibleGroups = filterClientId
    ? clientGroupedReports.filter((g) => g.id === filterClientId)
    : clientGroupedReports;

  const handleCreate = async () => {
    if (!newReportMissionId) return;
    try {
      await createReport.mutateAsync({ month: newReportMonth, year: newReportYear, missionId: newReportMissionId });
      setShowCreateModal(false);
    } catch {
      /* handled by mutation */
    }
  };

  return (
    <div>
      <Header
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle", { year: selectedYear })}
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <YearNavigator year={selectedYear} onChange={setSelectedYear} />
            <Button onClick={() => setShowCreateModal(true)}>{t("dashboard.newActivity")}</Button>
          </div>
        }
      />

      {!isLoading && (
        <ClientFilterChips
          clients={clientGroupedReports.map((g) => ({
            id: g.id,
            name: g.name,
            color: g.color,
            count: g.reports.length,
          }))}
          value={filterClientId}
          onChange={setFilterClientId}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-xl border border-edge bg-panel p-4">
              <div className="h-5 w-32 bg-elevated rounded animate-pulse mb-3" />
              <div className="h-3 w-44 bg-elevated rounded animate-pulse mb-2" />
              <div className="flex flex-wrap gap-[3px] mb-2">
                {Array.from({ length: 30 }, (_, j) => (
                  <div key={j} className="w-[7px] h-[7px] rounded-sm bg-elevated animate-pulse" />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-elevated rounded animate-pulse" />
                <div className="h-4 w-20 bg-elevated rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleGroups.length > 0 ? (
        <div className="space-y-6">
          {visibleGroups.map((group) => {
            const color = getClientColor(group.name, group.color);
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("w-2.5 h-2.5 rounded-full", color.dot)} />
                  <h3 className="text-sm font-semibold text-heading">{group.name}</h3>
                  <span className="text-xs text-faint">({group.reports.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.reports.map((report) => (
                    <ActivityReportCard key={report.id} report={report} locale={locale} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-edge p-12 text-center">
          <p className="text-sm text-muted mb-4">{t("dashboard.noActivities", { year: selectedYear })}</p>
          <Button onClick={() => setShowCreateModal(true)}>{t("dashboard.createActivity")}</Button>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title={t("dashboard.newActivity")}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t("dashboard.month")}
              value={newReportMonth}
              onChange={(e) => setNewReportMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m, locale)}
                </option>
              ))}
            </Select>
            <Select
              label={t("dashboard.year")}
              value={newReportYear}
              onChange={(e) => setNewReportYear(Number(e.target.value))}
            >
              {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>

          <Select
            label={t("dashboard.mission")}
            value={newReportMissionId}
            onChange={(e) => setNewReportMissionId(e.target.value)}
          >
            <option value="">{t("dashboard.selectMission")}</option>
            {missions
              ?.filter((m) => m.isActive)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.client?.name} - {m.name}
                </option>
              ))}
          </Select>

          {createReport.error && <p className="text-sm text-red-500">{createReport.error.message}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} loading={createReport.isPending} disabled={!newReportMissionId}>
              {t("common.create")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
