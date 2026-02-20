import type { ReportEntry } from "@presto/shared";
import { ListDayRow } from "./ListDayRow";

interface ListViewProps {
  entries: ReportEntry[];
  onToggle: (entryId: string, newValue: number) => void;
  onTaskChange: (entryId: string, task: string) => void;
}

export function ListView({ entries, onToggle, onTaskChange }: ListViewProps) {
  return (
    <div className="space-y-0.5">
      {entries.map((entry) => (
        <ListDayRow key={entry.id} entry={entry} onToggle={onToggle} onTaskChange={onTaskChange} />
      ))}
    </div>
  );
}
