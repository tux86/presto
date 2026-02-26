import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

interface StatusToggleProps {
  isCompleted: boolean;
  onToggleStatus: () => void;
  /** Compact mode uses smaller padding without flex-1 (mobile). */
  compact?: boolean;
}

export function StatusToggle({ isCompleted, onToggleStatus, compact }: StatusToggleProps) {
  const { t } = useT();

  const itemClass = compact
    ? "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer"
    : "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer";

  return (
    <div className="flex rounded-lg border border-edge bg-elevated p-0.5">
      <button
        type="button"
        onClick={isCompleted ? onToggleStatus : undefined}
        className={cn(itemClass, !isCompleted ? "bg-panel text-heading shadow-sm" : "text-faint hover:text-muted")}
      >
        {t("activity.draft")}
      </button>
      <button
        type="button"
        onClick={!isCompleted ? onToggleStatus : undefined}
        className={cn(itemClass, isCompleted ? "bg-success text-white shadow-sm" : "text-faint hover:text-muted")}
      >
        {t("activity.validated")}
      </button>
    </div>
  );
}
