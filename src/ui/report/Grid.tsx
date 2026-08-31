import { useCallback, useRef, useState } from "react";
import { weekdayHeaders } from "../../core/dates.ts";
import type { Day } from "../../core/grid.ts";
import type { ClientColor, DayValue } from "../../core/types.ts";
import { COLORS, cn } from "../format.ts";
import { useT } from "../prefs.tsx";
import { DayCell } from "./DayCell.tsx";

/** 0 → ½ → 1 → 0. Incrementing order: the next click always adds more. */
export function nextValue(value: DayValue): DayValue {
  return value === 0 ? 0.5 : value === 0.5 ? 1 : 0;
}

interface Props {
  grid: Day[];
  color: ClientColor;
  readOnly: boolean;
  onSetValue: (day: number, value: DayValue) => void;
  onSetNote: (day: number, note: string) => void;
}

export function Grid({ grid, color, readOnly, onSetValue, onSetNote }: Props) {
  const { t, locale } = useT();
  const [selected, setSelected] = useState<number | null>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const noteInput = useRef<HTMLInputElement>(null);

  const selectedDay = grid.find((d) => d.day === selected) ?? null;
  const leading = grid[0]?.weekday ?? 0;
  // The blank cells before the 1st. Keyed by the date they stand in for, so
  // React never has to reconcile them by position.
  const padKeys = Array.from({ length: leading }, (_, i) => `pad-${grid[0]?.iso ?? ""}-${leading - i}`);

  const focusDay = useCallback(
    (day: number) => {
      const index = grid.findIndex((d) => d.day === day);
      if (index === -1) return;
      cells.current[index]?.focus();
    },
    [grid],
  );

  /** Arrow keys walk the calendar; space cycles; N jumps to the note. */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (selected === null) return;
      const deltas: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };

      if (event.key in deltas) {
        event.preventDefault();
        const target = Math.min(grid.length, Math.max(1, selected + deltas[event.key]!));
        focusDay(target);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        focusDay(1);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        focusDay(grid.length);
        return;
      }
      if ((event.key === "n" || event.key === "N") && !readOnly) {
        event.preventDefault();
        noteInput.current?.focus();
      }
    },
    [selected, grid, focusDay, readOnly],
  );

  const c = COLORS[color];

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className={cn("size-3.5 rounded", c.solid)} />
          {t("editor.legendFull")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative size-3.5 overflow-hidden rounded border border-edge">
            <span className={cn("absolute inset-0", c.solid)} style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
            <span className="absolute inset-0 bg-elevated" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
          </span>
          {t("editor.legendHalf")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-warning" />
          {t("editor.legendHoliday")}
        </span>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-1.5">
        {weekdayHeaders(locale).map((label, i) => (
          <div
            key={label}
            className={cn("py-2 text-center text-[10px] font-semibold sm:text-xs", i >= 5 ? "text-faint" : "text-body")}
          >
            {label}
          </div>
        ))}
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: a grid of buttons, not a list */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="group" onKeyDown={onKeyDown}>
        {padKeys.map((key) => (
          <div key={key} className="h-14 sm:h-16" />
        ))}
        {grid.map((day, index) => (
          <DayCell
            key={day.iso}
            ref={(node) => {
              cells.current[index] = node;
            }}
            day={day}
            color={color}
            readOnly={readOnly}
            selected={selected === day.day}
            tabIndex={selected === null ? (index === 0 ? 0 : -1) : selected === day.day ? 0 : -1}
            onSelect={() => setSelected(day.day)}
            onCycle={() => onSetValue(day.day, nextValue(day.value))}
          />
        ))}
      </div>

      {selectedDay && !readOnly ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-edge bg-elevated px-4 py-3">
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="text-sm font-bold text-heading">{selectedDay.day}</span>
            <span className="text-xs text-muted">{selectedDay.label}</span>
            {selectedDay.holiday ? (
              <span className="text-xs font-medium text-warning">— {selectedDay.holiday}</span>
            ) : null}
          </span>
          <input
            ref={noteInput}
            key={selectedDay.iso}
            type="text"
            defaultValue={selectedDay.note}
            maxLength={500}
            onChange={(e) => onSetNote(selectedDay.day, e.target.value)}
            placeholder={selectedDay.isWeekend ? t("editor.weekendNote") : t("editor.dayNote")}
            className="min-w-0 flex-1 bg-transparent text-sm text-body outline-none placeholder:text-placeholder"
          />
        </div>
      ) : null}

      {!readOnly ? <p className="mt-3 text-xs text-faint">{t("editor.keyboard")}</p> : null}
    </div>
  );
}
