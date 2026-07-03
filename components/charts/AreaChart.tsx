import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";

export interface AreaChartProps {
  data: { time: number | string; value: number }[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  gradientOpacity?: number;
  className?: string;
}

function formatTime(val: number | string): string {
  if (typeof val === "number") {
    return new Date(val * 1000).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
  }
  return String(val);
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs shadow-lg">
      <p className="text-slate-400 mb-0.5">{formatTime(label as number | string)}</p>
      <p className="text-cyan-300 font-semibold font-mono">
        {Number(payload[0].value).toLocaleString(undefined, { maximumFractionDigits: 5 })}
      </p>
    </div>
  );
}

export function AreaChart({
  data,
  color = "#22d3ee",
  height = 200,
  showGrid = true,
  showTooltip = true,
  gradientOpacity = 0.3,
  className = "",
}: AreaChartProps) {
  const gradientId = `area-grad-${color.replace("#", "")}`;

  if (!data || data.length === 0) {
    return (
      <div
        className={["flex items-center justify-center rounded-lg bg-slate-950/60 border border-slate-800 text-slate-600 text-sm", className].filter(Boolean).join(" ")}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={gradientOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          )}

          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={54}
            tickFormatter={(v: number) =>
              v >= 1000 ? v.toFixed(2) : v >= 10 ? v.toFixed(4) : v.toFixed(5)
            }
            domain={["auto", "auto"]}
          />

          {showTooltip && <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />}

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AreaChart;
