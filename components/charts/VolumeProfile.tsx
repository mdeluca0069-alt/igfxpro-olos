import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { MarketsAPI, candleLimitFor, type CandleRow } from "../../api/endpoints/markets";

export interface VolumeProfileProps {
  /** Symbol to fetch candles for */
  symbol: string;
  /** Timeframe for candles, default "1H" */
  timeframe?: string;
  /** Number of price buckets in the profile, default 30 */
  buckets?: number;
  /** Chart height in px, default 400 */
  height?: number;
  className?: string;
}

interface ProfileBucket {
  priceLevel: string;
  volume: number;
  priceMid: number;
  isPOC: boolean;   // Point of Control (highest volume)
  isVAH: boolean;   // Value Area High
  isVAL: boolean;   // Value Area Low
}

/** Build volume-profile buckets from raw candle data */
function buildProfile(candles: CandleRow[], buckets: number): ProfileBucket[] {
  if (candles.length === 0) return [];

  const allLows = candles.map((c) => c.low);
  const allHighs = candles.map((c) => c.high);
  const globalLow = Math.min(...allLows);
  const globalHigh = Math.max(...allHighs);
  const range = globalHigh - globalLow;
  if (range === 0) return [];

  const bucketSize = range / buckets;
  const volumeByBucket = new Array<number>(buckets).fill(0);

  // Distribute each candle's volume across the price buckets it spans
  for (const c of candles) {
    const startBucket = Math.max(0, Math.floor((c.low - globalLow) / bucketSize));
    const endBucket = Math.min(buckets - 1, Math.floor((c.high - globalLow) / bucketSize));
    const span = endBucket - startBucket + 1;
    const volPerBucket = c.volume / span;
    for (let b = startBucket; b <= endBucket; b++) {
      volumeByBucket[b] += volPerBucket;
    }
  }

  const totalVol = volumeByBucket.reduce((s, v) => s + v, 0);
  const pocIdx = volumeByBucket.indexOf(Math.max(...volumeByBucket));

  // Value area = 70% of total volume centered around POC
  const valueAreaTarget = totalVol * 0.7;
  let vahIdx = pocIdx;
  let valIdx = pocIdx;
  let accumulated = volumeByBucket[pocIdx];

  while (accumulated < valueAreaTarget) {
    const upNext = vahIdx + 1 < buckets ? volumeByBucket[vahIdx + 1] : -Infinity;
    const downNext = valIdx - 1 >= 0 ? volumeByBucket[valIdx - 1] : -Infinity;
    if (upNext >= downNext && vahIdx + 1 < buckets) {
      vahIdx++;
      accumulated += volumeByBucket[vahIdx];
    } else if (valIdx - 1 >= 0) {
      valIdx--;
      accumulated += volumeByBucket[valIdx];
    } else {
      break;
    }
  }

  const decimals = globalHigh < 10 ? 5 : globalHigh < 100 ? 4 : 2;

  return volumeByBucket.map((vol, i) => {
    const priceLow = globalLow + i * bucketSize;
    const priceHigh = priceLow + bucketSize;
    const priceMid = (priceLow + priceHigh) / 2;
    return {
      priceLevel: priceMid.toFixed(decimals),
      priceMid,
      volume: Math.round(vol),
      isPOC: i === pocIdx,
      isVAH: i === vahIdx,
      isVAL: i === valIdx,
    };
  });
}

function bucketColor(b: ProfileBucket): string {
  if (b.isPOC) return "#f59e0b";   // amber — Point of Control
  if (b.isVAH || b.isVAL) return "#22d3ee"; // cyan — Value Area edges
  return "#1d4ed8";                 // blue — regular
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ProfileBucket;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs shadow-lg min-w-[130px]">
      <p className="text-slate-300 font-mono mb-0.5">{d.priceLevel}</p>
      <p className="text-slate-400">
        Vol: <span className="text-slate-200 font-semibold">{d.volume.toLocaleString()}</span>
      </p>
      {d.isPOC && <p className="text-amber-400 mt-0.5 font-semibold">Point of Control</p>}
      {d.isVAH && <p className="text-cyan-400 mt-0.5">Value Area High</p>}
      {d.isVAL && <p className="text-cyan-400 mt-0.5">Value Area Low</p>}
    </div>
  );
}

export function VolumeProfile({
  symbol,
  timeframe = "1H",
  buckets = 30,
  height = 400,
  className = "",
}: VolumeProfileProps) {
  const [profile, setProfile] = useState<ProfileBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    MarketsAPI.getCandles(symbol, timeframe, candleLimitFor(timeframe))
      .then((rows) => {
        if (cancelled) return;
        setProfile(buildProfile(rows, buckets));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load volume profile");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe, buckets]);

  return (
    <div
      className={["flex flex-col bg-[#030712] rounded-lg overflow-hidden border border-slate-800", className].filter(Boolean).join(" ")}
      style={{ minHeight: height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">{symbol}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{timeframe}</span>
        </div>
        <span className="text-[10px] text-slate-500">Volume Profile</span>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-amber-400" />
            <span className="text-slate-400">POC</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-cyan-400" />
            <span className="text-slate-400">VA</span>
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative flex-1" style={{ minHeight: height - 40 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#030712]/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span className="text-xs text-slate-400">Computing profile…</span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#030712]/90 z-10">
            <div className="text-center">
              <p className="text-rose-400 text-sm font-semibold">Profile unavailable</p>
              <p className="text-slate-500 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}
        {!loading && !error && profile.length > 0 && (
          <ResponsiveContainer width="100%" height={height - 40}>
            <BarChart
              layout="vertical"
              data={profile}
              margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
              barCategoryGap="2%"
            >
              <XAxis
                type="number"
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)
                }
              />
              <YAxis
                type="category"
                dataKey="priceLevel"
                tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                width={64}
                interval="preserveStartEnd"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.04)" }} />
              <Bar dataKey="volume" radius={[0, 2, 2, 0]} isAnimationActive={false}>
                {profile.map((entry, idx) => (
                  <Cell key={`vp-${idx}`} fill={bucketColor(entry)} fillOpacity={entry.isPOC ? 1 : 0.65} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default VolumeProfile;
