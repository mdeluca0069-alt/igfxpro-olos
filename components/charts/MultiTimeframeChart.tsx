import { CandlestickChart } from "./CandlestickChart";

export interface MultiTimeframeChartProps {
  symbol: string;
  timeframes?: string[];
  height?: number;
  className?: string;
}

export function MultiTimeframeChart({
  symbol,
  timeframes = ["5M", "1H", "1D"],
  height = 320,
  className = "",
}: MultiTimeframeChartProps) {
  return (
    <div className={["flex flex-col gap-0 bg-[#030712] rounded-lg overflow-hidden border border-slate-800", className].filter(Boolean).join(" ")}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 shrink-0">
        <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">{symbol}</span>
        <span className="text-[10px] text-slate-500">Multi-Timeframe</span>
      </div>

      {/* Panels grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${timeframes.length}, minmax(0, 1fr))`,
        }}
      >
        {timeframes.map((tf, idx) => (
          <div
            key={tf}
            className={["flex flex-col overflow-hidden", idx < timeframes.length - 1 ? "border-r border-slate-800" : ""].filter(Boolean).join(" ")}
          >
            <div className="px-3 py-1 border-b border-slate-800 flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-semibold text-slate-400 font-mono">{tf}</span>
            </div>
            <CandlestickChart
              symbol={symbol}
              timeframe={tf}
              height={height}
              showVolume={false}
              showToolbar={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default MultiTimeframeChart;
