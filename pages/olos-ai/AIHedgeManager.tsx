/**
 * AI Hedge Manager — Real Pearson correlation from live candle data
 * Computes cross-asset correlations and optimal hedge sizes.
 * Hedge orders execute through the real trading API.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, TrendingDown, TrendingUp, AlertCircle, CheckCircle, X,
  RefreshCw, Brain, BarChart2, Activity, Zap, Database,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTradingStore } from "../../store/trading.store";
import { usePortfolioStore } from "../../store/portfolio.store";
import { apiPost } from "../../shared/lib/apiHelpers";

// ─── Types ────────────────────────────────────────────────────────────────────
type HedgeSuggestion = {
  positionId:  string;
  symbol:      string;
  side:        "BUY" | "SELL";
  quantity:    number;
  pnl:         number;
  correlations: { symbol: string; correlation: number }[];
  topHedge: {
    symbol:          string;
    correlation:     number;
    correlationType: string;
    hedgeSide:       "BUY" | "SELL";
    hedgeSize:       number;
    riskReduction:   number;
  } | null;
  note?: string;
};

type HedgeResponse = {
  suggestions:       HedgeSuggestion[];
  correlationMatrix: Record<string, Record<string, number>>;
  dataQuality:       { symbolsWithData: number; candlesPerSymbol: number; computedAt: string };
};

async function fetchHedgeAnalysis(positions: { id: string; symbol: string; side: string; quantity: number; pnl: number }[]): Promise<HedgeResponse> {
  return apiPost<HedgeResponse>("/api/v1/ai/hedge", { positions });
}

async function placeHedgeOrder(symbol: string, side: "BUY" | "SELL", quantity: number): Promise<{ status: string }> {
  return apiPost<{ status: string }>("/api/v1/trading/order", {
    symbol, side, type: "MARKET", quantity, leverage: 1,
    clientOrderId: `hedge_${Date.now()}`,
  });
}

// ─── Correlation bar ──────────────────────────────────────────────────────────
function CorrBar({ symbol, corr }: { symbol: string; corr: number }) {
  const pos  = corr >= 0;
  const absV = Math.abs(corr);
  const color = absV > 0.7 ? (pos ? "bg-emerald-400" : "bg-rose-400") :
                absV > 0.4 ? (pos ? "bg-amber-400"  : "bg-orange-400") : "bg-slate-600";

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-14 text-[10px] font-bold text-slate-400">{symbol}</span>
      <div className="flex-1 relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`absolute top-0 h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${absV * 100}%`, left: pos ? 0 : undefined, right: pos ? undefined : 0 }} />
      </div>
      <span className={`w-12 text-right text-[11px] font-black tabular-nums ${pos ? "text-emerald-400" : "text-rose-400"}`}>
        {corr >= 0 ? "+" : ""}{(corr * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Correlation matrix ───────────────────────────────────────────────────────
function CorrelationMatrix({ matrix }: { matrix: Record<string, Record<string, number>> }) {
  const symbols = Object.keys(matrix).slice(0, 7);
  if (!symbols.length) return null;

  const cellColor = (v: number) => {
    if (v === 1) return "bg-slate-700 text-slate-300";
    if (v > 0.7)  return "bg-emerald-500/30 text-emerald-300";
    if (v > 0.4)  return "bg-emerald-500/15 text-emerald-400/70";
    if (v < -0.7) return "bg-rose-500/30 text-rose-300";
    if (v < -0.4) return "bg-rose-500/15 text-rose-400/70";
    return "bg-slate-800/60 text-slate-500";
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#07111e]">
      <div className="p-4">
        <p className="mb-3 text-[12px] font-black text-white">Correlation Matrix (Pearson, last 60 candles)</p>
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="w-16 text-left text-slate-600" />
              {symbols.map(s => <th key={s} className="px-1 pb-2 text-center text-[9px] font-bold text-slate-500 writing-mode-vertical">{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {symbols.map(row => (
              <tr key={row}>
                <td className="py-0.5 pr-2 text-[9px] font-bold text-slate-400 text-left">{row}</td>
                {symbols.map(col => {
                  const v = matrix[row]?.[col] ?? 0;
                  return (
                    <td key={col} className={`px-1 py-0.5 text-center rounded ${cellColor(v)}`}>
                      {v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[9px] text-slate-700">Green = positive correlation · Red = negative (natural hedge)</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AIHedgeManager() {
  const positions      = useTradingStore(s => s.positions);
  const fetchPositions = usePortfolioStore(s => s.fetchPositions);
  const subWsTrading   = useTradingStore(s => s.subscribeWs);
  const qc             = useQueryClient();

  const [confirmHedge, setConfirmHedge] = useState<HedgeSuggestion | null>(null);
  const [applied,      setApplied]      = useState<Set<string>>(new Set());
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    void fetchPositions();
    const unsub = subWsTrading();
    return unsub;
  }, [fetchPositions, subWsTrading]);

  const posPayload = positions.map(p => ({
    id: p.id, symbol: p.symbol,
    side: p.side, quantity: p.quantity, pnl: p.pnl ?? 0,
  }));

  const { data: hedge, isLoading, isError, error: hedgeQueryError, refetch } = useQuery<HedgeResponse>({
    queryKey: ["hedge", posPayload.map(p => p.id).join(",")],
    queryFn:  () => fetchHedgeAnalysis(posPayload),
    enabled:  positions.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const hedgeMut = useMutation({
    mutationFn: (h: HedgeSuggestion) => {
      if (!h.topHedge) throw new Error("No hedge available");
      return placeHedgeOrder(h.topHedge.symbol, h.topHedge.hedgeSide, h.topHedge.hedgeSize);
    },
    onSuccess: (_, h) => {
      setApplied(prev => new Set([...prev, h.positionId]));
      setConfirmHedge(null);
      setError(null);
      void qc.invalidateQueries({ queryKey: ["positions"] });
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Hedge order failed");
      setConfirmHedge(null);
    },
  });

  const suggestions = hedge?.suggestions ?? [];
  const matrix      = hedge?.correlationMatrix ?? {};
  const quality     = hedge?.dataQuality;

  const totalRiskReduction = suggestions.length > 0
    ? Math.round(suggestions.reduce((s, h) => s + (h.topHedge?.riskReduction ?? 0), 0) / suggestions.length)
    : 0;

  return (
    <div className="min-h-screen bg-[#05070d] p-5 text-slate-200 lg:p-8">

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Shield size={18} className="text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">OLOS AI</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-black text-white">Hedge Manager</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Real Pearson correlations from live candle data · {quality?.candlesPerSymbol ?? 60} candles per pair
            </p>
          </div>
          <button onClick={() => refetch()} disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3.5 py-2 text-[12px] text-slate-400 transition hover:border-slate-600 hover:text-white disabled:opacity-40">
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3">
          <p className="text-[12px] text-rose-400">{error}</p>
          <button onClick={() => setError(null)}><X size={14} className="text-rose-400/60" /></button>
        </div>
      )}

      {/* Summary row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Open positions",   value: String(positions.length),    icon: Activity, color: "text-white"      },
          { label: "Hedge suggestions", value: String(suggestions.filter(s => s.topHedge).length - applied.size), icon: Brain, color: "text-cyan-300" },
          { label: "Applied hedges",   value: String(applied.size),        icon: CheckCircle, color: "text-emerald-300" },
          { label: "Avg risk reduction", value: `${totalRiskReduction}%`,  icon: Zap, color: "text-amber-300" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#07111e] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} className={color} />
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{label}</p>
            </div>
            <p className={`text-[26px] font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* No positions */}
      {positions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#07111e] py-24 text-center">
          <Shield size={40} className="mb-4 text-slate-700" />
          <p className="text-[14px] font-bold text-slate-600">No open positions</p>
          <p className="mt-1 text-[12px] text-slate-700">Open positions in the terminal to see hedge recommendations</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && positions.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#07111e] py-16 text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
          <p className="text-[13px] text-slate-400">Computing Pearson correlations for {positions.length} position{positions.length !== 1 ? "s" : ""}...</p>
        </div>
      )}

      {/* Query error — previously failed fetches left the page silently
          showing zero suggestions with no explanation */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] py-16 text-center">
          <AlertCircle size={28} className="mb-3 text-rose-400" />
          <p className="text-[13px] font-bold text-rose-400">Hedge analysis unavailable</p>
          <p className="mt-1 text-[12px] text-slate-500">
            {hedgeQueryError instanceof Error ? hedgeQueryError.message : "Failed to compute correlations."}
          </p>
          <button onClick={() => refetch()} className="mt-4 rounded-xl border border-rose-400/25 px-4 py-2 text-[12px] font-bold text-rose-300 hover:bg-rose-400/10">
            Retry
          </button>
        </div>
      )}

      {/* Suggestions */}
      {!isLoading && !isError && suggestions.length > 0 && (
        <div className="space-y-5">
          {suggestions.map(h => {
            const isApplied = applied.has(h.positionId);
            const hedge = h.topHedge;

            return (
              <motion.div key={h.positionId}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-5 transition ${isApplied ? "border-emerald-400/25 bg-emerald-400/[0.04]" : "border-white/[0.07] bg-[#07111e]"}`}
              >
                {/* Position header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${h.side === "BUY" ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
                      {h.side === "BUY" ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-rose-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-black text-white">{h.symbol}</span>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${h.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                          {h.side}
                        </span>
                        <span className="text-[11px] text-slate-500">{h.quantity.toLocaleString()} units</span>
                        {isApplied && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle size={12} /> Hedged
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] font-black ${h.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        P&L: {h.pnl >= 0 ? "+" : ""}${h.pnl.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {!isApplied && hedge && (
                    <button onClick={() => setConfirmHedge(h)}
                      className="shrink-0 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-4 py-2 text-[12px] font-bold text-cyan-400 transition hover:bg-cyan-400/[0.14]">
                      Apply Hedge
                    </button>
                  )}
                </div>

                {/* Correlations */}
                {h.correlations.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                      Top correlated instruments (Pearson · {quality?.candlesPerSymbol ?? 60} candles)
                    </p>
                    <div className="space-y-1.5">
                      {h.correlations.slice(0, 5).map(c => (
                        <CorrBar key={c.symbol} symbol={c.symbol} corr={c.correlation} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Top hedge recommendation */}
                {hedge ? (
                  <div className={`grid grid-cols-2 gap-3 rounded-xl border p-4 sm:grid-cols-4 ${hedge.correlation < 0 ? "border-emerald-400/20 bg-emerald-400/[0.04]" : "border-cyan-400/15 bg-cyan-400/[0.03]"}`}>
                    <div>
                      <p className="text-[9px] text-slate-500">Hedge instrument</p>
                      <p className="mt-0.5 text-[15px] font-black text-white">{hedge.symbol}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500">Correlation</p>
                      <p className={`mt-0.5 text-[15px] font-black ${hedge.correlation < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {hedge.correlation >= 0 ? "+" : ""}{(hedge.correlation * 100).toFixed(0)}%
                      </p>
                      <p className="text-[9px] text-slate-600">{hedge.correlationType}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500">Hedge order</p>
                      <p className={`mt-0.5 flex items-center gap-1 text-[15px] font-black ${hedge.hedgeSide === "BUY" ? "text-emerald-300" : "text-rose-300"}`}>
                        {hedge.hedgeSide === "BUY" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {hedge.hedgeSide} {hedge.hedgeSize.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500">Risk reduction</p>
                      <p className="mt-0.5 text-[15px] font-black text-emerald-300">-{hedge.riskReduction}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 text-center">
                    <p className="text-[11px] text-slate-600">{h.note ?? "Insufficient data to compute correlations."}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Correlation matrix */}
      {Object.keys(matrix).length > 0 && (
        <div className="mt-6">
          <CorrelationMatrix matrix={matrix} />
        </div>
      )}

      {/* Data quality footer */}
      {quality && (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Database size={11} className="text-slate-600" />
            <span className="text-[10px] text-slate-600">{quality.symbolsWithData} symbols with data</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart2 size={11} className="text-slate-600" />
            <span className="text-[10px] text-slate-600">{quality.candlesPerSymbol} candles per correlation</span>
          </div>
          <span className="text-[10px] text-slate-700">
            Computed {new Date(quality.computedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Confirm modal */}
      {confirmHedge && confirmHedge.topHedge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#07111e] p-6 shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-black text-white">Confirm Hedge</h3>
              <button onClick={() => setConfirmHedge(null)}>
                <X size={18} className="text-slate-500 hover:text-white transition" />
              </button>
            </div>

            <div className="mb-4 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[13px] text-slate-300">
                Place <strong className="text-white">{confirmHedge.topHedge.hedgeSide}</strong> order of{" "}
                <strong className="text-white">{confirmHedge.topHedge.hedgeSize.toLocaleString()} units</strong> on{" "}
                <strong className="text-white">{confirmHedge.topHedge.symbol}</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Correlation with {confirmHedge.symbol}: {(confirmHedge.topHedge.correlation * 100).toFixed(0)}% ({confirmHedge.topHedge.correlationType})
              </p>
              <p className="text-[11px] font-bold text-emerald-400">
                Estimated risk reduction: -{confirmHedge.topHedge.riskReduction}%
              </p>
            </div>

            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3.5 py-3">
              <AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-[11px] leading-5 text-amber-400/70">
                This will open a real market order. Verify available margin before confirming.
                Correlations are based on historical data and may not hold in volatile conditions.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmHedge(null)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-[12px] font-bold text-slate-400 transition hover:bg-slate-800">
                Cancel
              </button>
              <button onClick={() => hedgeMut.mutate(confirmHedge)}
                disabled={hedgeMut.isPending}
                className="flex-1 rounded-xl bg-cyan-400 py-2.5 text-[12px] font-black text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300 disabled:opacity-50">
                {hedgeMut.isPending ? "Executing..." : "Confirm hedge"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export { AIHedgeManager };
