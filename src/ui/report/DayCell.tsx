import { forwardRef } from "react";
import type { Day } from "../../core/grid.ts";
import { isWorkday } from "../../core/grid.ts";
import type { ClientColor } from "../../core/types.ts";
import { COLORS, cn } from "../format.ts";

interface Props {
  day: Day;
  color: ClientColor;
  selected: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onCycle: () => void;
  tabIndex: number;
}

/**
 * One calendar day.
 *
 * A half day is drawn as a diagonal split rather than a label, so a month's
 * shape is readable at a glance without reading any numbers.
 */
export const DayCell = forwardRef<HTMLButtonElement, Props>(function DayCell(
  { day, color, selected, readOnly, onSelect, onCycle, tabIndex },
  ref,
) {
  const c = COLORS[color];
  const off = !isWorkday(day);
  const filled = day.value > 0;

  return (
    <button
      ref={ref}
      type="button"
      tabIndex={tabIndex}
      aria-pressed={filled}
      aria-current={selected || undefined}
      title={day.holiday ?? undefined}
      onClick={() => {
        onSelect();
        if (!readOnly) onCycle();
      }}
      onFocus={onSelect}
      className={cn(
        "relative flex h-14 flex-col items-center justify-center overflow-hidden rounded-lg border transition-all select-none sm:h-16",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        readOnly ? "cursor-default" : "cursor-pointer active:scale-[0.97]",
        day.value === 1 && `${c.solid} border-transparent`,
        day.value === 0.5 && `border-edge ${filled && ""}`,
        day.value === 0 && !off && "border-edge bg-elevated hover:border-edge-strong hover:bg-inset",
        day.value === 0 && day.isWeekend && "border-transparent bg-weekend",
        day.value === 0 && day.holiday && "border-edge bg-holiday",
        off && day.value === 0 && "opacity-55 hover:opacity-80",
        selected && `ring-2 ring-offset-2 ring-offset-panel ${c.ring}`,
      )}
    >
      {day.value === 0.5 ? (
        <span aria-hidden className="pointer-events-none absolute inset-0">
          <span className={cn("absolute inset-0", c.solid)} style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
          <span className="absolute inset-0 bg-elevated" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
        </span>
      ) : null}

      <span
        className={cn(
          "relative z-10 text-sm leading-tight font-bold sm:text-base",
          day.value === 1 ? "text-white" : day.value === 0.5 ? "text-heading" : off ? "text-faint" : "text-body",
        )}
      >
        {day.day}
      </span>
      <span
        className={cn(
          "relative z-10 mt-0.5 text-[10px] leading-tight sm:text-[11px]",
          day.value === 1 ? "text-white/80" : off ? "text-faint" : "text-muted",
        )}
      >
        {day.label}
      </span>

      {day.value === 0.5 ? (
        <span className="absolute right-1.5 bottom-0.5 z-10 text-[10px] font-bold text-heading">½</span>
      ) : null}

      {day.note ? (
        <span
          aria-hidden
          className={cn(
            "absolute top-1 left-1/2 z-10 h-1 w-3 -translate-x-1/2 rounded-full",
            day.value === 1 ? "bg-white/60" : "bg-accent/60",
          )}
        />
      ) : null}

      {day.holiday ? <span aria-hidden className="absolute top-1 right-1.5 size-1.5 rounded-full bg-warning" /> : null}
    </button>
  );
});
