import type { ActivityReport } from "@presto/shared";
import { getMonthName } from "@presto/shared";
import { useNavigate } from "react-router-dom";
import { useT } from "@/i18n";
import { cn, formatCurrency, getClientColor } from "@/lib/utils";
import { Badge } from "../ui/Badge";

interface ActivityReportCardProps {
  report: ActivityReport;
}

export function ActivityReportCard({ report }: ActivityReportCardProps) {
  const navigate = useNavigate();
  const { t, locale } = useT();
  const entries = report.entries ?? [];

  return (
    <div
      className="group rounded-xl border border-edge bg-panel p-4 hover:border-edge-strong hover:bg-elevated/50 transition-all duration-150 cursor-pointer"
      onClick={() => navigate(`/activity/${report.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-heading">
            {getMonthName(report.month, locale)} {report.year}
          </h3>
          {(() => {
            const color = getClientColor(report.mission?.client?.name ?? "", report.mission?.client?.color);
            return (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                    color.bg,
                    color.border,
                    color.text,
                  )}
                >
                  {report.mission?.client?.name}
                </span>
                <span className="text-xs text-muted truncate">{report.mission?.name}</span>
              </div>
            );
          })()}
        </div>
        <Badge variant={report.status === "COMPLETED" ? "success" : "default"}>
          {report.status === "COMPLETED" ? t("activity.validated") : t("activity.draft")}
        </Badge>
      </div>

      {/* Mini heatmap */}
      <div className="flex flex-wrap gap-[3px] mb-3">
        {entries.map((entry) => {
          const isOff = entry.isWeekend || entry.isHoliday;
          const isHalf = !isOff && entry.value === 0.5;
          return (
            <div
              key={entry.id}
              title={`${new Date(entry.date).getDate()} - ${entry.value}${entry.value > 1 ? t("activity.days") : t("activity.day")}`}
              className={cn(
                "w-3 h-3 rounded-sm transition-colors overflow-hidden relative",
                isOff ? "bg-elevated" : entry.value === 1 ? "bg-indigo-500" : isHalf ? "bg-indigo-500/40" : "bg-inset",
              )}
            >
              {isHalf && (
                <div className="absolute inset-0 bg-indigo-500" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {report.totalDays} {report.totalDays > 1 ? t("activity.days") : t("activity.day")}
        </span>
        {report.mission?.dailyRate && (
          <span className="text-accent-text font-medium">
            {formatCurrency(report.totalDays * report.mission.dailyRate, report.mission?.client?.currency)}
          </span>
        )}
      </div>
    </div>
  );
}
