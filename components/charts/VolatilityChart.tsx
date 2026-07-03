import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";

export interface VolatilityChartProps {
  data: { symbol: string; volatility: number; color?: string }[];
  height?: number;
  className?: string;
}

/** Assign a color based on relative volatility level */
function barColor(value: number, max: number, explicitColor?: string): string {
  if (explicitColor) return explicitColor;
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.7) return "#ef4444"; // high — rose
  if (ratio >= 0.4) return "#f59e0b"; // medium — amber
  return "#10b981";                   // low — emerald
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs shadow-lg">
      <p className="text-slate-300 font-semibold mb-0.5">{d.payload?.symbol}</p>
      <p className="font-mono" style={{ color: d.fill }}>
        {Number(d.value).toFixed(4)}%
      </p>
    </div>
  );
}

export function VolatilityChart({
  data,
  height = 240,
  className = "",
}: VolatilityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={["flex items-center justify-center rounded-lg bg-slate-950/60 border border-slate-800 text-slate-600 text-sm", className].filter(Boolean).join(" ")}
        style={{ height }}
      >
        No volatility data
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.volatility));

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

          <XAxis
            dataKey="symbol"
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={42}
            tickFormatter={(v: number) => `${v.toFixed(2)}%`}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.05)" }} />

          <Bar dataKey="volatility" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={barColor(entry.volatility, max, entry.color)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default VolatilityChart;
