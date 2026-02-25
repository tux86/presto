import type { ActivityReport } from "@presto/shared";
import { getMonthName } from "@presto/shared";
import { Check, Download, X } from "lucide-react";
import { useT } from "@/i18n";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "../ui/Button";

interface ReportInfoPanelProps {
  report: ActivityReport;
  workdays: number;
  progressPercent: number;
  clientHexColor: string;
  onAutoFill: () => void;
  onClear: () => void;
  onDownloadPdf: () => void;
  onToggleStatus: () => void;
  filling?: boolean;
  clearing?: boolean;
  downloading?: boolean;
}

export function ReportInfoPanel({
  report,
  workdays,
  progressPercent,
  clientHexColor,
  onAutoFill,
  onClear,
  onDownloadPdf,
  onToggleStatus,
  filling,
  clearing,
  downloading,
}: ReportInfoPanelProps) {
  const { t, locale } = useT();
  const clientCurrency = report.mission?.client?.currency;
  const dailyRate = report.dailyRate ?? report.mission?.dailyRate;
  const revenue = dailyRate != null ? report.totalDays * dailyRate : null;
  const isCompleted = report.status === "COMPLETED";

  return (
    <div className="rounded-xl border border-edge bg-panel p-5 space-y-5">
      {/* Mission info */}
      <div>
        <h2 className="text-xl font-bold text-heading tracking-tight">
          {getMonthName(report.month, locale)} {report.year}
        </h2>
        <p className="text-sm text-muted mt-1.5">{report.mission?.name}</p>
        <p className="text-sm text-faint mt-0.5">{report.mission?.client?.name}</p>
      </div>

      {/* Status toggle */}
      <div className="flex rounded-lg border border-edge bg-elevated p-0.5">
        <button
          type="button"
          onClick={isCompleted ? onToggleStatus : undefined}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
            !isCompleted ? "bg-panel text-heading shadow-sm" : "text-faint hover:text-muted",
          )}
        >
          {t("activity.draft")}
        </button>
        <button
          type="button"
          onClick={!isCompleted ? onToggleStatus : undefined}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
            isCompleted ? "bg-success text-white shadow-sm" : "text-faint hover:text-muted",
          )}
        >
          {t("activity.validated")}
        </button>
      </div>

      {/* Stats */}
      <div className="space-y-3 py-1">
        <div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted">{t("activity.daysWorked")}</span>
            <span className="text-lg font-bold text-heading tabular-nums">
              {report.totalDays} / {workdays}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-inset">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%`, backgroundColor: clientHexColor }}
            />
          </div>
        </div>
        {dailyRate != null && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">{t("missions.dailyRate")}</span>
              <span className="text-base font-semibold text-body tabular-nums">
                {formatCurrency(dailyRate, clientCurrency)}
              </span>
            </div>
            {revenue !== null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">{t("activity.amount")}</span>
                <span className="text-lg font-bold text-accent-text tabular-nums">
                  {formatCurrency(revenue, clientCurrency)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-edge" />

      {/* Actions */}
      <div className="space-y-2">
        {isCompleted ? (
          <>
            <Button variant="primary" size="md" className="w-full" onClick={onDownloadPdf} loading={downloading}>
              <Download className="h-4 w-4" strokeWidth={2} />
              {t("activity.exportPdf")}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm text-muted hover:text-body cursor-pointer py-1"
              onClick={onToggleStatus}
            >
              {t("activity.backToDraft")}
            </button>
          </>
        ) : (
          <>
            <Button variant="primary" size="md" className="w-full" onClick={onAutoFill} loading={filling}>
              <Check className="h-4 w-4" strokeWidth={2} />
              {t("activity.fillWorkdays")}
            </Button>
            <Button variant="ghost" size="md" className="w-full text-faint!" onClick={onClear} loading={clearing}>
              <X className="h-4 w-4" strokeWidth={2} />
              {t("activity.clearAll")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
