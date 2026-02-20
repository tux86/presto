import type { ReportEntry } from "@presto/shared";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

interface CalendarDayProps {
  entry: ReportEntry;
  dayNumber: number;
  dayName: string;
  onToggle: (entryId: string, newValue: number) => void;
}

export function CalendarDay({ entry, dayNumber, dayName, onToggle }: CalendarDayProps) {
  const { t } = useT();
  const hasValue = entry.value > 0;
  const isSpecial = entry.isWeekend || entry.isHoliday;

  const handleClick = () => {
    const next = entry.value === 0 ? 1 : entry.value === 1 ? 0.5 : 0;
    onToggle(entry.id, next);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg h-12 sm:h-16 transition-all duration-100 select-none overflow-hidden cursor-pointer active:scale-[0.97]",
        // Holiday empty
        entry.isHoliday && entry.value === 0 &&
          "bg-holiday border border-edge opacity-50 hover:opacity-70",
        // Holiday filled
        entry.isHoliday && entry.value === 1 &&
          "bg-indigo-600/70 border border-indigo-500/60 opacity-70 hover:opacity-90",
        entry.isHoliday && entry.value === 0.5 &&
          "border border-indigo-500/60 opacity-70 hover:opacity-90",
        // Weekend empty
        entry.isWeekend && !entry.isHoliday && entry.value === 0 &&
          "bg-weekend border border-transparent opacity-40 hover:opacity-60",
        // Weekend filled
        entry.isWeekend && !entry.isHoliday && entry.value === 1 &&
          "bg-indigo-600/70 border border-indigo-500/60 opacity-70 hover:opacity-90",
        entry.isWeekend && !entry.isHoliday && entry.value === 0.5 &&
          "border border-indigo-500/60 opacity-70 hover:opacity-90",
        // Working day empty
        !isSpecial && entry.value === 0 &&
          "bg-elevated border border-edge hover:bg-inset hover:border-edge-strong",
        // Working day full
        !isSpecial && entry.value === 1 &&
          "bg-indigo-600 border border-indigo-500 hover:bg-indigo-500",
        // Working day half
        !isSpecial && entry.value === 0.5 &&
          "border border-indigo-500 hover:border-indigo-400"
      )}
      onClick={handleClick}
      title={entry.isHoliday ? entry.holidayName ?? t("activity.holiday") : undefined}
    >
      {/* Half-day diagonal split */}
      {entry.value === 0.5 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-indigo-600" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
          <div className="absolute inset-0 bg-elevated" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
        </div>
      )}

      {/* Day number */}
      <span
        className={cn(
          "relative z-10 text-xs sm:text-base font-bold leading-tight",
          isSpecial && !hasValue && "text-faint",
          isSpecial && hasValue && "text-white",
          !isSpecial && entry.value === 0 && "text-body",
          !isSpecial && hasValue && "text-white"
        )}
      >
        {dayNumber}
      </span>

      {/* Day name */}
      <span
        className={cn(
          "relative z-10 text-[9px] sm:text-[11px] leading-tight mt-0.5",
          isSpecial && "text-faint",
          !isSpecial && entry.value === 0 && "text-muted",
          !isSpecial && entry.value === 1 && "text-indigo-200",
          !isSpecial && entry.value === 0.5 && "text-muted"
        )}
      >
        {dayName}
      </span>

      {/* Half-day badge */}
      {entry.value === 0.5 && (
        <span className="absolute bottom-0.5 right-1.5 z-10 text-[10px] font-bold text-indigo-300">
          &frac12;
        </span>
      )}

      {/* Holiday indicator */}
      {entry.isHoliday && (
        <div className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-amber-500/70" />
      )}
    </div>
  );
}
