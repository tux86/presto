import type { ReportEntry } from "@presto/shared";
import { getDayNameFull } from "@presto/shared";
import { useT } from "@/i18n";
import type { CalendarColors } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ListDayRowProps {
  entry: ReportEntry;
  colors: CalendarColors;
  onToggle?: (entryId: string, newValue: number) => void;
  onTaskChange?: (entryId: string, note: string) => void;
}

export function ListDayRow({ entry, colors, onToggle, onTaskChange }: ListDayRowProps) {
  const date = new Date(entry.date);
  const isSpecial = entry.isWeekend || entry.isHoliday;
  const { t, locale } = useT();

  const handleToggle = () => {
    if (!onToggle) return;
    const next = entry.value === 0 ? 0.5 : entry.value === 0.5 ? 1 : 0;
    onToggle(entry.id, next);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-elevated",
        entry.isWeekend && entry.value === 0 && "opacity-40",
        entry.isWeekend && entry.value > 0 && "opacity-70",
        entry.isHoliday && entry.value === 0 && "bg-holiday opacity-50",
        entry.isHoliday && entry.value > 0 && "bg-holiday opacity-70",
      )}
    >
      {/* Date */}
      <div className="w-24 shrink-0">
        <div className={cn("text-base font-bold", isSpecial && "text-faint", !isSpecial && "text-heading")}>
          {String(date.getDate()).padStart(2, "0")}
        </div>
        <div className={cn("text-xs", isSpecial ? "text-faint" : "text-muted")}>{getDayNameFull(date, locale)}</div>
      </div>

      {/* Value toggle */}
      <button
        className={cn(
          "relative flex h-9 w-16 items-center justify-center rounded-lg text-sm font-bold transition-all overflow-hidden",
          onToggle ? "cursor-pointer" : "cursor-default",
          entry.value === 0 && "bg-elevated text-muted hover:bg-inset border border-edge",
          entry.value === 1 && `${colors.solid} text-white border ${colors.border}`,
          entry.value === 0.5 && `bg-elevated text-white border ${colors.border}`,
        )}
        onClick={handleToggle}
      >
        {entry.value === 0.5 && (
          <div className={cn("absolute inset-0", colors.solid)} style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
        )}
        <span className="relative z-10">{entry.value === 0 ? "0" : entry.value === 0.5 ? "\u00BD" : "1"}</span>
      </button>

      {/* Task / Holiday label */}
      <div className="flex-1 min-w-0">
        {entry.isHoliday && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-medium text-warning">{entry.holidayName ?? t("activity.holiday")}</span>
            {entry.value > 0 && <span className="text-xs text-muted">({t("activity.worked")})</span>}
          </div>
        )}
        <input
          type="text"
          defaultValue={entry.note || ""}
          onChange={(e) => onTaskChange?.(entry.id, e.target.value)}
          placeholder={entry.isWeekend ? t("activity.weekendPlaceholder") : t("activity.notePlaceholder")}
          className="w-full bg-transparent text-sm text-body placeholder:text-placeholder outline-none"
          readOnly={!onTaskChange}
        />
      </div>
    </div>
  );
}
