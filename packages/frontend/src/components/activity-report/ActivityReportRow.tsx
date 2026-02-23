import type { ActivityReport } from "@presto/shared";
import { getMonthName } from "@presto/shared";
import { useNavigate } from "react-router-dom";
import { useT } from "@/i18n";
import { cn, formatCurrency, formatNumber, getClientColor } from "@/lib/utils";
import { Badge } from "../ui/Badge";

interface ActivityReportCardProps {
  report: ActivityReport;
  locale: string;
}

export function ActivityReportCard({ report, locale }: ActivityReportCardProps) {
  const navigate = useNavigate();
  const { t } = useT();
  const entries = report.entries ?? [];
  const color = getClientColor(report.mission?.client?.name ?? "", report.mission?.client?.color);

  const revenue =
    report.mission?.dailyRate != null
      ? formatCurrency(report.totalDays * report.mission.dailyRate, report.mission?.client?.currency)
      : null;

  const monthLabel = `${getMonthName(report.month, locale)} ${report.year}`;
  const daysLabel = `${formatNumber(report.totalDays)} ${report.totalDays > 1 ? t("activity.days") : t("activity.day")}`;

  return (
    <div
      className="rounded-xl border border-edge bg-panel p-4 cursor-pointer transition-all hover:shadow-md hover:border-accent/30"
      onClick={() => navigate(`/activity/${report.id}`)}
    >
      {/* Header: month + badge */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-heading">{monthLabel}</h3>
        <Badge variant={report.status === "COMPLETED" ? "success" : "default"}>
          {report.status === "COMPLETED" ? t("activity.validated") : t("activity.draft")}
        </Badge>
      </div>

      {/* Mission */}
      <p className="text-xs text-muted truncate mb-3">{report.mission?.name}</p>

      {/* Dot heatmap */}
      <div className="flex flex-wrap gap-[3px] mb-3">
        {entries.map((entry) => {
          const isOff = entry.isWeekend || entry.isHoliday;
          const isHalf = !isOff && entry.value === 0.5;
          return (
            <div
              key={entry.id}
              className={cn(
                "w-[7px] h-[7px] rounded-sm overflow-hidden relative",
                isOff ? "bg-elevated" : entry.value === 1 ? color.dot : "bg-inset",
              )}
            >
              {isHalf && (
                <div
                  className={cn("absolute inset-0", color.dot)}
                  style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: days + revenue */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted tabular-nums">{daysLabel}</span>
        {revenue && <span className="text-sm text-accent-text font-semibold tabular-nums">{revenue}</span>}
      </div>
    </div>
  );
}
