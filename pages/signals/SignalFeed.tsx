/**
 * IGFXPRO — Signal Center
 * Live OLOS AI signals with confidence, risk score, entry/SL/TP, and outcome tracking.
 * Real-time updates via WebSocket + API polling.
 */
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, Bot, BrainCircuit, CheckCircle2, ChevronRight,
  Clock, Filter, Radio, RefreshCw, ShieldAlert,
  Sparkles, Target, TrendingDown, TrendingUp, X, Zap,
} from "lucide-react";
import { useSignalStore }  from "../../store/signal.store";
import { useMarketStore }  from "../../store/market.store";
import { useAiStore }      from "../../store/ai.store";
import { apiGet }          from "../../shared/lib/apiHelpers";
import { number, priceDigits } from "../../shared/utils/format";
import { usePageTitle }    from "../../hooks/usePageTitle";
import type { OlosSignal, SignalType, SignalStatus } from "../../store/signal.store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FilterSet = { type: SignalType | "ALL"; status: SignalStatus | "ALL"; symbol: string };

const SIGNAL_SYMBOLS = ["EURUSD", "XAUUSD", "US500", "BTCUSD", "GBPUSD", "USDJPY", "ETHUSD", "NVDA", "AAPL"];

function confColor(c: number) {
  if (c >= 75) return "#34d399";
  if (c >= 55) return "#fbbf24";
  return "#f87171";
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)  return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[9px]">
        <span className="text-slate-600">{label}</span>
        <span className="tabular-nums" style={{ color }}>{Math.round(value)}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Signal card ──────────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: OlosSignal }) {
  const [expanded, setExpanded] = useState(false);
  const isBuy  = signal.signalType === "BUY";
  const isHold = signal.signalType === "NEUTRAL";
  const conf   = signal.confidence;
  const pd     = priceDigits(signal.symbol);
  const col    = confColor(conf);
  const quote  = useMarketStore((s) => s.quotes[signal.symbol]);

  const statusCls = {
    ACTIVE:    "bg-emerald-500/15 text-emerald-300",
    TRIGGERED: "bg-cyan-500/15 text-cyan-300",
    CLOSED:    "bg-slate-700/60 text-slate-400",
    CANCELLED: "bg-slate-800/60 text-slate-600",
    EXPIRED:   "bg-slate-800/60 text-slate-600",
  }[signal.status] ?? "bg-slate-800 text-slate-500";

  const borderCls = isBuy
    ? "border-emerald-500/20 hover:border-emerald-500/35"
    : isHold
    ? "border-slate-700/50 hover:border-slate-600"
    : "border-rose-500/20 hover:border-rose-500/35";

  return (
    <div className={`rounded-2xl border bg-[#07111e] transition ${borderCls}`}>

      {/* Header */}
      <button className="w-full text-left" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-extrabold text-white">{signal.symbol}</span>
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                isBuy ? "bg-emerald-500/15 text-emerald-300" : isHold ? "bg-slate-700 text-slate-300" : "bg-rose-500/15 text-rose-300"
              }`}>
                {isBuy ? <TrendingUp size={9} /> : isHold ? <Activity size={9} /> : <TrendingDown size={9} />}
                {signal.signalType}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide ${statusCls}`}>
                {signal.status}
              </span>
              <span className="rounded-lg bg-slate-800/60 px-1.5 py-0.5 text-[9px] text-slate-500">
                {signal.timeframe}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-1 text-[11px] leading-5 text-slate-500">{signal.entryRationale}</p>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-2xl font-extrabold tabular-nums" style={{ color: col }}>
              {Math.round(conf)}<span className="text-base opacity-60">%</span>
            </div>
            <div className="text-[9px] text-slate-600">confidence</div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-600">
              <Clock size={8} /> {relativeTime(signal.generatedAt)}
            </div>
          </div>
        </div>
      </button>

      {/* Levels row */}
      <div className="grid grid-cols-3 divide-x divide-slate-800/60 border-t border-slate-800/60">
        {[
          { l: "Entry",  v: signal.entryPrice, c: "text-white" },
          { l: "SL",     v: signal.stopLoss,   c: "text-rose-400" },
          { l: "TP1",    v: signal.targetLevels?.[0] ?? 0, c: "text-emerald-400" },
        ].map(({ l, v, c }) => (
          <div key={l} className="py-2.5 text-center">
            <div className="text-[8px] font-semibold uppercase tracking-widest text-slate-700">{l}</div>
            <div className={`mt-0.5 font-mono text-[11px] font-bold ${c}`}>{v ? number(v, pd) : "—"}</div>
          </div>
        ))}
      </div>

      {/* Expanded: confidence breakdown + factors */}
      {expanded && (
        <div className="border-t border-slate-800/60 p-4 space-y-4">

          {/* Confidence breakdown */}
          {signal.confidenceBreakdown && Object.keys(signal.confidenceBreakdown).length > 0 && (
            <div>
              <p className="mb-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">Confidence breakdown</p>
              <div className="space-y-1.5">
                {Object.entries(signal.confidenceBreakdown).slice(0, 6).map(([k, v]) => (
                  <ConfBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={Number(v)} color={col} />
                ))}
              </div>
            </div>
          )}

          {/* Confluence factors */}
          {signal.confluenceFactors && signal.confluenceFactors.length > 0 && (
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-600">Confluence factors</p>
              <div className="flex flex-wrap gap-1.5">
                {signal.confluenceFactors.map((f) => (
                  <span key={f} className="flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 text-[9px] text-slate-400">
                    <CheckCircle2 size={8} className="text-emerald-400/60" /> {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Risk info */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-xl bg-slate-900/40 p-3">
              <p className="text-slate-600">R:R Ratio</p>
              <p className="mt-0.5 font-bold text-white">{signal.riskRewardRatio?.toFixed(2) ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-900/40 p-3">
              <p className="text-slate-600">Regime</p>
              <p className="mt-0.5 font-bold capitalize text-white">{signal.marketRegime ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-900/40 p-3">
              <p className="text-slate-600">Volatility</p>
              <p className="mt-0.5 font-bold capitalize text-white">{signal.volatilityLevel ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-900/40 p-3">
              <p className="text-slate-600">Pattern</p>
              <p className="mt-0.5 truncate font-bold text-white">{signal.setupPattern?.replace(/_/g, " ") ?? "—"}</p>
            </div>
          </div>

          {/* Current price */}
          {quote && (
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2">
              <span className="text-[10px] text-slate-500">Live price</span>
              <span className="font-mono text-[12px] font-bold text-white">{number(quote.mid, pd)}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-800/60 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <BrainCircuit size={10} className="text-cyan-400/50" />
          <span className="text-[9px] text-cyan-400/60">{signal.setupPattern?.replace(/_/g, " ") ?? "OLOS signal"}</span>
        </div>
        {signal.status === "ACTIVE" && (
          <Link to={`/trading?symbol=${signal.symbol}`}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 transition hover:bg-slate-800">
            Trade <ChevronRight size={9} />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Stat badge ───────────────────────────────────────────────────────────────

function StatBadge({ icon: Icon, label, value, cls = "text-cyan-300" }: {
  icon: React.ElementType; label: string; value: string | number; cls?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#07111e] px-4 py-3">
      <Icon size={16} className={cls} />
      <div>
        <p className="text-[9px] text-slate-600">{label}</p>
        <p className={`text-base font-extrabold ${cls}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SignalFeed() {
  usePageTitle("Signal Center");
  const qc = useQueryClient();

  const [filters, setFilters] = useState<FilterSet>({ type: "ALL", status: "ALL", symbol: "" });
  const [showFilters, setShowFilters] = useState(false);

  const storeSignals = useSignalStore((s) => s.signals);
  const aiConfidence = useAiStore((s) => s.confidence);

  const { data: apiSignals, isLoading } = useQuery<OlosSignal[]>({
    queryKey: ["signal-feed"],
    queryFn:  () => apiGet("/api/v1/signals/active"),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const { data: statsData } = useQuery<{ totalSignals: number; activeSignals: number; avgConfidence: number; successRate: number }>({
    queryKey: ["signal-stats"],
    queryFn:  () => apiGet("/api/v1/signals/stats"),
    staleTime: 60_000,
  });

  // Merge live WS signals with API signals (WS is most recent)
  const allSignals: OlosSignal[] = (() => {
    const merged = [...storeSignals];
    for (const s of (apiSignals ?? [])) {
      if (!merged.some((m) => m.id === s.id)) merged.push(s);
    }
    return merged;
  })();

  const filtered = allSignals.filter((s) => {
    if (filters.type !== "ALL" && s.signalType !== filters.type) return false;
    if (filters.status !== "ALL" && s.status !== filters.status) return false;
    if (filters.symbol && !s.symbol.toUpperCase().includes(filters.symbol.toUpperCase())) return false;
    return true;
  });

  const active  = allSignals.filter((s) => s.status === "ACTIVE");
  const avgConf = active.length
    ? active.reduce((s, x) => s + x.confidence, 0) / active.length
    : (aiConfidence?.score ?? 0) * 100;

  const clearFilters = useCallback(() => setFilters({ type: "ALL", status: "ALL", symbol: "" }), []);

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">IGFXPRO · OLOS AI</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-white">Signal Center</h1>
            <p className="mt-1 text-[12px] text-slate-500">
              Confidence-weighted signals · evaluated every 60s · supervised execution only
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] transition ${
                showFilters ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}>
              <Filter size={11} /> Filters
            </button>
            <button onClick={() => void qc.invalidateQueries({ queryKey: ["signal-feed"] })}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] text-slate-400 hover:border-slate-600 hover:text-white transition">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatBadge icon={Radio}      label="Active signals"   value={active.length}                                   cls="text-emerald-300" />
          <StatBadge icon={Zap}        label="Avg confidence"   value={`${avgConf.toFixed(1)}%`}                        cls="text-cyan-300"    />
          <StatBadge icon={Target}     label="Total generated"  value={statsData?.totalSignals ?? allSignals.length}     cls="text-violet-300"  />
          <StatBadge icon={ShieldAlert} label="Success rate"    value={statsData?.successRate ? `${statsData.successRate.toFixed(1)}%` : "—"} cls="text-amber-300" />
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-4">
            <div className="flex flex-wrap items-center gap-4">

              {/* Type filter */}
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">Direction</p>
                <div className="flex gap-1.5">
                  {(["ALL", "BUY", "SELL", "NEUTRAL"] as const).map((t) => (
                    <button key={t} onClick={() => setFilters((f) => ({ ...f, type: t }))}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                        filters.type === t ? "bg-cyan-400/20 text-cyan-300" : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Status filter */}
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">Status</p>
                <div className="flex gap-1.5">
                  {(["ALL", "ACTIVE", "TRIGGERED", "CLOSED"] as const).map((s) => (
                    <button key={s} onClick={() => setFilters((f) => ({ ...f, status: s }))}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                        filters.status === s ? "bg-cyan-400/20 text-cyan-300" : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                      }`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Symbol filter */}
              <div>
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">Symbol</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setFilters((f) => ({ ...f, symbol: "" }))}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${!filters.symbol ? "bg-cyan-400/20 text-cyan-300" : "bg-slate-800 text-slate-500"}`}>
                    ALL
                  </button>
                  {SIGNAL_SYMBOLS.map((sym) => (
                    <button key={sym} onClick={() => setFilters((f) => ({ ...f, symbol: sym }))}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${
                        filters.symbol === sym ? "bg-cyan-400/20 text-cyan-300" : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                      }`}>{sym}</button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {(filters.type !== "ALL" || filters.status !== "ALL" || filters.symbol) && (
                <button onClick={clearFilters}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300">
                  <X size={10} /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <p className="text-[10px] font-semibold text-slate-500">
            Live — {filtered.length} signal{filtered.length !== 1 ? "s" : ""}
            {(filters.type !== "ALL" || filters.status !== "ALL" || filters.symbol) && " (filtered)"}
          </p>
        </div>

        {/* Grid */}
        {isLoading && !allSignals.length ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-[#07111e]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#07111e] py-20 text-center">
            <Bot size={32} className="mb-3 text-slate-700" />
            <p className="text-sm font-semibold text-slate-500">
              {allSignals.length === 0 ? "Engine evaluating markets…" : "No signals match filters"}
            </p>
            <p className="mt-1 text-[11px] text-slate-700">
              {allSignals.length === 0
                ? "Signals generated every 60s across 5 priority symbols"
                : "Try broadening your filter criteria"}
            </p>
            {allSignals.length > 0 && (
              <button onClick={clearFilters}
                className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-[12px] text-slate-400 hover:bg-slate-800">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((signal) => <SignalCard key={signal.id} signal={signal} />)}
          </div>
        )}

        {/* OLOS info footer */}
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-5 py-4">
          <Sparkles size={16} className="shrink-0 text-cyan-400" />
          <div>
            <p className="text-[12px] font-bold text-cyan-300">OLOS AI Signal Engine</p>
            <p className="text-[11px] text-slate-500">
              12-model orchestrator · supervised execution only · confidence-gated · ESMA compliant
            </p>
          </div>
          <Link to="/olos-ai"
            className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
            Full AI center <ChevronRight size={10} />
          </Link>
        </div>
      </main>
    </div>
  );
}
