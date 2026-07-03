/**
 * IGFXPRO — Portfolio Comparison Dashboard
 * Compares account equity curve vs market benchmarks.
 * Benchmarks: S&P 500 (US500), Gold (XAUUSD), BTC (BTCUSD).
 * All starting normalized to 100 on the first common date.
 * Real data: equity curve from /api/v1/portfolio/equity-curve,
 *            benchmark candles from /api/v1/candles/:symbol/1D.
 */
import { memo, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from "recharts";
import {
  BarChart2, TrendingUp, TrendingDown,
  GitCompare, RefreshCw, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiGet }       from "../../shared/lib/apiHelpers";
import { number, pct }  from "../../shared/utils/format";
import { usePageTitle } from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type EquityPoint  = { date: string; equity: number; dailyPnl: number };
type OhlcvBar     = { time: number; open: number; high: number; low: number; close: number; volume: number };

type EquityCurveResp = {
  curve:       EquityPoint[];
  sharpe:      number;
  sortino:     number;
  maxDrawdown: number;
  dataPoints:  number;
};

type Period = "1M" | "3M" | "6M" | "YTD" | "1Y";
type BenchmarkId = "US500" | "XAUUSD" | "BTCUSD";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: "1M",  label: "1M",  days: 30  },
  { id: "3M",  label: "3M",  days: 90  },
  { id: "6M",  label: "6M",  days: 180 },
  { id: "YTD", label: "YTD", days: 0   },  // computed dynamically
  { id: "1Y",  label: "1Y",  days: 365 },
];

const BENCHMARKS: { id: BenchmarkId; label: string; color: string; emoji: string }[] = [
  { id: "US500",  label: "S&P 500",  color: "#f59e0b", emoji: "📈" },
  { id: "XAUUSD", label: "Gold",     color: "#fbbf24", emoji: "🥇" },
  { id: "BTCUSD", label: "Bitcoin",  color: "#f97316", emoji: "₿"  },
];

const PORTFOLIO_COLOR = "#22d3ee";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodDays(p: Period): number {
  if (p === "YTD") {
    const now   = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.ceil((now.getTime() - start.getTime()) / 86_400_000);
  }
  return PERIODS.find((x) => x.id === p)!.days;
}

/** Normalize a series to start at 100 on the first available date */
function normalizeToBase100(points: { date: string; value: number }[]): { date: string; value: number }[] {
  if (points.length === 0) return [];
  const base = points[0].value;
  if (!base) return points.map((p) => ({ ...p, value: 100 }));
  return points.map((p) => ({ ...p, value: (p.value / base) * 100 }));
}

/** Convert epoch (seconds) candles to {date, value} */
function ohlcvToSeries(bars: OhlcvBar[]): { date: string; value: number }[] {
  return bars.map((b) => ({
    date:  new Date(b.time * 1000).toISOString().slice(0, 10),
    value: b.close,
  }));
}

/** Convert equity curve to {date, value} using equity column */
function equityToSeries(points: EquityPoint[]): { date: string; value: number }[] {
  return points.map((p) => ({ date: p.date.slice(0, 10), value: p.equity }));
}

/** Merge arrays keyed by date, forward-filling gaps */
function mergeSeries(
  portfolio: { date: string; value: number }[],
  benchmarks: { id: string; points: { date: string; value: number }[] }[]
): { date: string; portfolio: number; [key: string]: number | string }[] {
  const allDates = new Set<string>();
  for (const p of portfolio)   allDates.add(p.date);
  for (const b of benchmarks) for (const p of b.points) allDates.add(p.date);

  const sorted = [...allDates].sort();
  const portMap = new Map(portfolio.map((p) => [p.date, p.value]));
  const bmMaps  = benchmarks.map((b) => ({
    id:  b.id,
    map: new Map(b.points.map((p) => [p.date, p.value])),
  }));

  const result: { date: string; portfolio: number; [key: string]: number | string }[] = [];
  let lastPort = 100;
  const lastBm: Record<string, number> = {};
  for (const bm of benchmarks) lastBm[bm.id] = 100;

  for (const date of sorted) {
    const port = portMap.get(date);
    if (port !== undefined) lastPort = port;

    const row: { date: string; portfolio: number; [key: string]: number | string } = {
      date,
      portfolio: lastPort,
    };

    for (const bm of bmMaps) {
      const val = bm.map.get(date);
      if (val !== undefined) lastBm[bm.id] = val;
      row[bm.id] = lastBm[bm.id];
    }
    result.push(row);
  }

  return result;
}

