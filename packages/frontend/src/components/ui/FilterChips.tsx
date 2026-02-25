import { useT } from "@/i18n";
import { cn, getClientColor } from "@/lib/utils";

interface FilterChip {
  id: string;
  name: string;
  color?: string | null;
  count?: number;
}

interface FilterChipsProps {
  items: FilterChip[];
  value: string;
  onChange: (id: string) => void;
  allLabel?: string;
  label?: string;
  className?: string;
}

export function FilterChips({ items, value, onChange, allLabel, label, className }: FilterChipsProps) {
  const { t } = useT();

  if (items.length < 2) return null;

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-all cursor-pointer border shrink-0",
      active
        ? "bg-accent/10 border-accent/30 text-accent-text"
        : "bg-panel border-edge text-muted hover:border-accent/20 hover:text-heading",
    );

  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto scrollbar-none", className)}>
      {label && <span className="text-xs font-medium text-muted shrink-0">{label}</span>}
      <button type="button" onClick={() => onChange("")} className={chipClass(!value)}>
        {allLabel ?? t("dashboard.allClients")}
      </button>
      {items.map((item) => {
        const color = item.color !== undefined ? getClientColor(item.name, item.color ?? null) : null;
        const isActive = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(isActive ? "" : item.id)}
            className={chipClass(isActive)}
          >
            {color && <span className={cn("w-2 h-2 rounded-full shrink-0", color.dot)} />}
            {item.name}
            {item.count !== undefined && <span className="text-faint">({item.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
