import type { CraEntry } from "@presto/shared";
import { getDayName } from "@presto/shared";
import { useT } from "@/i18n";
import { CalendarDay } from "./CalendarDay";

interface CalendarGridProps {
  entries: CraEntry[];
  onToggle: (entryId: string, newValue: number) => void;
}

export function CalendarGrid({ entries, onToggle }: CalendarGridProps) {
  const { locale } = useT();

  const offset =
    entries.length > 0
      ? (() => {
          const d = new Date(entries[0].date).getDay() - 1;
          return d < 0 ? 6 : d;
        })()
      : 0;

  // Generate localized short day names (Mon..Sun)
  const dayHeaders = Array.from({ length: 7 }, (_, i) => {
    // Monday = 0, Sunday = 6 → Date with known Monday (2024-01-01 is a Monday)
    const date = new Date(2024, 0, 1 + i);
    return getDayName(date, locale);
  });

  return (
    <div className="max-w-3xl">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
        {dayHeaders.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] sm:text-xs font-semibold py-1 sm:py-2 ${
              i >= 5 ? "text-faint" : "text-muted"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: offset }, (_, i) => (
          <div key={`empty-${i}`} className="h-12 sm:h-16" />
        ))}
        {entries.map((entry) => {
          const date = new Date(entry.date);
          return (
            <CalendarDay
              key={entry.id}
              entry={entry}
              dayNumber={date.getDate()}
              dayName={getDayName(date, locale)}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}
