import type { ReportEntry } from "@presto/shared";
import { getMonthName } from "@presto/shared";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarGrid } from "@/components/activity-report/CalendarGrid";
import { ListView } from "@/components/activity-report/ListView";
import { ReportInfoPanel } from "@/components/activity-report/ReportInfoPanel";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useActivityReport,
  useAutoFillReport,
  useClearReport,
  useDeleteActivityReport,
  useDownloadPdf,
  useUpdateActivityReport,
  useUpdateEntries,
} from "@/hooks/use-activity-reports";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/i18n";

type ViewMode = "calendar" | "list";

export function ActivityReportEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const { data: report, isLoading } = useActivityReport(id);
  const updateEntries = useUpdateEntries();
  const autoFill = useAutoFillReport();
  const clear = useClearReport();
  const downloadPdf = useDownloadPdf();
  const updateReport = useUpdateActivityReport();
  const deleteReport = useDeleteActivityReport();
  const { confirm, dialog } = useConfirm();
  const { t, locale } = useT();

  const taskTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      for (const timer of Object.values(taskTimerRef.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  const isCompleted = report?.status === "COMPLETED";
  const entries = report?.entries ?? [];
  const entriesRef = useRef<ReportEntry[]>(entries);
  entriesRef.current = entries;

  const handleToggle = useCallback(
    async (entryId: string, newValue: number) => {
      if (!id) return;
      const entry = entriesRef.current.find((e) => e.id === entryId);
      if (entry?.isHoliday && entry.value === 0) {
        const ok = await confirm({
          title: t("activity.holidayTitle", { name: entry.holidayName ?? t("activity.holidayDefault") }),
          message: t("activity.holidayMessage"),
          confirmLabel: t("activity.holidayConfirm"),
          cancelLabel: t("common.cancel"),
        });
        if (!ok) return;
      }
      updateEntries.mutate({ reportId: id, entries: [{ id: entryId, value: newValue }] });
    },
    [id, updateEntries, confirm, t],
  );

  const handleTaskChange = useCallback(
    (entryId: string, note: string) => {
      if (!id) return;
      if (taskTimerRef.current[entryId]) clearTimeout(taskTimerRef.current[entryId]);
      taskTimerRef.current[entryId] = setTimeout(() => {
        updateEntries.mutate({ reportId: id, entries: [{ id: entryId, note }] });
      }, 500);
    },
    [id, updateEntries],
  );

  const handleToggleStatus = () => {
    if (!report || !id) return;
    updateReport.mutate({ id, status: report.status === "COMPLETED" ? "DRAFT" : "COMPLETED" });
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: t("activity.deleteTitle"),
      message: t("activity.deleteMessage"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      variant: "danger",
    });
    if (!ok) return;
    await deleteReport.mutateAsync(id);
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton count={1} height="h-8" className="w-48 bg-elevated rounded" />
        <Skeleton count={1} height="h-96" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">{t("activity.notFound")}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={`${getMonthName(report.month, locale)} ${report.year}`}
        subtitle={`${report.mission?.client?.name} - ${report.mission?.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" /> {t("common.back")}
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Info panel */}
        <div className="w-full lg:w-72 lg:shrink-0">
          <div className="lg:sticky lg:top-8">
            <ReportInfoPanel
              report={report}
              onAutoFill={() => autoFill.mutate(id!)}
              onClear={() => clear.mutate(id!)}
              onDownloadPdf={() => downloadPdf.mutate(id!)}
              onToggleStatus={handleToggleStatus}
              filling={autoFill.isPending}
              clearing={clear.isPending}
              downloading={downloadPdf.isPending}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* View toggle */}
          <div className="flex items-center gap-1 mb-5 rounded-lg border border-edge bg-panel p-1 w-fit">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                viewMode === "calendar" ? "bg-elevated text-heading" : "text-muted hover:text-body"
              }`}
              onClick={() => setViewMode("calendar")}
            >
              {t("activity.calendar")}
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-elevated text-heading" : "text-muted hover:text-body"
              }`}
              onClick={() => setViewMode("list")}
            >
              {t("activity.list")}
            </button>
          </div>

          {/* Content */}
          <div className="rounded-xl border border-edge bg-panel p-6">
            {viewMode === "calendar" ? (
              <CalendarGrid
                entries={entries}
                onToggle={handleToggle}
                onTaskChange={handleTaskChange}
                readOnly={isCompleted}
              />
            ) : (
              <ListView
                entries={entries}
                onToggle={handleToggle}
                onTaskChange={handleTaskChange}
                readOnly={isCompleted}
              />
            )}
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {dialog}
    </div>
  );
}
