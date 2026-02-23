import { getMonthName } from "@presto/shared";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useT } from "@/i18n";
import { compactTick } from "@/lib/utils";

interface MonthlyData {
  month: number;
  days: number;
  revenue: number;
}

interface MonthlyChartProps {
  data: MonthlyData[];
  dataKey: "days" | "revenue";
  label: string;
  color?: string;
  formatValue?: (value: number) => string;
}

export function MonthlyChart({ data, dataKey, label, color = "#6366f1", formatValue }: MonthlyChartProps) {
  const { locale } = useT();

  const chartData = data.map((d) => ({
    ...d,
    name: getMonthName(d.month, locale).slice(0, 3),
  }));

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
              formatter={(value: number) => [formatValue ? formatValue(value) : value, label]}
            />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
