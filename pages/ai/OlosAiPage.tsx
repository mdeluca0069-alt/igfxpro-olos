/**
 * IGFXPRO — OLOS AI Command Center
 * 12-engine AI orchestrator: live signals, confidence, regime, autopilot controls
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Link } from "react-router-dom";
import {
  Activity, Bot, BrainCircuit, ChevronRight, CheckCircle2,
  Lock, Radio, ShieldAlert, Sparkles, TrendingDown, TrendingUp,
  Zap, Cpu, Target, BarChart2, Globe, Layers, Eye, RefreshCw,
} from "lucide-react";
import { SignalCardSkeleton } from "../../components/ui/Skeleton";
import InvestmentBuilder      from "./components/InvestmentBuilder";
import { useSignalStore }    from "../../store/signal.store";
import { useMarketStore }    from "../../store/market.store";
import { useTier }           from "../../app/TierProvider";
import { apiGet }            from "../../shared/lib/apiHelpers";
import { number, priceDigits } from "../../shared/utils/format";
import { usePageTitle }      from "../../hooks/usePageTitle";
import type { OlosSignal }   from "../../store/signal.store";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiSignal = {
  id: string; symbol: string; direction: string; confidence: number;
  horizon: string; regime: string; rationale: string; generatedAt: string;
  entryPrice?: number; stopLoss?: number; takeProfit?: number;
  confluenceFactors?: string[];
};

type IndicatorSnap = {
  symbol: string; timeframe: string; rsi: number;
  macd: { value: number; signal: number; histogram: number; bias: string };
  ema: { ema20: number; ema50: number; trend: string };
  vwap: number;
  bollinger: { upper: number; middle: number; lower: number; bandwidthPct: number };
  smartMoney: { bias: string; orderBlock: string };
};

// ─── Tier helpers ─────────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = { STANDARD: 0, GOLD: 1, VIP: 2, PLATINUM: 3, ENTERPRISE: 4 };

function useTierUnlocked(required: string) {
  const { tier } = useTier();
  return (TIER_RANK[tier] ?? 0) >= (TIER_RANK[required] ?? 0);
}

// ─── 12 AI models ─────────────────────────────────────────────────────────────

const AI_MODELS = [
  { id: "regime",     name: "Regime Detection",    desc: "Market microstructure + volatility regime", icon: Eye,       color: "text-cyan-400",    bg: "bg-cyan-400/10"    },
  { id: "confidence", name: "Confidence Engine",   desc: "Multi-factor weighted composite score",     icon: BarChart2, color: "text-violet-400",  bg: "bg-violet-400/10"  },
  { id: "sentiment",  name: "Sentiment Analyzer",  desc: "Order flow + institutional bias tracking",  icon: Globe,     color: "text-amber-400",   bg: "bg-amber-400/10"   },
  { id: "flow",       name: "Flow Intelligence",   desc: "Dark pool + options market signals",         icon: Layers,    color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { id: "risk",       name: "Risk Quantifier",     desc: "Scenario analysis + drawdown modeling",     icon: ShieldAlert, color: "text-rose-400",  bg: "bg-rose-400/10"    },
  { id: "scenario",   name: "Scenario Engine",     desc: "Event-driven impact simulation",            icon: BrainCircuit, color: "text-sky-400",  bg: "bg-sky-400/10"     },
  { id: "autopilot",  name: "Autopilot Governor",  desc: "Supervised execution guardrails",           icon: Cpu,       color: "text-violet-300",  bg: "bg-violet-300/10"  },
  { id: "macro",      name: "Macro Context",       desc: "Economic calendar + macro correlation",     icon: Globe,     color: "text-amber-300",   bg: "bg-amber-300/10"   },
  { id: "volume",     name: "Volume Profiler",     desc: "VWAP, POC, value area analysis",            icon: BarChart2, color: "text-cyan-300",    bg: "bg-cyan-300/10"    },
  { id: "momentum",   name: "Momentum Engine",     desc: "RSI, MACD, stochastic fusion",              icon: Zap,       color: "text-emerald-300", bg: "bg-emerald-300/10" },
  { id: "pattern",    name: "Pattern Recognizer",  desc: "Candlestick + chart pattern detection",     icon: Activity,  color: "text-pink-400",    bg: "bg-pink-400/10"    },
  { id: "liquidity",  name: "Liquidity Scanner",   desc: "Order book depth + sweep detection",        icon: Layers,    color: "text-teal-400",    bg: "bg-teal-400/10"    },
];

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfBar({ label, value, color = "#22d3ee" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-bold tabular-nums" style={{ color }}>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Signal card ──────────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: OlosSignal | ApiSignal }) {
  const isOlos     = "signalType" in signal;
  const dir        = isOlos ? (signal as OlosSignal).signalType : (signal as ApiSignal).direction;
  const conf       = isOlos
    ? (signal as OlosSignal).confidence
    : (signal as ApiSignal).confidence > 1
      ? (signal as ApiSignal).confidence
      : (signal as ApiSignal).confidence * 100;
  const regime     = isOlos ? (signal as OlosSignal).marketRegime    : (signal as ApiSignal).regime;
  const rationale  = isOlos ? (signal as OlosSignal).entryRationale  : (signal as ApiSignal).rationale;
  const horizon    = isOlos ? (signal as OlosSignal).timeframe        : (signal as ApiSignal).horizon;
  const entryPrice = isOlos ? (signal as OlosSignal).entryPrice       : (signal as ApiSignal).entryPrice;
  const stopLoss   = isOlos ? (signal as OlosSignal).stopLoss         : (signal as ApiSignal).stopLoss;
  const takeProfit = isOlos ? (signal as OlosSignal).targetLevels?.[0] : (signal as ApiSignal).takeProfit;
  const factors    = isOlos ? (signal as OlosSignal).confluenceFactors : (signal as ApiSignal).confluenceFactors;
  const breakdown  = isOlos ? (signal as OlosSignal).confidenceBreakdown : undefined;
  const isBuy = dir === "BUY";
  const pd    = priceDigits(signal.symbol);

  const bars = breakdown && Object.keys(breakdown).length > 0 ? breakdown : null;

  const confColor = isBuy ? "#34d399" : "#f87171";

  return (
    <div className={`group flex flex-col rounded-2xl border bg-[#07111e] transition hover:shadow-xl hover:shadow-black/30 ${
      isBuy
        ? "border-emerald-500/20 hover:border-emerald-500/40"
        : "border-rose-500/20 hover:border-rose-500/40"
    }`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-extrabold text-white">{signal.symbol}</span>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isBuy ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
            }`}>
              {isBuy ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {dir}
            </span>
            <span className="rounded-lg bg-slate-800/80 px-2 py-0.5 text-[9px] font-semibold text-slate-400">{horizon}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-slate-500">{rationale}</p>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-3xl font-extrabold tabular-nums" style={{ color: confColor }}>
            {Math.round(conf)}<span className="text-lg opacity-60">%</span>
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">AI confidence</div>
          <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-slate-800 ml-auto">
            <div className="h-full rounded-full transition-all" style={{ width: `${conf}%`, backgroundColor: confColor }} />
          </div>
        </div>
      </div>

      {/* Confidence breakdown */}
      {bars ? (
        <div className="space-y-2 border-t border-slate-800/50 px-4 py-3">
          {Object.entries(bars).slice(0, 4).map(([k, v]) => (
            <ConfBar key={k} label={k} value={Number(v)} color={confColor} />
          ))}
        </div>
      ) : (
        <div className="border-t border-slate-800/50 px-4 py-3 text-center">
          <p className="text-[10px] text-slate-700">No Data Available</p>
        </div>
      )}

      {/* Entry / SL / TP levels */}
      {(entryPrice || stopLoss || takeProfit) && (
        <div className="grid grid-cols-3 gap-1 border-t border-slate-800/50 px-4 py-3">
          {[
            { label: "Entry", val: entryPrice, cls: "text-white" },
            { label: "SL",    val: stopLoss,   cls: "text-rose-400" },
            { label: "TP",    val: takeProfit, cls: "text-emerald-400" },
          ].filter(({ val }) => val).map(({ label, val, cls }) => (
            <div key={label} className="rounded-lg bg-slate-900/60 py-2 text-center">
              <div className="text-[8px] font-semibold uppercase tracking-widest text-slate-700">{label}</div>
              <div className={`mt-0.5 font-mono text-[11px] font-bold ${cls}`}>{number(val!, pd)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Confluence factors */}
      {factors && factors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-800/50 px-4 py-2.5">
          {factors.slice(0, 4).map((f) => (
            <span key={f} className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[9px] text-slate-400">{f}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-800/50 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <BrainCircuit size={10} className="text-cyan-400/50" />
          <span className="text-[10px] text-cyan-300/60 capitalize">{regime}</span>
        </div>
        <Link to={`/trading?symbol=${signal.symbol}`}
          className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-slate-600 hover:bg-slate-800">
          Trade <ChevronRight size={9} />
        </Link>
      </div>
    </div>
  );
}

// ─── Indicator strip ──────────────────────────────────────────────────────────

function IndicatorStrip({ symbol }: { symbol: string }) {
  const { data } = useQuery<IndicatorSnap>({
    queryKey:  ["ind-ai", symbol],
    queryFn:   () => apiGet(`/api/v1/indicators/${symbol}?timeframe=1H`),
    staleTime: 10_000,
  });

  if (!data) return (
    <div className="flex gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-9 w-20 animate-pulse rounded-xl bg-slate-800" />
      ))}
    </div>
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {[
        { l: "RSI",  v: number(data.rsi, 1),              c: data.rsi < 30 ? "text-emerald-300" : data.rsi > 70 ? "text-rose-300" : "text-slate-300" },
        { l: "MACD", v: data.macd.bias.toUpperCase(),     c: data.macd.bias === "bullish" ? "text-emerald-300" : "text-rose-300" },
        { l: "EMA",  v: data.ema.trend,                   c: data.ema.trend.includes("up") ? "text-emerald-300" : "text-rose-300" },
        { l: "SMC",  v: data.smartMoney.bias.toUpperCase(), c: data.smartMoney.bias === "accumulation" ? "text-emerald-300" : "text-rose-300" },
        { l: "VWAP", v: number(data.vwap, priceDigits(symbol)), c: "text-cyan-300" },
        { l: "BBW",  v: `${number(data.bollinger.bandwidthPct, 1)}%`, c: "text-violet-300" },
      ].map(({ l, v, c }) => (
        <div key={l} className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-600">{l}</span>
          <span className={`mt-0.5 text-[12px] font-bold ${c}`}>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OlosAiPage() {
  usePageTitle("OLOS AI");

  const qc          = useQueryClient();
  const { tier }    = useTier();
  const hasSignals  = useTierUnlocked("VIP");
  const hasAdvanced = useTierUnlocked("PLATINUM");
  const [activeSym, setActiveSym] = useState("EURUSD");

  const liveSignals = useSignalStore(useShallow((s) => s.signals.slice(0, 12)));
  const quotesMap   = useMarketStore((s) => s.quotes);
  const quotes      = useMemo(() => Object.keys(quotesMap), [quotesMap]);

  const { data: apiSignals, isLoading } = useQuery<ApiSignal[]>({
    queryKey: ["ai-signals"],
    queryFn:  () => apiGet("/api/v1/ai/signals"),
    staleTime: 30_000,
    refetchInterval: hasSignals ? 30_000 : false,
  });

  const { data: confData } = useQuery<{ score: number | null; breakdown: Record<string, number> | null; status?: string; nextScanInSec?: number }>({
    queryKey: ["ai-confidence"],
    queryFn:  () => apiGet("/api/v1/ai/confidence"),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Real, platform-wide win rate from closed SignalTelemetry rows — never a
  // hardcoded placeholder.
  const { data: perf } = useQuery<{ ok: boolean; winRate?: number; winCount?: number; lossCount?: number }>({
    queryKey: ["ai-performance"],
    queryFn:  () => apiGet("/api/v1/ai/performance"),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false,
  });
  const closedSignals = (perf?.winCount ?? 0) + (perf?.lossCount ?? 0);
  const winRateLabel = perf?.ok && closedSignals > 0 ? `${perf.winRate!.toFixed(1)}%` : "—";

  const confScore = confData?.score != null ? Math.round(confData.score * 100) : null;
  const signals   = liveSignals.length > 0 ? liveSignals : (apiSignals ?? []);

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="space-y-5 p-4 md:p-5">

        {/* ── Hero: command center ── */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#07111e] via-[#060c18] to-[#05070d] p-6">
          {/* Background glow */}
          <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">IGFXPRO AI</span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" /> ALL SYSTEMS OPERATIONAL
                  </span>
                </div>
                <h1 className="mt-1.5 text-2xl font-extrabold text-white">OLOS AI Command Center</h1>
                <p className="mt-1 text-[12px] text-slate-500">
                  12-engine institutional AI orchestrator · supervised execution · confidence-gated signals
                </p>
              </div>

              {/* Composite confidence meter */}
              <div className="text-center">
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#1e293b" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#22d3ee" strokeWidth="6"
                      strokeDasharray={`${(confScore ?? 0) * 2.136} 213.6`}
                      strokeLinecap="round" className="transition-all duration-700" />
                  </svg>
                  <div>
                    <div className="text-xl font-extrabold text-cyan-300">
                      {confScore !== null ? `${confScore}%` : "—"}
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Composite conf.</p>
              </div>
            </div>

            {/* 4-metric row */}
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800/50 pt-4 sm:grid-cols-4">
              {[
                { icon: Cpu,        label: "AI Engines",    value: "12",             sub: "All operational",        cls: "text-emerald-400" },
                { icon: Radio,      label: "Live signals",  value: `${signals.length}`, sub: "WebSocket + REST feed", cls: "text-cyan-400"    },
                { icon: Target,     label: "Avg win rate",  value: winRateLabel,      sub: `${closedSignals} closed signals`, cls: "text-violet-400"  },
                { icon: ShieldAlert,label: "Guardrails",   value: "Active",           sub: "Supervised mode only",   cls: "text-emerald-400" },
              ].map(({ icon: Icon, label, value, sub, cls }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                    <Icon size={16} className={cls} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600">{label}</p>
                    <p className={`text-base font-extrabold ${cls}`}>{value}</p>
                    <p className="text-[9px] text-slate-700">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Confidence breakdown + model health ── */}
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">

          {/* Confidence breakdown */}
          <div className="rounded-xl border border-slate-800 bg-[#07111e] p-5">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Confidence breakdown · composite {confScore !== null ? `${confScore}%` : "—"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {confData?.breakdown
                ? Object.entries(confData.breakdown).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-slate-900/60 p-3">
                      <ConfBar label={k.charAt(0).toUpperCase() + k.slice(1)} value={Math.round(Number(v) * 100)} />
                    </div>
                  ))
                : (
                    <div className="col-span-2 flex items-center justify-center rounded-xl bg-slate-900/60 py-8">
                      <p className="text-[12px] text-slate-600">No Data Available</p>
                    </div>
                  )
              }
            </div>
          </div>

          {/* 12-model health grid */}
          <div className="rounded-xl border border-slate-800 bg-[#07111e] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">12 AI engines</p>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle2 size={10} /> 0 degraded
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {AI_MODELS.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.id} className="flex items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-900/30 px-2.5 py-2">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${m.bg}`}>
                      <Icon size={10} className={m.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-slate-300">{m.name.split(" ")[0]}</p>
                      <div className="flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-[8px] text-slate-600">active</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Live indicators by symbol ── */}
        {quotes.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#07111e] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live indicators · 1H</p>
              <div className="flex flex-wrap gap-1.5">
                {quotes.slice(0, 8).map((sym) => (
                  <button key={sym} onClick={() => setActiveSym(sym)}
                    className={`rounded-xl px-3 py-1 text-[11px] font-bold transition ${
                      activeSym === sym ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}>
                    {sym}
                  </button>
                ))}
              </div>
            </div>
            <IndicatorStrip symbol={activeSym} />
          </div>
        )}

        {/* ── Live signals ── */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Live OLOS Signals</h2>
              <p className="text-[10px] text-slate-600">
                Confidence-weighted · evaluated every 60s · supervised execution only · {tier} access level
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!hasSignals && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-1.5">
                  <Lock size={11} className="text-amber-400" />
                  <span className="text-[11px] text-amber-300">VIP+ required</span>
                  <Link to="/dashboard" className="text-[10px] text-amber-400 underline hover:text-amber-300">Upgrade</Link>
                </div>
              )}
              <button onClick={() => void qc.invalidateQueries({ queryKey: ["ai-signals"] })}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-1.5 text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-white">
                <RefreshCw size={10} /> Refresh
              </button>
            </div>
          </div>

          {!hasSignals ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#07111e] py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                <Lock size={24} className="text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-amber-300">VIP tier required</h3>
              <p className="mt-2 max-w-xs text-[12px] leading-5 text-slate-500">
                Unlock full confidence breakdown, entry/SL/TP levels, market regime analysis, and 12-model signal feed.
              </p>
              <Link to="/dashboard"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-2.5 text-sm font-bold text-amber-300 transition hover:bg-amber-400/20">
                <Sparkles size={14} /> View tier options
              </Link>
            </div>
          ) : isLoading && !signals.length ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SignalCardSkeleton key={i} />)}
            </div>
          ) : signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#07111e] py-16 text-center">
              <Bot size={28} className="mb-3 text-slate-700" />
              <p className="text-sm font-semibold text-slate-600">Engine evaluating markets…</p>
              <p className="mt-1 text-[11px] text-slate-700">Signals generated every 60s · checking 5 priority symbols</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {signals.map((sig) => <SignalCard key={sig.id} signal={sig} />)}
            </div>
          )}
        </div>

        {/* ── OLOS Investment Strategy Builder — PLATINUM+ ── */}
        {hasAdvanced ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={13} className="text-violet-400" />
              <h2 className="text-sm font-bold text-white">Investment Strategy Builder</h2>
              <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[9px] font-bold text-violet-400">PLATINUM+</span>
            </div>
            <InvestmentBuilder symbols={quotes.length > 0 ? quotes : ["EURUSD", "GBPUSD", "XAUUSD", "US500"]} />
          </div>
        ) : hasSignals && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/50 bg-[#07111e] py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
              <Zap size={20} className="text-violet-400" />
            </div>
            <p className="text-sm font-bold text-violet-300">Engine Analytics — PLATINUM+</p>
            <p className="mt-1.5 max-w-xs text-[11px] leading-5 text-slate-500">
              Per-model activity metrics, signal quality scores, and autopilot performance analytics.
            </p>
            <Link to="/dashboard"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/8 px-4 py-2 text-xs font-bold text-violet-300 transition hover:bg-violet-400/15">
              <Sparkles size={12} /> Upgrade to PLATINUM
            </Link>
          </div>
        )}

        {/* ── OLOS AI Tools Quick Access ── */}
        <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
          <div className="mb-4 flex items-center gap-2">
            <BrainCircuit size={14} className="text-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Explore AI Tools</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { label: "OLOS Assistant",    href: "/olos-ai/assistant",       icon: Bot },
              { label: "Command Center",    href: "/olos-ai/command-center",  icon: Cpu },
              { label: "Trade Scanner",     href: "/olos-ai/scanner",         icon: Activity },
              { label: "Backtesting Lab",   href: "/olos-ai/backtesting",     icon: BarChart2 },
              { label: "Confidence Engine", href: "/olos-ai/confidence",      icon: Target },
              { label: "Regime Map",        href: "/olos-ai/regime",          icon: Globe },
              { label: "Strategy Builder",  href: "/olos-ai/strategy",        icon: Sparkles },
              { label: "Volatility Radar",  href: "/olos-ai/volatility",      icon: Radio },
              { label: "Hedge Manager",     href: "/olos-ai/hedge",           icon: ShieldAlert },
              { label: "Trade Simulation",  href: "/olos-ai/simulation",      icon: Zap },
              { label: "Portfolio Balancer",href: "/olos-ai/portfolio-balancer", icon: Layers },
              { label: "OLOS Brain",        href: "/olos-ai/brain",           icon: BrainCircuit },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-[12px] font-medium text-slate-400 transition hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:text-cyan-400"
              >
                <Icon size={13} className="shrink-0" />
                <span className="truncate">{label}</span>
                <ChevronRight size={11} className="ml-auto shrink-0 opacity-40" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
