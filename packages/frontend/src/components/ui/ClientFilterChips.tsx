import { useT } from "@/i18n";
import { cn, getClientColor } from "@/lib/utils";

interface ClientChip {
  id: string;
  name: string;
  color: string | null;
  count?: number;
}

interface ClientFilterChipsProps {
  clients: ClientChip[];
  value: string;
  onChange: (clientId: string) => void;
}

export function ClientFilterChips({ clients, value, onChange }: ClientFilterChipsProps) {
  const { t } = useT();

  if (clients.length < 2) return null;

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer border",
      active
        ? "bg-accent/10 border-accent/30 text-accent-text"
        : "bg-panel border-edge text-muted hover:border-accent/20 hover:text-heading",
    );

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      <button type="button" onClick={() => onChange("")} className={chipClass(!value)}>
        {t("dashboard.allClients")}
      </button>
      {clients.map((client) => {
        const color = getClientColor(client.name, client.color);
        const isActive = value === client.id;
        return (
          <button
            key={client.id}
            type="button"
            onClick={() => onChange(isActive ? "" : client.id)}
            className={chipClass(isActive)}
          >
            <span className={cn("w-2 h-2 rounded-full", color.dot)} />
            {client.name}
            {client.count !== undefined && <span className="text-faint">({client.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