/** Compute max drawdown from normalized series */
function maxDrawdown(series: { value: number }[]): number {
  let peak = 0; let dd = 0;
  for (const p of series) {
    if (p.value > peak) peak = p.value;
    const cur = peak > 0 ? ((peak - p.value) / peak) * 100 : 0;
    if (cur > dd) dd = cur;
  }
  return dd;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, cls = "text-white", delta }: {
  label: string; value: string; sub?: string; cls?: string;
  delta?: { value: number; betterThan: string };
}) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-[#07111e] px-4 py-3.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</p>
      <p className={`mt-1.5 text-lg font-extrabold tabular-nums ${cls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-600">{sub}</p>}
      {delta && (
        <p className={`mt-1 text-[10px] font-bold ${delta.value >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {delta.value >= 0 ? "▲" : "▼"} {Math.abs(delta.value).toFixed(1)}pp vs {delta.betterThan}
        </p>
      )}
    </div>
  );
}

// ─── Score card (relative ranking) ───────────────────────────────────────────

const RankCard = memo(function RankCard({
  label, rank, total, pct: pctVal, color,
}: { label: string; rank: number; total: number; pct: number; color: string }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-[#07111e] px-4 py-3">
      <span className="text-2xl">{medal}</span>
      <div className="flex-1">
        <p className="text-[11px] font-bold text-white">{label}</p>
        <p className="text-[9px] text-slate-600">Rank {rank} of {total}</p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full transition-all" style={{ width: `${pctVal}%`, backgroundColor: color }} />
        </div>
      </div>
      <span className="font-mono text-[13px] font-black" style={{ color }}>
        {pct(pctVal - 100, 1)}
      </span>
    </div>
  );
});

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ComparisonTip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#050a0f] px-3 py-2.5 text-[11px] shadow-2xl">
      <p className="mb-2 text-[9px] font-bold text-slate-500">{label}</p>
      {sorted.map((s) => (
        <div key={s.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-slate-400">{s.name}</span>
          </span>
          <span className="font-mono font-bold" style={{ color: s.color }}>
            {s.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PortfolioComparison() {
  usePageTitle("Portfolio Comparison");

  const [period,           setPeriod]     = useState<Period>("3M");
  const [activeBenchmarks, setActive]     = useState<Set<BenchmarkId>>(new Set(["US500", "XAUUSD"]));
  const [showRelative,     setRelative]   = useState(true);

  const days = getPeriodDays(period);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: curveResp, isLoading: curveLoading, isError: curveError } = useQuery<EquityCurveResp>({
    queryKey: ["equity-curve", days],
    queryFn:  () => apiGet(`/api/v1/portfolio/equity-curve?days=${days}`),
    staleTime: 120_000,
  });

  const { data: us500Bars, isLoading: sp500Loading } = useQuery<OhlcvBar[]>({
    queryKey: ["candles-compare", "US500", days],
    queryFn:  () => apiGet(`/api/v1/candles/US500/1D?limit=${days}`),
    staleTime: 600_000,
    enabled: activeBenchmarks.has("US500"),
  });

  const { data: xauBars, isLoading: xauLoading } = useQuery<OhlcvBar[]>({
    queryKey: ["candles-compare", "XAUUSD", days],
    queryFn:  () => apiGet(`/api/v1/candles/XAUUSD/1D?limit=${days}`),
    staleTime: 600_000,
    enabled: activeBenchmarks.has("XAUUSD"),
  });

  const { data: btcBars, isLoading: btcLoading } = useQuery<OhlcvBar[]>({
    queryKey: ["candles-compare", "BTCUSD", days],
    queryFn:  () => apiGet(`/api/v1/candles/BTCUSD/1D?limit=${days}`),
    staleTime: 600_000,
    enabled: activeBenchmarks.has("BTCUSD"),
  });

  const isLoading = curveLoading || sp500Loading || xauLoading || btcLoading;

  // ── Series computation ─────────────────────────────────────────────────────

  const { merged, benchmarkSeries, portfolioSeries, stats } = useMemo(() => {
    if (!curveResp) return { merged: [], benchmarkSeries: [], portfolioSeries: [], stats: null };

    const rawPortfolio = equityToSeries(curveResp.curve);
    const portNorm     = normalizeToBase100(rawPortfolio);

    const bmRaw: { id: BenchmarkId; label: string; color: string; points: { date: string; value: number }[] }[] = [];

    if (us500Bars && activeBenchmarks.has("US500")) {
      const s = BENCHMARKS.find((b) => b.id === "US500")!;
      bmRaw.push({ id: "US500", label: s.label, color: s.color, points: normalizeToBase100(ohlcvToSeries(us500Bars)) });
    }
    if (xauBars && activeBenchmarks.has("XAUUSD")) {
      const s = BENCHMARKS.find((b) => b.id === "XAUUSD")!;
      bmRaw.push({ id: "XAUUSD", label: s.label, color: s.color, points: normalizeToBase100(ohlcvToSeries(xauBars)) });
    }
    if (btcBars && activeBenchmarks.has("BTCUSD")) {
      const s = BENCHMARKS.find((b) => b.id === "BTCUSD")!;
      bmRaw.push({ id: "BTCUSD", label: s.label, color: s.color, points: normalizeToBase100(ohlcvToSeries(btcBars)) });
    }

    const merged = mergeSeries(portNorm, bmRaw);

    // Final return for each series
    const portFinal = portNorm[portNorm.length - 1]?.value ?? 100;
    const bmStats: { id: BenchmarkId; label: string; color: string; ret: number; dd: number }[] = [];
    for (const bm of bmRaw) {
      const final = bm.points[bm.points.length - 1]?.value ?? 100;
      bmStats.push({
        id:    bm.id,
        label: bm.label,
        color: bm.color,
        ret:   final - 100,
        dd:    maxDrawdown(bm.points),
      });
    }

    // Rank portfolio against benchmarks
    const allReturns = [
      { id: "portfolio", label: "Your Portfolio", color: PORTFOLIO_COLOR, ret: portFinal - 100 },
      ...bmStats,
    ].sort((a, b) => b.ret - a.ret);

    const portRank = allReturns.findIndex((x) => x.id === "portfolio") + 1;

    return {
      merged,
      benchmarkSeries: bmRaw,
      portfolioSeries: portNorm,
      stats: {
        portReturn:   portFinal - 100,
        portMaxDD:    maxDrawdown(portNorm),
        portSharpe:   curveResp.sharpe,
        portSortino:  curveResp.sortino,
        portRank,
        total:        allReturns.length,
        bmStats,
        allReturns,
      },
    };
  }, [curveResp, us500Bars, xauBars, btcBars, activeBenchmarks]);

  function toggleBenchmark(id: BenchmarkId) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Derived chart data ─────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (!merged.length) return [];
    const step = Math.max(1, Math.floor(merged.length / 120));
    return merged.filter((_, i) => i % step === 0 || i === merged.length - 1);
  }, [merged]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (curveError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05070d] text-slate-600">
        <AlertCircle size={28} />
        <p className="text-[13px]">Portfolio data unavailable</p>
        <p className="text-[11px]">Start the backend to load comparison data</p>
        <Link to="/portfolio" className="mt-2 text-[12px] text-cyan-400 hover:text-cyan-300">
          ← Back to Portfolio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1200px] space-y-5 p-5">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07]">
              <GitCompare size={14} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">IGFXPRO</p>
              <h1 className="text-[15px] font-extrabold text-white">Portfolio Comparison</h1>
            </div>
          </div>

          {/* Period tabs */}
          <div className="ml-auto flex items-center gap-1 rounded-xl border border-slate-800/60 bg-slate-900/40 p-0.5">
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={[
                  "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                  period === p.id
                    ? "bg-cyan-400/20 text-cyan-300"
                    : "text-slate-500 hover:text-slate-300",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Benchmark toggles ── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Benchmarks:</span>
          {BENCHMARKS.map((b) => (
            <button
              key={b.id}
              onClick={() => toggleBenchmark(b.id)}
              className={[
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition",
                activeBenchmarks.has(b.id)
                  ? "border-current bg-current/10"
                  : "border-slate-700/60 text-slate-500 hover:text-slate-300",
              ].join(" ")}
              style={activeBenchmarks.has(b.id) ? { color: b.color, borderColor: b.color + "60" } : undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: activeBenchmarks.has(b.id) ? b.color : "#475569" }} />
              {b.emoji} {b.label}
            </button>
          ))}

          <button
            onClick={() => setRelative((v) => !v)}
            className={[
              "ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition",
              showRelative
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                : "border-slate-700/60 text-slate-500 hover:text-slate-300",
            ].join(" ")}
          >
            Normalized (100)
          </button>
        </div>

        {/* ── KPIs ── */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Portfolio Return"
              value={`${stats.portReturn >= 0 ? "+" : ""}${stats.portReturn.toFixed(1)}%`}
              cls={stats.portReturn >= 0 ? "text-emerald-400" : "text-rose-400"}
              sub={`${period} period`}
            />
            <KpiCard
              label="Max Drawdown"
              value={`-${stats.portMaxDD.toFixed(1)}%`}
              cls={stats.portMaxDD > 20 ? "text-rose-400" : stats.portMaxDD > 10 ? "text-amber-400" : "text-emerald-400"}
            />
            <KpiCard
              label="Sharpe Ratio"
              value={number(stats.portSharpe, 2)}
              cls={stats.portSharpe > 1 ? "text-emerald-400" : stats.portSharpe > 0 ? "text-amber-400" : "text-rose-400"}
              sub="Risk-adjusted return"
            />
            <KpiCard
              label="Ranking"
              value={`${stats.portRank} / ${stats.total}`}
              cls="text-white"
              sub={stats.portRank === 1 ? "Best performer" : "vs benchmarks"}
            />
          </div>
        )}

        {/* ── Main comparison chart ── */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-white">
              Normalized Performance (Base = 100)
            </h2>
            {isLoading && (
              <RefreshCw size={12} className="animate-spin text-slate-600" />
            )}
          </div>

          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#475569" }}
                  tickLine={false} axisLine={false}
                  interval={Math.max(0, Math.floor(chartData.length / 8))}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#475569" }}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(0)}`}
                  width={42}
                  domain={["auto", "auto"]}
                />
                <ReferenceLine y={100} stroke="#334155" strokeDasharray="3 3" />
                <Tooltip content={<ComparisonTip />} />
                <Legend
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: "10px", paddingTop: "12px" }}
                />

                {/* Portfolio */}
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  name="Your Portfolio"
                  stroke={PORTFOLIO_COLOR}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />

                {/* Benchmarks */}
                {BENCHMARKS.filter((b) => activeBenchmarks.has(b.id)).map((b) => (
                  <Line
                    key={b.id}
                    type="monotone"
                    dataKey={b.id}
                    name={b.label}
                    stroke={b.color}
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 2"
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-slate-700">
              {curveLoading
                ? <><RefreshCw size={18} className="mr-2 animate-spin" />Loading equity curve…</>
                : <><BarChart2 size={18} className="mr-2" />No trading history in this period</>}
            </div>
          )}
        </div>

        {/* ── Ranking leaderboard ── */}
        {stats && stats.total > 1 && (
          <div className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-5">
            <h2 className="mb-4 text-[13px] font-bold text-white">Performance Ranking</h2>
            <div className="space-y-2">
              {stats.allReturns.map((item, i) => (
                <RankCard
                  key={item.id}
                  label={item.label}
                  rank={i + 1}
                  total={stats.total}
                  pct={100 + item.ret}
                  color={item.color}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Benchmark detail cards ── */}
        {stats && stats.bmStats.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {stats.bmStats.map((bm) => {
              const diff = stats.portReturn - bm.ret;
              return (
                <div key={bm.id}
                  className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bm.color }} />
                    <h3 className="text-[12px] font-bold text-white">{bm.label}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Return</span>
                      <span className={`font-mono font-bold ${bm.ret >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {bm.ret >= 0 ? "+" : ""}{bm.ret.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Max DD</span>
                      <span className="font-mono font-bold text-rose-400">-{bm.dd.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/50 pt-2 text-[11px]">
                      <span className="text-slate-500">vs Your Portfolio</span>
                      <span className={`flex items-center gap-1 font-mono font-bold ${diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {diff >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {diff >= 0 ? "+" : ""}{diff.toFixed(1)}pp
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Drawdown comparison chart ── */}
        {chartData.length > 1 && benchmarkSeries.length > 0 && (
          <DrawdownChart
            portfolio={portfolioSeries}
            benchmarks={benchmarkSeries}
            chartData={chartData}
          />
        )}

        {/* ── Links ── */}
        <div className="flex gap-3 text-[12px]">
          <Link to="/portfolio"           className="text-cyan-400 hover:text-cyan-300">← Portfolio</Link>
          <Link to="/reports"             className="text-slate-500 hover:text-slate-400">Reports</Link>
          <Link to="/risk"                className="text-slate-500 hover:text-slate-400">Risk Center</Link>
        </div>
      </main>
    </div>
  );
}

// ─── Drawdown chart ───────────────────────────────────────────────────────────

const DrawdownChart = memo(function DrawdownChart({
  portfolio,
  benchmarks,
  chartData,
}: {
  portfolio:  { date: string; value: number }[];
  benchmarks: { id: BenchmarkId; label: string; color: string; points: { date: string; value: number }[] }[];
  chartData:  { date: string; [key: string]: number | string }[];
}) {
  // Compute drawdown series for each entity
  const ddData = useMemo(() => {
    const portDd = computeDrawdownSeries(portfolio);
    const portMap = new Map(portDd.map((p) => [p.date, p.dd]));

    const bmMaps = benchmarks.map((b) => {
      const dd = computeDrawdownSeries(b.points);
      return { id: b.id, map: new Map(dd.map((p) => [p.date, p.dd])) };
    });

    return chartData.map((row) => {
      const result: { date: string; portfolio: number; [key: string]: number | string } = {
        date:      row.date as string,
        portfolio: -(portMap.get(row.date as string) ?? 0),
      };
      for (const bm of bmMaps) {
        result[bm.id] = -(bm.map.get(row.date as string) ?? 0);
      }
      return result;
    });
  }, [portfolio, benchmarks, chartData]);

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-5">
      <h2 className="mb-4 text-[13px] font-bold text-white">Drawdown Comparison</h2>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={ddData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false}
            interval={Math.max(0, Math.floor(ddData.length / 8))} />
          <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}%`} width={40} />
          <ReferenceLine y={0} stroke="#334155" />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 10 }}
            formatter={(v: number, n: string) => [`${v.toFixed(1)}%`, n]}
          />
          <Area type="monotone" dataKey="portfolio" name="Portfolio" stroke={PORTFOLIO_COLOR}
            fill={PORTFOLIO_COLOR} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
          {benchmarks.map((b) => (
            <Area key={b.id} type="monotone" dataKey={b.id} name={b.label}
              stroke={b.color} fill={b.color} fillOpacity={0.06} strokeWidth={1}
              dot={false} strokeDasharray="4 2" />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

function computeDrawdownSeries(series: { date: string; value: number }[]): { date: string; dd: number }[] {
  let peak = 0;
  return series.map((p) => {
    if (p.value > peak) peak = p.value;
    const dd = peak > 0 ? ((peak - p.value) / peak) * 100 : 0;
    return { date: p.date, dd };
  });
}

export { PortfolioComparison };
