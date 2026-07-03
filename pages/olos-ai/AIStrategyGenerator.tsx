/**
 * AI Strategy Generator — Real indicator-based strategy generation
 * Fetches live candle data from backend, computes RSI/MACD/EMA/ATR,
 * and generates specific entry/exit conditions with real price levels.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wand2, Sparkles, TrendingUp, TrendingDown, AlertCircle,
  Target, ShieldCheck, ArrowUpRight, ArrowDownRight, RefreshCw,
  Activity, Brain,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tokenVault } from "../../shared/lib/tokenVault";

const SYMBOLS: string[] = ["EURUSD", "XAUUSD", "US500", "BTCUSD", "GBPUSD", "USDJPY", "GBPJPY", "ETHUSD", "US100", "USDCHF"];
const TIMEFRAMES: string[] = ["5M", "15M", "1H", "4H", "1D"];
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type StrategyResult = {
  name:        string;
  symbol:      string;
  timeframe:   string;
  riskLevel:   RiskLevel;
  bias:        "BUY" | "SELL" | "NEUTRAL";
  confidence:  number;
  currentPrice: number;
  entryPrice:  number;
  stopLoss:    number;
  takeProfit:  number;
  stopLossPips:   number;
  takeProfitPips: number;
  riskRewardRatio: number;
  winRateEstimate: number;
  indicators:  {
    rsi:    number;
    macd:   string;
    ema20:  number;
    ema50:  number;
    atrPips: number;
    trend:  string;
  };
  entryConditions: string[];
  exitConditions:  string[];
  description:     string;
  candlesUsed:     number;
  generatedAt:     string;
  error?: string;
  note?:  string;
};

async function generateStrategy(params: {
  symbol: string; timeframe: string; riskLevel: RiskLevel;
}): Promise<StrategyResult> {
  const token = tokenVault.getAccessToken();
  const res = await fetch("/api/v1/ai/strategy", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Strategy API error: ${res.status}`);
  return res.json();
}

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW:    "text-emerald-400",
  MEDIUM: "text-amber-400",
  HIGH:   "text-rose-400",
};

const RISK_BORDER: Record<RiskLevel, string> = {
  LOW:    "border-emerald-400/30 bg-emerald-400/[0.06]",
  MEDIUM: "border-amber-400/30 bg-amber-400/[0.06]",
  HIGH:   "border-rose-400/30 bg-rose-400/[0.06]",
};

function IndicatorBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{label}</p>
      <p className={`mt-0.5 text-[13px] font-black ${color}`}>{value}</p>
    </div>
  );
}

export default function AIStrategyGenerator() {
  const [symbol,    setSymbol]    = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("1H");
  const [risk,      setRisk]      = useState<RiskLevel>("MEDIUM");
  const [run,       setRun]       = useState(0);

  const { data: strategy, isLoading, error, refetch } = useQuery<StrategyResult>({
    queryKey: ["strategy", symbol, timeframe, risk, run],
    queryFn:  () => generateStrategy({ symbol, timeframe, riskLevel: risk }),
    enabled:  run > 0,
    staleTime: 30_000,
    retry: false,
  });

  const isBuy  = strategy?.bias === "BUY";
  const isSell = strategy?.bias === "SELL";

  return (
    <div className="min-h-screen bg-[#05070d] p-5 text-slate-200 lg:p-8">

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Wand2 size={18} className="text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">OLOS AI</span>
        </div>
        <h1 className="text-[28px] font-black text-white">Strategy Builder</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Real indicator-based strategies with live RSI, MACD, EMA, and ATR-sized SL/TP
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

        {/* ── Config ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#07111e] p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-[13px] font-black text-white">
              <Sparkles size={13} className="text-cyan-400" /> Parameters
            </h2>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Symbol</label>
              <select value={symbol} onChange={e => setSymbol(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-[13px] text-white outline-none focus:border-cyan-400/50">
                {SYMBOLS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Timeframe</label>
              <div className="grid grid-cols-5 gap-1">
                {TIMEFRAMES.map(t => (
                  <button key={t} onClick={() => setTimeframe(t)}
                    className={`rounded-lg py-2 text-[11px] font-black transition ${timeframe === t ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-400 hover:border-slate-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Risk Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).map(r => (
                  <button key={r} onClick={() => setRisk(r)}
                    className={`rounded-xl py-2.5 text-[11px] font-black transition ${risk === r
                      ? `border ${RISK_BORDER[r]} ${RISK_COLORS[r]}`
                      : "border border-slate-700 text-slate-500 hover:border-slate-600"}`}>
                    {r}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-slate-600">
                {risk === "LOW" ? "1x ATR SL · 1.5x ATR TP" : risk === "MEDIUM" ? "1.5x ATR SL · 2.5x ATR TP" : "2.5x ATR SL · 4x ATR TP"}
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3.5 py-3">
              <AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-[11px] leading-5 text-amber-400/70">
                Strategies are based on real technical indicators. Not financial advice.
              </p>
            </div>

            <button onClick={() => setRun(r => r + 1)} disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3.5 text-[13px] font-black text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300 disabled:opacity-50">
              {isLoading
                ? <><RefreshCw size={14} className="animate-spin" /> Analyzing indicators...</>
                : <><Wand2 size={15} /> Generate strategy</>}
            </button>

            {strategy && !isLoading && (
              <button onClick={() => refetch()}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 py-2 text-[11px] text-slate-400 transition hover:border-slate-600 hover:text-white">
                <RefreshCw size={11} /> Refresh indicators
              </button>
            )}
          </div>
        </div>

        {/* ── Result ── */}
        <div>

          {run === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#07111e] py-28">
              <Wand2 size={40} className="mb-4 text-slate-700" />
              <p className="text-[14px] font-bold text-slate-600">Configure parameters and generate strategy</p>
              <p className="mt-1 text-[12px] text-slate-700">Uses live RSI, MACD, EMA, ATR from real candle data</p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#07111e] py-28">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
              <p className="text-[14px] font-bold text-slate-400">OLOS is analyzing {symbol}...</p>
              <p className="mt-1 text-[12px] text-slate-600">Computing RSI · MACD · EMA20/50 · ATR</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] p-6 text-center">
              <p className="text-[13px] font-bold text-rose-400">{(error as Error).message}</p>
            </div>
          )}

          {strategy && !isLoading && !strategy.error && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {strategy.note && (
                <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-[11px] text-amber-400/80">
                  {strategy.note}
                </div>
              )}

              {/* Strategy header */}
              <div className={`rounded-2xl border p-6 ${
                isBuy ? "border-emerald-400/30 bg-emerald-400/[0.05]" :
                isSell ? "border-rose-400/30 bg-rose-400/[0.05]" :
                "border-slate-700 bg-white/[0.02]"
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isBuy ? <TrendingUp size={22} className="text-emerald-400" /> :
                     isSell ? <TrendingDown size={22} className="text-rose-400" /> :
                     <Activity size={22} className="text-amber-400" />}
                    <div>
                      <h2 className="text-[18px] font-black text-white">{strategy.name}</h2>
                      <p className="text-[11px] text-slate-400">
                        {strategy.symbol} · {strategy.timeframe} · Risk: <span className={RISK_COLORS[strategy.riskLevel]}>{strategy.riskLevel}</span>
                        {" · "}{strategy.candlesUsed} candles
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Confidence</p>
                    <p className={`text-[28px] font-black tabular-nums ${strategy.confidence > 70 ? "text-emerald-300" : strategy.confidence > 50 ? "text-amber-300" : "text-slate-400"}`}>
                      {strategy.confidence.toFixed(0)}%
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-[13px] leading-6 text-slate-300">{strategy.description}</p>
              </div>

              {/* Live indicators */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Live Indicators — {strategy.symbol} · {strategy.timeframe}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <IndicatorBadge label="RSI(14)"   value={strategy.indicators.rsi.toFixed(1)}
                    color={strategy.indicators.rsi < 30 ? "text-emerald-300" : strategy.indicators.rsi > 70 ? "text-rose-300" : "text-white"} />
                  <IndicatorBadge label="MACD"       value={strategy.indicators.macd.includes("BULL") ? "BULLISH" : "BEARISH"}
                    color={strategy.indicators.macd.includes("BULL") ? "text-emerald-300" : "text-rose-300"} />
                  <IndicatorBadge label="EMA20"      value={strategy.indicators.ema20.toFixed(5)} color="text-cyan-300" />
                  <IndicatorBadge label="EMA50"      value={strategy.indicators.ema50.toFixed(5)} color="text-blue-300" />
                  <IndicatorBadge label="ATR(14)"    value={`${strategy.indicators.atrPips.toFixed(1)} pip`} color="text-violet-300" />
                  <IndicatorBadge label="Trend"      value={strategy.indicators.trend.includes("Bullish") ? "↑ BULL" : "↓ BEAR"}
                    color={strategy.indicators.trend.includes("Bullish") ? "text-emerald-300" : "text-rose-300"} />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">

                {/* Entry conditions */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#07111e] p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-[13px] font-black text-white">
                    {isBuy ? <ArrowUpRight size={14} className="text-cyan-400" /> : <ArrowDownRight size={14} className="text-cyan-400" />}
                    Entry Conditions
                  </h3>
                  <ul className="space-y-2.5">
                    {strategy.entryConditions.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300">
                        <span className="shrink-0 text-[10px] font-black text-cyan-400 mt-0.5">{i + 1}.</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exit conditions */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#07111e] p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-[13px] font-black text-white">
                    <Target size={14} className="text-cyan-400" /> Exit Conditions
                  </h3>
                  <ul className="space-y-2.5">
                    {strategy.exitConditions.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300">
                        <span className="shrink-0 text-[10px] font-black text-cyan-400 mt-0.5">{i + 1}.</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk management */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#07111e] p-5 lg:col-span-2">
                  <h3 className="mb-4 flex items-center gap-2 text-[13px] font-black text-white">
                    <ShieldCheck size={14} className="text-cyan-400" /> Risk Management (ATR-based)
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                      <p className="text-[9px] text-slate-500">Current Price</p>
                      <p className="mt-0.5 font-mono text-[14px] font-black text-white">{strategy.currentPrice.toFixed(5)}</p>
                    </div>
                    <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-3 text-center">
                      <p className="text-[9px] text-slate-500">Stop Loss</p>
                      <p className="mt-0.5 font-mono text-[14px] font-black text-rose-300">{strategy.stopLoss.toFixed(5)}</p>
                      <p className="text-[10px] text-rose-400/60">{strategy.stopLossPips.toFixed(1)} pip</p>
                    </div>
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-3 text-center">
                      <p className="text-[9px] text-slate-500">Take Profit</p>
                      <p className="mt-0.5 font-mono text-[14px] font-black text-emerald-300">{strategy.takeProfit.toFixed(5)}</p>
                      <p className="text-[10px] text-emerald-400/60">{strategy.takeProfitPips.toFixed(1)} pip</p>
                    </div>
                    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3 text-center">
                      <p className="text-[9px] text-slate-500">R:R Ratio</p>
                      <p className="mt-0.5 text-[20px] font-black text-cyan-300">1:{strategy.riskRewardRatio.toFixed(1)}</p>
                    </div>
                    <div className="rounded-xl border border-violet-400/20 bg-violet-400/[0.04] p-3 text-center">
                      <p className="text-[9px] text-slate-500">Win Rate Est.</p>
                      <p className="mt-0.5 text-[20px] font-black text-violet-300">{strategy.winRateEstimate}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <p className="text-right text-[10px] text-slate-700">
                Generated {new Date(strategy.generatedAt).toLocaleTimeString()} · {strategy.candlesUsed} candles analyzed
              </p>
            </motion.div>
          )}

          {strategy?.error && !isLoading && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-6 text-center">
              <Brain size={28} className="mx-auto mb-3 text-amber-400/60" />
              <p className="text-[13px] font-bold text-amber-400">{strategy.error}</p>
              {strategy.note && <p className="mt-1 text-[11px] text-amber-400/60">{strategy.note}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { AIStrategyGenerator };
