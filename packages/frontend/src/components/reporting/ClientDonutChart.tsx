import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useT } from "@/i18n";
import { cn, formatCurrency, formatNumber, getClientColor, getClientHexColor } from "@/lib/utils";

interface ClientData {
  clientId: string;
  clientName: string;
  clientColor: string | null;
  days: number;
  revenue: number;
  convertedRevenue: number;
  currency: string;
}

interface ClientDonutChartProps {
  data: ClientData[];
  baseCurrency: string;
  totalDays: number;
}

export function ClientDonutChart({ data, baseCurrency, totalDays }: ClientDonutChartProps) {
  const { t } = useT();
  const sorted = [...data].sort((a, b) => b.convertedRevenue - a.convertedRevenue);

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <h3 className="text-sm font-medium text-body mb-4">{t("reporting.clientBreakdown")}</h3>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        {/* Donut */}
        <div className="w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sorted}
                dataKey="convertedRevenue"
                nameKey="clientName"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
                strokeWidth={0}
              >
                {sorted.map((entry) => (
                  <Cell key={entry.clientId} fill={getClientHexColor(entry.clientName, entry.clientColor)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as ClientData;
                  return (
                    <div className="rounded-lg border border-edge bg-panel px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium text-heading">{d.clientName}</p>
                      <p className="text-muted">{formatCurrency(d.convertedRevenue, baseCurrency)}</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="space-y-1.5 flex-1 min-w-0">
          {sorted.map((client) => {
            const color = getClientColor(client.clientName, client.clientColor);
            const percent = totalDays > 0 ? (client.days / totalDays) * 100 : 0;
            return (
              <div key={client.clientId} className="flex items-center gap-2 min-w-0">
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", color.dot)} />
                <span className="text-xs text-body truncate flex-1">{client.clientName}</span>
                <span className="text-xs text-faint flex-shrink-0 tabular-nums">
                  {formatNumber(client.days)}j &middot; {formatNumber(percent, 0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
