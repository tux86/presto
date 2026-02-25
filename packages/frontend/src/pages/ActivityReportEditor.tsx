import type { ReportEntry } from "@presto/shared";
import { getMonthName } from "@presto/shared";
import { ArrowLeft, Check, Download, MoreHorizontal, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarGrid } from "@/components/activity-report/CalendarGrid";
import { ListView } from "@/components/activity-report/ListView";
import { ReportInfoPanel } from "@/components/activity-report/ReportInfoPanel";
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
import { cn, formatCurrency, getClientCalendarColors, getClientHexColor } from "@/lib/utils";

type ViewMode = "calendar" | "list";

export function ActivityReportEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [showMenu, setShowMenu] = useState(false);
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

  useEffect(() => {
    if (!showMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMenu(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showMenu]);

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

  const handleToggleStatus = async () => {
    if (!report || !id) return;
    if (report.status === "COMPLETED") {
      const ok = await confirm({
        title: t("activity.revertTitle"),
        message: t("activity.revertMessage"),
        confirmLabel: t("activity.backToDraft"),
        cancelLabel: t("common.cancel"),
        variant: "danger",
      });
      if (!ok) return;
    }
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

  const isCompleted = report.status === "COMPLETED";
  const calendarColors = getClientCalendarColors(report.mission?.client?.name, report.mission?.client?.color);
  const clientHexColor = getClientHexColor(report.mission?.client?.name ?? "", report.mission?.client?.color);
  const workdays = entries.filter((e) => !e.isWeekend && !e.isHoliday).length;
  const dailyRate = report.dailyRate ?? report.mission?.dailyRate;
  const revenue = dailyRate != null ? report.totalDays * dailyRate : null;
  const progressPercent = workdays > 0 ? Math.min(100, Math.round((report.totalDays / workdays) * 100)) : 0;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Button>
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setShowMenu(!showMenu)}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 min-w-[160px] rounded-lg border border-edge bg-panel shadow-lg py-1">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-elevated cursor-pointer"
                  onClick={() => {
                    setShowMenu(false);
                    handleDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile compact info panel */}
      <div className="lg:hidden mb-6">
        <div className="rounded-xl border border-edge bg-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-heading tracking-tight">
                {getMonthName(report.month, locale)} {report.year}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {report.mission?.name} · {report.mission?.client?.name}
              </p>
            </div>
            <div className="flex rounded-lg border border-edge bg-elevated p-0.5">
              <button
                type="button"
                onClick={isCompleted ? handleToggleStatus : undefined}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                  !isCompleted ? "bg-panel text-heading shadow-sm" : "text-faint hover:text-muted",
                )}
              >
                {t("activity.draft")}
              </button>
              <button
                type="button"
                onClick={!isCompleted ? handleToggleStatus : undefined}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                  isCompleted ? "bg-success text-white shadow-sm" : "text-faint hover:text-muted",
                )}
              >
                {t("activity.validated")}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm mb-2">
            <span className="tabular-nums text-heading font-semibold">
              {report.totalDays} / {workdays}
            </span>
            {revenue !== null && (
              <span className="text-accent-text font-semibold tabular-nums">
                {formatCurrency(revenue, report.mission?.client?.currency)}
              </span>
            )}
          </div>

          <div className="h-1.5 rounded-full bg-inset">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%`, backgroundColor: clientHexColor }}
            />
          </div>

          <div className="flex gap-2 mt-3">
            {!isCompleted ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => autoFill.mutate(id!)}
                  loading={autoFill.isPending}
                >
                  <Check className="h-3.5 w-3.5" /> {t("activity.fillWorkdays")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => clear.mutate(id!)} loading={clear.isPending}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => downloadPdf.mutate(id!)}
                loading={downloadPdf.isPending}
              >
                <Download className="h-3.5 w-3.5" /> {t("activity.exportPdf")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop info panel */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="lg:sticky lg:top-8">
            <ReportInfoPanel
              report={report}
              workdays={workdays}
              progressPercent={progressPercent}
              clientHexColor={clientHexColor}
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
          <div className="rounded-xl border border-edge bg-panel p-6">
            {/* View toggle inside card */}
            <div className="flex items-center justify-end mb-5">
              <div className="flex items-center gap-1 rounded-lg border border-edge bg-elevated p-1 w-fit">
                <button
                  type="button"
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    viewMode === "calendar" ? "bg-panel text-heading shadow-sm" : "text-muted hover:text-body",
                  )}
                  onClick={() => setViewMode("calendar")}
                >
                  {t("activity.calendar")}
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    viewMode === "list" ? "bg-panel text-heading shadow-sm" : "text-muted hover:text-body",
                  )}
                  onClick={() => setViewMode("list")}
                >
                  {t("activity.list")}
                </button>
              </div>
            </div>

            {viewMode === "calendar" ? (
              <CalendarGrid
                entries={entries}
                colors={calendarColors}
                onToggle={handleToggle}
                onTaskChange={handleTaskChange}
                readOnly={isCompleted}
              />
            ) : (
              <ListView
                entries={entries}
                colors={calendarColors}
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
