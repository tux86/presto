interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
}

export function KpiCard({ label, value, subtitle }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-heading tracking-tight">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}
