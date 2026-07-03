import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";

export interface DrawdownChartProps {
  data: { time: string | number; drawdown: number }[];
  height?: number;
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
  const val = Number(payload[0].value);
  return (
    <div className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs shadow-lg">
      <p className="text-slate-400 mb-0.5">{formatTime(label as string | number)}</p>
      <p className={["font-semibold font-mono", val < 0 ? "text-rose-400" : "text-emerald-400"].join(" ")}>
        {val >= 0 ? "+" : ""}{val.toFixed(2)}%
      </p>
    </div>
  );
}

export function DrawdownChart({
  data,
  height = 200,
  className = "",
}: DrawdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={["flex items-center justify-center rounded-lg bg-slate-950/60 border border-slate-800 text-slate-600 text-sm", className].filter(Boolean).join(" ")}
        style={{ height }}
      >
        No drawdown data
      </div>
    );
  }

  const minVal = Math.min(...data.map((d) => d.drawdown));
  const maxVal = Math.max(...data.map((d) => d.drawdown));
  const domainMin = Math.min(minVal * 1.1, -0.5);
  const domainMax = Math.max(maxVal * 1.1, 0.5);

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="dd-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

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
            width={48}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            domain={[domainMin, domainMax]}
          />

          <ReferenceLine y={0} stroke="#475569" strokeWidth={1} strokeDasharray="4 2" />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="url(#dd-grad)"
            dot={false}
            activeDot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DrawdownChart;
