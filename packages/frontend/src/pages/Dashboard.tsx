import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ActivityReportCard } from "@/components/activity-report/ActivityReportCard";
import { useActivityReports, useCreateActivityReport } from "@/hooks/use-activity-reports";
import { useMissions } from "@/hooks/use-missions";
import { useT } from "@/i18n";
import { getMonthName } from "@presto/shared";

export function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [newReportMonth, setNewReportMonth] = useState(new Date().getMonth() + 1);
  const [newReportYear, setNewReportYear] = useState(new Date().getFullYear());
  const [newReportMissionId, setNewReportMissionId] = useState("");

  const { data: reports, isLoading } = useActivityReports({ year: selectedYear });
  const { data: missions } = useMissions();
  const createReport = useCreateActivityReport();
  const { t, locale } = useT();

  const handleCreate = async () => {
    if (!newReportMissionId) return;
    try {
      await createReport.mutateAsync({ month: newReportMonth, year: newReportYear, missionId: newReportMissionId });
      setShowCreateModal(false);
    } catch { /* handled by mutation */ }
  };

  return (
    <div>
      <Header
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle", { year: selectedYear })}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-edge bg-panel">
              <button className="px-2.5 py-1.5 text-xs text-muted hover:text-heading cursor-pointer" onClick={() => setSelectedYear((y) => y - 1)}>&larr;</button>
              <span className="px-2 text-sm text-body font-medium">{selectedYear}</span>
              <button className="px-2.5 py-1.5 text-xs text-muted hover:text-heading cursor-pointer" onClick={() => setSelectedYear((y) => y + 1)}>&rarr;</button>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>{t("dashboard.newActivity")}</Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-panel border border-edge animate-pulse" />
          ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <ActivityReportCard key={report.id} report={report} />
          ))}
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
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted">{t("dashboard.month")}</label>
              <select
                value={newReportMonth}
                onChange={(e) => setNewReportMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-edge bg-panel px-3.5 py-2 text-sm text-heading outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {getMonthName(m, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-muted">{t("dashboard.year")}</label>
              <select
                value={newReportYear}
                onChange={(e) => setNewReportYear(Number(e.target.value))}
                className="w-full rounded-lg border border-edge bg-panel px-3.5 py-2 text-sm text-heading outline-none"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted">{t("dashboard.mission")}</label>
            <select
              value={newReportMissionId}
              onChange={(e) => setNewReportMissionId(e.target.value)}
              className="w-full rounded-lg border border-edge bg-panel px-3.5 py-2 text-sm text-heading outline-none"
            >
              <option value="">{t("dashboard.selectMission")}</option>
              {missions?.filter((m) => m.isActive).map((m) => (
                <option key={m.id} value={m.id}>{m.client?.name} - {m.name}</option>
              ))}
            </select>
          </div>

          {createReport.error && (
            <p className="text-sm text-red-500">{createReport.error.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} loading={createReport.isPending} disabled={!newReportMissionId}>{t("common.create")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
