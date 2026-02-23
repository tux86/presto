import type { ReportEntry } from "@presto/shared";
import type { CalendarColors } from "@/lib/utils";
import { ListDayRow } from "./ListDayRow";

interface ListViewProps {
  entries: ReportEntry[];
  colors: CalendarColors;
  onToggle: (entryId: string, newValue: number) => void;
  onTaskChange: (entryId: string, note: string) => void;
  readOnly?: boolean;
}

export function ListView({ entries, colors, onToggle, onTaskChange, readOnly }: ListViewProps) {
  return (
    <div className="space-y-0.5">
      {entries.map((entry) => (
        <ListDayRow
          key={entry.id}
          entry={entry}
          colors={colors}
          onToggle={readOnly ? undefined : onToggle}
          onTaskChange={readOnly ? undefined : onTaskChange}
        />
      ))}
    </div>
  );
}
