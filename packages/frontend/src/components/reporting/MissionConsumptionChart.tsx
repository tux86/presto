import type { MissionConsumption } from "@presto/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface MissionConsumptionChartProps {
  data: MissionConsumption[];
}

export function MissionConsumptionChart({ data }: MissionConsumptionChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      name: `${item.missionName} (${item.plannedDays})`, // Affiche le nom + jours prévus
    }));
  }, [data]);

  return (
    <div className="bg-panel border border-edge rounded-xl p-4">
      <h3 className="text-sm font-semibold text-heading mb-3">{t("reporting.missionConsumption")}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={150} />
          <Tooltip
            formatter={(value: number) => [value, t("reporting.days")]}
            labelFormatter={(label) => label.split(" (")[0]}
          />
          <Legend />
          <Bar dataKey="plannedDays" name={t("reporting.plannedDays")} fill="#8884d8" />
          <Bar dataKey="daysWorked" name={t("reporting.daysWorked")}>
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.missionId}`} fill={entry.isOverconsumed ? "#ff6b6b" : "#4ecdc4"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
