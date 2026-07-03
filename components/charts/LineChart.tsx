import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";

export interface LineChartProps {
  data: { time: number | string; value: number; label?: string }[];
  color?: string;
  height?: number;
  showDots?: boolean;
  showGrid?: boolean;
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
  const item = payload[0];
  return (
    <div className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs shadow-lg">
      <p className="text-slate-400 mb-0.5">{formatTime(label as number | string)}</p>
      {item.payload?.label && (
        <p className="text-slate-300 mb-0.5">{item.payload.label}</p>
      )}
      <p className="font-semibold font-mono" style={{ color: item.color }}>
        {Number(item.value).toLocaleString(undefined, { maximumFractionDigits: 5 })}
      </p>
    </div>
  );
}

export function LineChart({
  data,
  color = "#22d3ee",
  height = 200,
  showDots = false,
  showGrid = true,
  className = "",
}: LineChartProps) {
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
        <RechartsLineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
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

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "#334155", strokeWidth: 1 }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={showDots ? { r: 3, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LineChart;
