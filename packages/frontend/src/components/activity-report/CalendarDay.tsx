import type { ReportEntry } from "@presto/shared";
import { useT } from "@/i18n";
import type { CalendarColors } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CalendarDayProps {
  entry: ReportEntry;
  dayNumber: number;
  dayName: string;
  colors: CalendarColors;
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

function getContainerStyle(kind: DayKind, value: DayValue, c: CalendarColors): string {
  if (kind === "holiday") {
    if (value === 0) return "bg-holiday border border-edge opacity-50 hover:opacity-70";
    if (value === 0.5) return `border ${c.borderMuted} opacity-70 hover:opacity-90`;
    return `${c.solidMuted} border ${c.borderMuted} opacity-70 hover:opacity-90`;
  }
  if (kind === "weekend") {
    if (value === 0) return "bg-weekend border border-transparent opacity-40 hover:opacity-60";
    if (value === 0.5) return `border ${c.borderMuted} opacity-70 hover:opacity-90`;
    return `${c.solidMuted} border ${c.borderMuted} opacity-70 hover:opacity-90`;
  }
  // normal
  if (value === 0) return "bg-elevated border border-edge hover:bg-inset hover:border-edge-strong";
  if (value === 0.5) return `border ${c.border} ${c.hoverBorder}`;
  return `${c.solid} border ${c.border} ${c.hoverBg}`;
}

const dayNumberStyles: Record<DayKind, Record<DayValue, string>> = {
  holiday: { 0: "text-faint", 0.5: "text-white", 1: "text-white" },
  weekend: { 0: "text-faint", 0.5: "text-white", 1: "text-white" },
  normal: { 0: "text-body", 0.5: "text-white", 1: "text-white" },
};

function getDayNameStyle(kind: DayKind, value: DayValue, c: CalendarColors): string {
  if (kind !== "normal") {
    return "text-faint";
  }
  if (value === 1) return c.textLight;
  return "text-muted";
}

export function CalendarDay({ entry, dayNumber, dayName, colors, selected, onToggle, onSelect }: CalendarDayProps) {
  const { t } = useT();
  const kind = getDayKind(entry);
  const value: DayValue = entry.value === 1 ? 1 : entry.value === 0.5 ? 0.5 : 0;

  const handleClick = () => {
    onSelect?.(entry.id);
    if (!onToggle) return;
    const next = entry.value === 0 ? 0.5 : entry.value === 0.5 ? 1 : 0;
    onToggle(entry.id, next);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg h-14 sm:h-16 transition-all duration-100 select-none overflow-hidden",
        onToggle ? "cursor-pointer active:scale-[0.97]" : "cursor-default",
        getContainerStyle(kind, value, colors),
        selected && "ring-2 ring-accent ring-offset-1 ring-offset-panel",
      )}
      onClick={handleClick}
      title={entry.isHoliday ? (entry.holidayName ?? t("activity.holiday")) : undefined}
    >
      {/* Half-day diagonal split */}
      {entry.value === 0.5 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className={cn("absolute inset-0", colors.solid)} style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
          <div className="absolute inset-0 bg-elevated" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
        </div>
      )}

      {/* Day number */}
      <span className={cn("relative z-10 text-sm sm:text-base font-bold leading-tight", dayNumberStyles[kind][value])}>
        {dayNumber}
      </span>

      {/* Day name */}
      <span
        className={cn(
          "relative z-10 text-[10px] sm:text-[11px] leading-tight mt-0.5",
          getDayNameStyle(kind, value, colors),
        )}
      >
        {dayName}
      </span>

      {/* Half-day badge */}
      {entry.value === 0.5 && (
        <span className={cn("absolute bottom-0.5 right-1.5 z-10 text-[10px] font-bold", colors.textBadge)}>
          &frac12;
        </span>
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
      {entry.isHoliday && <div className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-warning/70" />}
    </div>
  );
}
