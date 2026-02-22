import type { ReportEntry } from "@presto/shared";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

interface CalendarDayProps {
  entry: ReportEntry;
  dayNumber: number;
  dayName: string;
  selected?: boolean;
  onToggle?: (entryId: string, newValue: number) => void;
  onSelect?: (entryId: string) => void;
}

type DayKind = "holiday" | "weekend" | "normal";

type DayValue = 0 | 0.5 | 1;

function getDayKind(entry: ReportEntry): DayKind {
  if (entry.isHoliday) return "holiday";
  if (entry.isWeekend) return "weekend";
  return "normal";
}

const containerStyles: Record<DayKind, Record<DayValue, string>> = {
  holiday: {
    0: "bg-holiday border border-edge opacity-50 hover:opacity-70",
    0.5: "border border-indigo-500/60 opacity-70 hover:opacity-90",
    1: "bg-indigo-600/70 border border-indigo-500/60 opacity-70 hover:opacity-90",
  },
  weekend: {
    0: "bg-weekend border border-transparent opacity-40 hover:opacity-60",
    0.5: "border border-indigo-500/60 opacity-70 hover:opacity-90",
    1: "bg-indigo-600/70 border border-indigo-500/60 opacity-70 hover:opacity-90",
  },
  normal: {
    0: "bg-elevated border border-edge hover:bg-inset hover:border-edge-strong",
    0.5: "border border-indigo-500 hover:border-indigo-400",
    1: "bg-indigo-600 border border-indigo-500 hover:bg-indigo-500",
  },
};

const dayNumberStyles: Record<DayKind, Record<DayValue, string>> = {
  holiday: { 0: "text-faint", 0.5: "text-white", 1: "text-white" },
  weekend: { 0: "text-faint", 0.5: "text-white", 1: "text-white" },
  normal: { 0: "text-body", 0.5: "text-white", 1: "text-white" },
};

const dayNameStyles: Record<DayKind, Record<DayValue, string>> = {
  holiday: { 0: "text-faint", 0.5: "text-faint", 1: "text-faint" },
  weekend: { 0: "text-faint", 0.5: "text-faint", 1: "text-faint" },
  normal: { 0: "text-muted", 0.5: "text-muted", 1: "text-indigo-200" },
};

export function CalendarDay({ entry, dayNumber, dayName, selected, onToggle, onSelect }: CalendarDayProps) {
  const { t } = useT();
  const kind = getDayKind(entry);
  const value: DayValue = entry.value === 1 ? 1 : entry.value === 0.5 ? 0.5 : 0;

  const handleClick = () => {
    onSelect?.(entry.id);
    if (!onToggle) return;
    const next = entry.value === 0 ? 1 : entry.value === 1 ? 0.5 : 0;
    onToggle(entry.id, next);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg h-12 sm:h-16 transition-all duration-100 select-none overflow-hidden",
        onToggle ? "cursor-pointer active:scale-[0.97]" : "cursor-default",
        containerStyles[kind][value],
        selected && "ring-2 ring-accent ring-offset-1 ring-offset-panel",
      )}
      onClick={handleClick}
      title={entry.isHoliday ? (entry.holidayName ?? t("activity.holiday")) : undefined}
    >
      {/* Half-day diagonal split */}
      {entry.value === 0.5 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-indigo-600" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
          <div className="absolute inset-0 bg-elevated" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
        </div>
      )}

      {/* Day number */}
      <span className={cn("relative z-10 text-xs sm:text-base font-bold leading-tight", dayNumberStyles[kind][value])}>
        {dayNumber}
      </span>

      {/* Day name */}
      <span className={cn("relative z-10 text-[9px] sm:text-[11px] leading-tight mt-0.5", dayNameStyles[kind][value])}>
        {dayName}
      </span>

      {/* Half-day badge */}
      {entry.value === 0.5 && (
        <span className="absolute bottom-0.5 right-1.5 z-10 text-[10px] font-bold text-indigo-300">&frac12;</span>
      )}

      {/* Task indicator */}
      {entry.note && (
        <div
          className={cn(
            "absolute top-1 left-1/2 -translate-x-1/2 z-10 h-1 w-3 rounded-full",
            value > 0 ? "bg-white/50" : "bg-accent/60",
          )}
        />
      )}

      {/* Holiday indicator */}
      {entry.isHoliday && <div className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-amber-500/70" />}
    </div>
  );
}
