import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  delta?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  sparkData?: number[];
  sparkColor?: string;
}

let sparkUid = 0;

export function KpiCard({ label, value, subtitle, delta, sparkData, sparkColor }: KpiCardProps) {
  const id = `spark-${++sparkUid}`;
  const color = sparkColor ?? "var(--th-accent)";

  return (
    <div className="rounded-xl border border-edge bg-panel relative overflow-hidden">
      <div className="relative z-10 p-5 pb-0">
        <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
        <div className="flex items-end gap-3 mt-2">
          <p className="text-2xl font-semibold text-heading tracking-tight">{value}</p>
          {delta && (
            <span
              className={cn(
                "text-xs font-medium pb-0.5",
                delta.direction === "up" && "text-success",
                delta.direction === "down" && "text-error",
                delta.direction === "neutral" && "text-muted",
              )}
            >
              {delta.direction === "up" && "\u2191"}
              {delta.direction === "down" && "\u2193"}
              {delta.value}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {sparkData && sparkData.length > 0 ? (
        <div className="h-16 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData.map((v) => ({ v }))} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                fill={`url(#${id})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-5" />
      )}
    </div>
  );
}
