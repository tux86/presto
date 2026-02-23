import type { ClientColorKey } from "@presto/shared";
import { getMonthName } from "@presto/shared";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useT } from "@/i18n";
import { compactTick, formatCurrency, getClientHexColor } from "@/lib/utils";

interface MonthlyClientRevenue {
  month: number;
  clients: { clientId: string; clientName: string; clientColor: ClientColorKey | null; revenue: number }[];
}

interface RevenueAreaChartProps {
  data: MonthlyClientRevenue[];
  clientIds: { clientId: string; clientName: string; clientColor: ClientColorKey | null }[];
  label: string;
  baseCurrency: string;
}

export function RevenueAreaChart({ data, clientIds, label, baseCurrency }: RevenueAreaChartProps) {
  const { locale } = useT();

  const chartData = useMemo(() => {
    return data.map((m) => {
      const row: Record<string, number | string> = {
        name: getMonthName(m.month, locale).slice(0, 3),
      };
      for (const c of clientIds) {
        const found = m.clients.find((mc) => mc.clientId === c.clientId);
        row[c.clientName] = found?.revenue ?? 0;
      }
      return row;
    });
  }, [data, clientIds, locale]);

  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <h3 className="text-sm font-medium text-body mb-4">{label}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--th-edge)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--th-muted)" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--th-muted)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={compactTick}
            />
            <Tooltip
              contentStyle={{
                background: "var(--th-panel)",
                border: "1px solid var(--th-edge)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--th-body)",
              }}
              formatter={(value: number, name: string) => [formatCurrency(value, baseCurrency), name]}
            />
            {clientIds.map((c) => {
              const hex = getClientHexColor(c.clientName, c.clientColor);
              return (
                <Bar
                  key={c.clientId}
                  dataKey={c.clientName}
                  stackId="revenue"
                  fill={hex}
                  fillOpacity={0.85}
                  radius={0}
                  maxBarSize={40}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
