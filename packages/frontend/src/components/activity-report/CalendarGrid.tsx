import type { ReportEntry } from "@presto/shared";
import { getDayName, getDayNameFull } from "@presto/shared";
import { useCallback, useState } from "react";
import { useT } from "@/i18n";
import { CalendarDay } from "./CalendarDay";

interface CalendarGridProps {
  entries: ReportEntry[];
  onToggle: (entryId: string, newValue: number) => void;
  onTaskChange?: (entryId: string, note: string) => void;
  readOnly?: boolean;
}

export function CalendarGrid({ entries, onToggle, onTaskChange, readOnly }: CalendarGridProps) {
  const { t, locale } = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const taskInputRef = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
  }, []);

  const selectedEntry = selectedId ? entries.find((e) => e.id === selectedId) : null;

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
              selected={entry.id === selectedId}
              onToggle={readOnly ? undefined : onToggle}
              onSelect={readOnly ? undefined : setSelectedId}
            />
          );
        })}
      </div>

      {/* Task editor for selected day */}
      {selectedEntry && !readOnly && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-edge bg-elevated px-4 py-3">
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="text-sm font-bold text-heading">{new Date(selectedEntry.date).getDate()}</span>
            <span className="text-xs text-muted">{getDayNameFull(new Date(selectedEntry.date), locale)}</span>
            {selectedEntry.isHoliday && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                — {selectedEntry.holidayName ?? t("activity.holiday")}
              </span>
            )}
          </div>
          <input
            ref={taskInputRef}
            type="text"
            defaultValue={selectedEntry.note || ""}
            key={selectedEntry.id}
            onChange={(e) => onTaskChange?.(selectedEntry.id, e.target.value)}
            placeholder={selectedEntry.isWeekend ? t("activity.weekendPlaceholder") : t("activity.notePlaceholder")}
            className="flex-1 bg-transparent text-sm text-body placeholder:text-placeholder outline-none"
          />
        </div>
      )}
    </div>
  );
}
