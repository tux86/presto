import { ArrowLeft, ArrowRight } from "lucide-react";

interface YearNavigatorProps {
  year: number;
  onChange: (year: number) => void;
}

export function YearNavigator({ year, onChange }: YearNavigatorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-edge bg-panel">
      <button
        type="button"
        className="px-2.5 py-1.5 text-muted hover:text-heading cursor-pointer"
        onClick={() => onChange(year - 1)}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
      <span className="px-2 text-sm text-body font-medium">{year}</span>
      <button
        type="button"
        className="px-2.5 py-1.5 text-muted hover:text-heading cursor-pointer"
        onClick={() => onChange(year + 1)}
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
