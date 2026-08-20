import { dayNameFull } from "../../core/dates.ts";
import { type Day, isWorkday } from "../../core/grid.ts";
import type { ClientColor, DayValue } from "../../core/types.ts";
import { COLORS, cn } from "../format.ts";
import { useT } from "../prefs.tsx";
import { nextValue } from "./Grid.tsx";

interface Props {
  grid: Day[];
  color: ClientColor;
  readOnly: boolean;
  onSetValue: (day: number, value: DayValue) => void;
  onSetNote: (day: number, note: string) => void;
}

/** The same month as a vertical list, which is easier to annotate day by day. */
export function ListView({ grid, color, readOnly, onSetValue, onSetNote }: Props) {
  const { t, locale } = useT();
  const c = COLORS[color];

  return (
    <div className="max-w-3xl divide-y divide-edge">
      {grid.map((day) => {
        const off = !isWorkday(day);
        return (
          <div
            key={day.iso}
            className={cn(
              "flex items-center gap-3 px-1 py-2.5 sm:gap-4 sm:px-2",
              off && day.value === 0 && "opacity-55",
              day.holiday && "bg-holiday/60",
            )}
          >
            <div className="w-20 shrink-0 sm:w-28">
              <div className={cn("text-sm font-bold tabular", off ? "text-faint" : "text-heading")}>
                {String(day.day).padStart(2, "0")}
              </div>
              <div className={cn("text-xs", off ? "text-faint" : "text-muted")}>{dayNameFull(day.date, locale)}</div>
            </div>

            <button
              type="button"
              disabled={readOnly}
              onClick={() => onSetValue(day.day, nextValue(day.value))}
              className={cn(
                "relative flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border text-sm font-bold transition-all",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                readOnly ? "cursor-default" : "cursor-pointer",
                day.value === 1 && `${c.solid} border-transparent text-white`,
                day.value === 0.5 && "border-edge bg-elevated text-heading",
                day.value === 0 && "border-edge bg-elevated text-muted",
              )}
            >
              {day.value === 0.5 ? (
                <span
                  aria-hidden
                  className={cn("absolute inset-0", c.solid)}
                  style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                />
              ) : null}
              <span className="relative z-10">{day.value === 0.5 ? "½" : day.value}</span>
            </button>

            <div className="min-w-0 flex-1">
              {day.holiday ? <div className="text-xs font-medium text-warning">{day.holiday}</div> : null}
              <input
                type="text"
                defaultValue={day.note}
                maxLength={500}
                readOnly={readOnly}
                onChange={(e) => onSetNote(day.day, e.target.value)}
                placeholder={day.isWeekend ? t("editor.weekendNote") : t("editor.dayNote")}
                className="w-full bg-transparent text-sm text-body outline-none placeholder:text-placeholder"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
