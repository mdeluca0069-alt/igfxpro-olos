/**
 * InvestmentBuilder — OLOS Investment Strategy Builder.
 *
 * Consolidates regime, confidence/signal, technicals, macro calendar, risk
 * sizing, and historical edge for ONE chosen symbol into a single guided
 * verdict — replacing the old fragmented "Engine Analytics" stub grid.
 * Every field below is sourced from /api/v1/ai/investment-brief/:symbol,
 * which composes only real backend engines. No field here is invented.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Minus, Eye, ChevronRight, AlertTriangle,
  Calendar, ShieldAlert, BarChart2, Brain, Bot, Activity,
} from "lucide-react";
import { apiGet } from "../../../shared/lib/apiHelpers";
import { number, priceDigits } from "../../../shared/utils/format";

// ─── Types (mirror the real /api/v1/ai/investment-brief/:symbol response) ────

type RegimeBrief =
  | { status: "INSUFFICIENT_DATA"; candlesAvailable: number; candlesRequired: number }
  | {
      status: "ACTIVE"; regime: string; adx: number; adxSlope: number; trending: boolean;
      description: string; atr: number | null; atrNormalized: number | null; volatilityLevel: string | null;
    };

type IndicatorBrief = {
  rsi: number;
  macd: { value: number; signal: number; histogram: number; bias: string };
  ema: { ema20: number; ema50: number; trend: string };
  vwap: number;
  bollinger: { upper: number; middle: number; lower: number; bandwidthPct: number };
  smartMoney: { bias: string; orderBlock: string; liquiditySweep: string; volumeProfile: string };
};

type LiveSignal = {
  signalType: string; confidence: number; entryPrice: number; stopLoss: number;
  targetLevels: number[]; riskRewardRatio: number; confluenceFactors: string[];
  entryRationale: string; slRationale: string; confidenceBreakdown: Record<string, number>;
};

type MacroEvent = { country: string; currency: string; title: string; impact: string; eventTime: string };

type ConfidenceBand = { band: string; count: number; winRate: number; avgPnl: number; profitFactor: number };

type InvestmentBrief = {
  symbol: string; timeframe: string; verdict: "BUY" | "SELL" | "MONITOR" | "WAIT";
  regime: RegimeBrief;
  indicators: IndicatorBrief | null;
  signal: LiveSignal | null;
  macro: { eventWithin4h: boolean; upcoming: MacroEvent[] };
  risk: { equity: number; riskAmount: number; slDistance: number; suggestedRiskPct: number } | null;
  historicalEdge: ConfidenceBand[];
  asOf: string;
};

function useInvestmentBrief(symbol: string, timeframe: string) {
  return useQuery<InvestmentBrief>({
    queryKey: ["investment-brief", symbol, timeframe],
    queryFn:  () => apiGet(`/api/v1/ai/investment-brief/${symbol}?timeframe=${timeframe}`),
    staleTime: 20_000,
    refetchInterval: 30_000,
    retry: false,
  });
}

// ─── Small shared bits ─────────────────────────────────────────────────────────

function ConfBar({ label, value, color = "#22d3ee" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-bold tabular-nums" style={{ color }}>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const VERDICT_STYLE: Record<InvestmentBrief["verdict"], { color: string; bg: string; icon: typeof TrendingUp; label: string }> = {
  BUY:     { color: "#34d399", bg: "bg-emerald-500/10", icon: TrendingUp,  label: "BUY"     },
  SELL:    { color: "#f87171", bg: "bg-rose-500/10",    icon: TrendingDown, label: "SELL"    },
  MONITOR: { color: "#22d3ee", bg: "bg-cyan-500/10",    icon: Eye,         label: "MONITOR" },
  WAIT:    { color: "#94a3b8", bg: "bg-slate-500/10",   icon: Minus,       label: "WAIT"    },
};

function impactColor(impact: string): string {
  const i = impact.toLowerCase();
  if (i === "high")   return "#f87171";
  if (i === "medium") return "#fbbf24";
  return "#22d3ee";
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function InvestmentBuilder({ symbols }: { symbols: string[] }) {
  const [symbol, setSymbol] = useState(symbols[0] ?? "EURUSD");
  const timeframe = "1H";
  const { data: brief, isLoading, error } = useInvestmentBrief(symbol, timeframe);
  const pd = priceDigits(symbol);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
      {/* Symbol picker */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">OLOS Investment Strategy Builder</h2>
          <p className="text-[10px] text-slate-600">Regime · Confidence · Technicals · Macro · Risk · Historical edge — one symbol, one verdict</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {symbols.slice(0, 8).map((s) => (
            <button key={s} onClick={() => setSymbol(s)}
              className={`rounded-xl px-3 py-1 text-[11px] font-bold transition ${
                symbol === s ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-900/60" />)}
        </div>
      ) : error || !brief ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-slate-900/40 py-12 text-center">
          <p className="text-[12px] text-slate-600">Unable to build a brief for {symbol} right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Verdict header ── */}
          <VerdictHeader brief={brief} />

          <div className="grid gap-4 lg:grid-cols-2">
            <SignalDetail brief={brief} />
            <RegimeCard brief={brief} />
          </div>

          <TechnicalsCard indicators={brief.indicators} pd={pd} />

          <div className="grid gap-4 lg:grid-cols-2">
            <MacroCard macro={brief.macro} />
            <RiskCard risk={brief.risk} pd={pd} />
          </div>

          <HistoricalEdgeCard bands={brief.historicalEdge} />

          <div className="flex justify-end">
            <Link to={`/trading?symbol=${brief.symbol}`}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-[12px] font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300">
              Trade {brief.symbol} <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-sections ───────────────────────────────────────────────────────────────

function VerdictHeader({ brief }: { brief: InvestmentBrief }) {
  const v = VERDICT_STYLE[brief.verdict];
  const Icon = v.icon;
  const why = brief.signal
    ? brief.signal.entryRationale
    : brief.regime.status === "ACTIVE"
      ? brief.regime.description
      : "OLOS sta ancora raccogliendo dati storici sufficienti per questo simbolo/timeframe.";

  return (
    <div className={`rounded-xl border border-slate-800 ${v.bg} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${v.color}22` }}>
            <Icon size={20} style={{ color: v.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-white">{brief.symbol}</span>
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${v.color}22`, color: v.color }}>
                {v.label}
              </span>
            </div>
            <p className="mt-0.5 max-w-md text-[11px] leading-5 text-slate-400">{why}</p>
          </div>
        </div>
        {brief.signal && (
          <div className="text-right">
            <div className="text-2xl font-extrabold tabular-nums" style={{ color: v.color }}>
              {Math.round(brief.signal.confidence)}<span className="text-sm opacity-60">%</span>
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">OLOS confidence</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SignalDetail({ brief }: { brief: InvestmentBrief }) {
  const sig = brief.signal;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <Bot size={12} /> Live signal
      </p>
      {!sig ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-[11px] text-slate-600">OLOS sta scansionando {brief.symbol} — nessun setup qualificato al momento.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { l: "Entry", v: sig.entryPrice, c: "text-white" },
              { l: "SL",    v: sig.stopLoss,   c: "text-rose-400" },
              { l: "TP",    v: sig.targetLevels[0], c: "text-emerald-400" },
            ].map(({ l, v, c }) => (
              <div key={l} className="rounded-lg bg-slate-900/60 py-2 text-center">
                <div className="text-[8px] font-semibold uppercase tracking-widest text-slate-700">{l}</div>
                <div className={`mt-0.5 font-mono text-[11px] font-bold ${c}`}>{number(v, priceDigits(brief.symbol))}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-600">R:R 1:{sig.riskRewardRatio.toFixed(2)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sig.confluenceFactors.slice(0, 5).map((f) => (
              <span key={f} className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[9px] text-slate-400">{f}</span>
            ))}
          </div>
          {Object.keys(sig.confidenceBreakdown).length > 0 && (
            <div className="mt-3 space-y-2 border-t border-slate-800/50 pt-3">
              {Object.entries(sig.confidenceBreakdown).slice(0, 3).map(([k, val]) => (
                <ConfBar key={k} label={k} value={Number(val)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RegimeCard({ brief }: { brief: InvestmentBrief }) {
  const r = brief.regime;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <BarChart2 size={12} /> Regime &amp; volatility
      </p>
      {r.status === "INSUFFICIENT_DATA" ? (
        <p className="py-6 text-center text-[11px] text-slate-600">
          Dati insufficienti ({r.candlesAvailable}/{r.candlesRequired} candele) per classificare il regime.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: "Regime",     v: r.regime.replace(/_/g, " ") },
            { l: "ADX",        v: r.adx.toFixed(1) },
            { l: "Trend",      v: r.trending ? "Trending" : "Non-trending" },
            { l: "Volatility", v: r.volatilityLevel ?? "—" },
          ].map(({ l, v }) => (
            <div key={l} className="rounded-lg bg-slate-900/60 px-3 py-2">
              <p className="text-[8.5px] font-semibold uppercase tracking-widest text-slate-700">{l}</p>
              <p className="mt-0.5 text-[12px] font-bold text-slate-200 capitalize">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TechnicalsCard({ indicators, pd }: { indicators: IndicatorBrief | null; pd: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <Activity size={12} /> Technicals
      </p>
      {!indicators ? (
        <p className="py-6 text-center text-[11px] text-slate-600">No indicator snapshot available.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {[
            { l: "RSI",  v: number(indicators.rsi, 1), c: indicators.rsi < 30 ? "text-emerald-300" : indicators.rsi > 70 ? "text-rose-300" : "text-slate-300" },
            { l: "MACD", v: indicators.macd.bias.toUpperCase(), c: indicators.macd.bias === "bullish" ? "text-emerald-300" : "text-rose-300" },
            { l: "EMA",  v: indicators.ema.trend, c: indicators.ema.trend.includes("up") ? "text-emerald-300" : "text-rose-300" },
            { l: "VWAP", v: number(indicators.vwap, pd), c: "text-cyan-300" },
            { l: "BBW",  v: `${number(indicators.bollinger.bandwidthPct, 1)}%`, c: "text-violet-300" },
            { l: "SMC",  v: indicators.smartMoney.bias.toUpperCase(), c: "text-amber-300" },
          ].map(({ l, v, c }) => (
            <div key={l} className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
              <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-600">{l}</span>
              <span className={`mt-0.5 text-[12px] font-bold ${c}`}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MacroCard({ macro }: { macro: InvestmentBrief["macro"] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <Calendar size={12} /> Macro &amp; calendar
      </p>
      {macro.eventWithin4h && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2">
          <AlertTriangle size={12} className="text-amber-400" />
          <span className="text-[10.5px] text-amber-300">High/medium-impact event within the next 4h — OLOS suppresses new signals during this window.</span>
        </div>
      )}
      {macro.upcoming.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-slate-600">No major events scheduled in the next 48h.</p>
      ) : (
        <div className="space-y-1.5">
          {macro.upcoming.slice(0, 5).map((ev, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-2.5 py-1.5">
              <span className="w-12 shrink-0 text-[9.5px] text-slate-500">
                {new Date(ev.eventTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="w-8 shrink-0 text-[9.5px] font-bold text-slate-400">{ev.currency}</span>
              <span className="flex-1 truncate text-[9.5px] text-slate-300">{ev.title}</span>
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold" style={{ background: `${impactColor(ev.impact)}22`, color: impactColor(ev.impact) }}>
                {ev.impact.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RiskCard({ risk, pd }: { risk: InvestmentBrief["risk"]; pd: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <ShieldAlert size={12} /> Risk &amp; position sizing
      </p>
      {!risk ? (
        <p className="py-6 text-center text-[11px] text-slate-600">
          Sizing disponibile solo quando esiste un segnale live e un saldo conto reale.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: "Account equity",  v: `$${number(risk.equity, 2)}` },
            { l: "Suggested risk",  v: `$${number(risk.riskAmount, 2)} (${(risk.suggestedRiskPct * 100).toFixed(0)}% Kelly)` },
            { l: "SL distance",     v: number(risk.slDistance, pd) },
          ].map(({ l, v }) => (
            <div key={l} className="rounded-lg bg-slate-900/60 px-3 py-2">
              <p className="text-[8.5px] font-semibold uppercase tracking-widest text-slate-700">{l}</p>
              <p className="mt-0.5 text-[12px] font-bold text-slate-200">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoricalEdgeCard({ bands }: { bands: ConfidenceBand[] }) {
  const hasData = bands.some((b) => b.count > 0);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        <Brain size={12} /> Historical edge by confidence band
      </p>
      {!hasData ? (
        <p className="py-4 text-center text-[11px] text-slate-600">Not enough closed historical signals yet for this symbol.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {bands.map((b) => (
            <div key={b.band} className="rounded-lg bg-slate-900/60 px-2 py-2 text-center">
              <p className="text-[8.5px] font-semibold text-slate-600">{b.band}%</p>
              <p className="mt-0.5 text-[12px] font-bold text-emerald-300">{b.count > 0 ? `${b.winRate.toFixed(0)}%` : "—"}</p>
              <p className="text-[8px] text-slate-700">{b.count} signals</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
