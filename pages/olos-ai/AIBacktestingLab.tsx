/**
 * AI Backtesting Lab — Real backtesting engine
 * Runs on real historical candle data from the backend.
 * Strategies: OLOS Momentum, Mean Reversion, Breakout, Trend Follow, Scalp.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical, Play, BarChart2, AlertCircle, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Clock, Activity, Zap, RefreshCw,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, CartesianGrid, XAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { tokenVault } from "../../shared/lib/tokenVault";

const SYMBOLS    = ["EURUSD", "XAUUSD", "US500", "BTCUSD", "GBPUSD", "USDJPY", "GBPJPY", "USDCHF", "ETHUSD", "US100"];
const TIMEFRAMES = ["1M", "5M", "15M", "1H", "4H", "1D"];
const STRATEGIES = [
  "OLOS Momentum",
  "OLOS Mean Reversion",
  "OLOS Breakout",
  "OLOS Trend Follow",
  "OLOS Scalp",
];

type BacktestTrade = {
  entryTime:   number;
  exitTime:    number;
  entryPrice:  number;
  exitPrice:   number;
  side:        "BUY" | "SELL";
  pnlPips:     number;
  pnlUsd:      number;
  exitReason:  "TP" | "SL" | "SIGNAL";
  durationMin: number;
};

type BacktestMetrics = {
  totalTrades: number; winTrades: number; lossTrades: number;
  winRate:     number; totalPnlUsd: number; grossProfit: number;
  grossLoss:   number; profitFactor: number; avgWin: number;
  avgLoss:     number; sharpeRatio: number; maxDrawdown: number;
  maxDrawdownPct: number;
};

type BacktestResult = {
  symbol: string; timeframe: string; strategy: string;
  candlesAnalyzed: number;
  period: { from: string; to: string };
  metrics:     BacktestMetrics;
  trades:      BacktestTrade[];
  equityCurve: { time: number; equity: number }[];
  note?:       string;
};

async function runBacktest(params: {
  symbol: string; timeframe: string; strategy: string;
  dateFrom: string; dateTo: string; initialCapital: number;
}): Promise<BacktestResult> {
  const token = tokenVault.getAccessToken();
  const res = await fetch("/api/v1/ai/backtest", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Backtest failed: ${res.status}`);
  return res.json();
}

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#07111e] p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">{label}</p>
      <p className={`mt-1.5 text-[22px] font-black tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-600">{sub}</p>}
    </div>
  );
}

// ─── Equity curve tooltip ─────────────────────────────────────────────────────
function CurveTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]!.value;
  return (
    <div className="rounded-xl border border-white/[0.1] bg-slate-900/95 px-3 py-2 text-[11px] backdrop-blur">
      <p className={`font-black ${v >= 10000 ? "text-emerald-300" : "text-rose-300"}`}>
        ${v.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AIBacktestingLab() {
  const [symbol,   setSymbol]   = useState("EURUSD");
  const [tf,       setTf]       = useState("1H");
  const [strategy, setStrategy] = useState("OLOS Momentum");
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo,   setDateTo]   = useState("2025-06-01");
  const [capital,  setCapital]  = useState(10000);
  const [run,      setRun]      = useState(0);

  const { data: result, isLoading, error } = useQuery<BacktestResult>({
    queryKey: ["backtest", symbol, tf, strategy, dateFrom, dateTo, capital, run],
    queryFn:  () => runBacktest({ symbol, timeframe: tf, strategy, dateFrom, dateTo, initialCapital: capital }),
    enabled:  run > 0,
    staleTime: Infinity,
    retry: false,
  });

  const m = result?.metrics;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200 p-5 lg:p-8">

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical size={18} className="text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">OLOS AI</span>
        </div>
        <h1 className="text-[28px] font-black text-white">Backtesting Lab</h1>
        <p className="mt-1 text-[13px] text-slate-500">Real backtesting on live candle data — 5 algorithmic strategies</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

        {/* ── Config panel ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#07111e] p-5 space-y-4">
            <h2 className="text-[13px] font-black text-white">Configuration</h2>

            {/* Symbol */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Symbol</label>
              <select value={symbol} onChange={e => setSymbol(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-[13px] text-white outline-none focus:border-cyan-400/50">
                {SYMBOLS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Timeframe */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Timeframe</label>
              <div className="grid grid-cols-6 gap-1">
                {TIMEFRAMES.map(t => (
                  <button key={t} onClick={() => setTf(t)}
                    className={`rounded-lg py-2 text-[11px] font-black transition ${tf === t ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-500 hover:border-slate-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Strategy</label>
              <div className="space-y-1.5">
                {STRATEGIES.map(s => (
                  <button key={s} onClick={() => setStrategy(s)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-[12px] font-bold transition ${strategy === s ? "border-cyan-400/40 bg-cyan-400/[0.08] text-cyan-300" : "border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-white"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-[12px] text-white outline-none focus:border-cyan-400/50" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-[12px] text-white outline-none focus:border-cyan-400/50" />
              </div>
            </div>

            {/* Capital */}
            <div>
              <label className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Initial Capital</span>
                <span className="text-white">${capital.toLocaleString()}</span>
              </label>
              <input type="number" value={capital} min={1000} step={1000}
                onChange={e => setCapital(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 font-mono text-[13px] text-white outline-none focus:border-cyan-400/50" />
            </div>

            {/* Risk warning */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3.5 py-3">
              <AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-[11px] leading-5 text-amber-400/70">Results based on available candle data. Past performance does not guarantee future results.</p>
            </div>

            {/* Run button */}
            <button onClick={() => setRun(r => r + 1)} disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3.5 text-[13px] font-black text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300 disabled:opacity-50">
              {isLoading
                ? <><RefreshCw size={14} className="animate-spin" /> Running engine...</>
                : <><Play size={15} /> Run backtest</>}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="space-y-5">

          {/* Empty / loading / error states */}
          {run === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#07111e] py-24">
              <BarChart2 size={40} className="mb-4 text-slate-700" />
              <p className="text-[14px] font-bold text-slate-600">Configure and run the backtest</p>
              <p className="mt-1 text-[12px] text-slate-700">Results will appear here with real candle data</p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#07111e] py-24">
              <div className="mb-4 h-10 w-10 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
              <p className="text-[14px] font-bold text-slate-400">Running OLOS backtest engine...</p>
              <p className="mt-1 text-[12px] text-slate-600">{symbol} · {tf} · {strategy}</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] p-6 text-center">
              <p className="text-[13px] font-bold text-rose-400">Backtest error: {(error as Error).message}</p>
              <p className="mt-1 text-[11px] text-rose-400/60">Ensure the backend is running and there is candle data available.</p>
            </div>
          )}

          {result && m && !isLoading && (
            <>
              {/* Info banner */}
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <Activity size={11} className="text-cyan-400" />
                  <span className="text-[11px] text-slate-400">{result.candlesAnalyzed} candles analyzed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-slate-500" />
                  <span className="text-[11px] text-slate-500">
                    {result.period.from !== "-" ? new Date(result.period.from).toLocaleDateString() : "N/A"}
                    {" → "}
                    {result.period.to !== "-" ? new Date(result.period.to).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                {result.note && (
                  <span className="text-[11px] text-amber-400/80">{result.note}</span>
                )}
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                <MetricCard label="Win Rate"    value={`${m.winRate.toFixed(1)}%`}
                  color={m.winRate > 55 ? "text-emerald-300" : m.winRate > 45 ? "text-amber-300" : "text-rose-300"} />
                <MetricCard label="Total Trades" value={m.totalTrades} color="text-white" />
                <MetricCard label="Total P&L"
                  value={`${m.totalPnlUsd >= 0 ? "+" : ""}$${m.totalPnlUsd.toLocaleString("en", { maximumFractionDigits: 0 })}`}
                  color={m.totalPnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"} />
                <MetricCard label="Profit Factor"
                  value={m.profitFactor >= 99 ? "∞" : m.profitFactor.toFixed(2)}
                  color={m.profitFactor > 1.5 ? "text-emerald-300" : m.profitFactor > 1 ? "text-amber-300" : "text-rose-300"} />
                <MetricCard label="Sharpe Ratio"
                  value={m.sharpeRatio.toFixed(2)}
                  color={m.sharpeRatio > 1 ? "text-emerald-300" : m.sharpeRatio > 0.5 ? "text-amber-300" : "text-rose-300"} />
                <MetricCard label="Max Drawdown"
                  value={`${m.maxDrawdownPct.toFixed(1)}%`}
                  color={m.maxDrawdownPct < 10 ? "text-emerald-300" : m.maxDrawdownPct < 20 ? "text-amber-300" : "text-rose-300"}
                  sub={`$${m.maxDrawdown.toFixed(2)}`} />
                <MetricCard label="Avg Win"    value={`$${m.avgWin.toFixed(2)}`}  color="text-emerald-300" />
                <MetricCard label="Avg Loss"   value={`$${m.avgLoss.toFixed(2)}`} color="text-rose-300" />
              </div>

              {/* Equity curve */}
              {result.equityCurve.length > 1 && (
                <div className="rounded-2xl border border-white/[0.07] bg-[#07111e] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[12px] font-black text-white">Equity Curve</p>
                    <span className={`text-[13px] font-black ${m.totalPnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {m.totalPnlUsd >= 0 ? "+" : ""}${m.totalPnlUsd.toLocaleString("en", { maximumFractionDigits: 0 })} return
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={result.equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="eq-bt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={m.totalPnlUsd >= 0 ? "#34d399" : "#f87171"} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={m.totalPnlUsd >= 0 ? "#34d399" : "#f87171"} stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ffffff08" />
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip content={<CurveTooltip />} />
                      <Area type="monotone" dataKey="equity"
                        stroke={m.totalPnlUsd >= 0 ? "#34d399" : "#f87171"} strokeWidth={2}
                        fill="url(#eq-bt)" dot={false} isAnimationActive />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Win/loss bar */}
              <div className="rounded-2xl border border-white/[0.07] bg-[#07111e] p-5">
                <p className="mb-3 text-[12px] font-black text-white">Trade Distribution</p>
                <div className="h-4 overflow-hidden rounded-full" style={{ display: "flex" }}>
                  <div className="h-full bg-emerald-400 rounded-l-full transition-all"
                    style={{ width: `${m.winRate}%` }} />
                  <div className="h-full flex-1 bg-rose-400 rounded-r-full" />
                </div>
                <div className="mt-2 flex justify-between text-[11px]">
                  <span className="font-black text-emerald-400">{m.winTrades} wins ({m.winRate.toFixed(1)}%)</span>
                  <span className="font-black text-rose-400">{m.lossTrades} losses</span>
                </div>
              </div>

              {/* Trade table */}
              {result.trades.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#07111e]">
                  <div className="border-b border-white/[0.05] px-5 py-3.5">
                    <p className="text-[12px] font-black text-white">Recent Trades (last {result.trades.length})</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.05]">
                          {["Entry", "Exit", "Side", "P&L", "P&L Pips", "Exit", "Duration"].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades.map((t, i) => (
                          <motion.tr key={i}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                            className="border-t border-white/[0.03] transition hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-2.5 text-slate-500">{new Date(t.entryTime).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5 text-slate-500">{new Date(t.exitTime).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5">
                              <span className={`flex items-center gap-1 text-[10px] font-black ${t.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                                {t.side === "BUY" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {t.side}
                              </span>
                            </td>
                            <td className={`px-4 py-2.5 font-mono font-black ${t.pnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                              {t.pnlUsd >= 0 ? "+" : ""}${t.pnlUsd.toFixed(2)}
                            </td>
                            <td className={`px-4 py-2.5 font-mono text-[11px] ${t.pnlPips >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                              {t.pnlPips >= 0 ? "+" : ""}{t.pnlPips.toFixed(1)} pip
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`flex items-center gap-1 text-[10px] font-bold ${
                                t.exitReason === "TP" ? "text-emerald-400" : t.exitReason === "SL" ? "text-rose-400" : "text-amber-400"
                              }`}>
                                {t.exitReason === "TP" ? <CheckCircle size={10} /> : t.exitReason === "SL" ? <XCircle size={10} /> : <Zap size={10} />}
                                {t.exitReason}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{t.durationMin}m</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { AIBacktestingLab };
