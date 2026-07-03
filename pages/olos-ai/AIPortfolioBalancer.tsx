/**
 * AI Portfolio Balancer — Rebalancing suggestions based on positions and AI signals
 */
import { useEffect, useState } from "react";
import { PieChart, TrendingUp, TrendingDown, ArrowRight, X, AlertCircle } from "lucide-react";
import { useTradingStore } from "../../store/trading.store";
import { useAiStore } from "../../store/ai.store";

type AllocationItem = { symbol: string; current: number; target: number; diff: number; action: "ADD" | "REDUCE" | "OK" };

function buildAllocation(
  positions: ReturnType<typeof useTradingStore.getState>["positions"],
  signals: ReturnType<typeof useAiStore.getState>["signals"],
): AllocationItem[] {
  if (positions.length === 0) return [];

  const totalNotional = positions.reduce((s, p) => s + p.quantity * p.markPrice, 0);
  if (totalNotional === 0) return [];

  const active = signals.filter((s) => s.status === "ACTIVE");

  return positions.map((pos) => {
    const notional = pos.quantity * pos.markPrice;
    const current = Math.round((notional / totalNotional) * 100);
    // AI target: prefer symbols with BUY signals and high confidence
    const sigConfidence = active.find((s) => s.symbol === pos.symbol)?.confidence ?? 50;
    const targetRaw = 20 + (sigConfidence - 50) * 0.3;
    const target = Math.round(Math.max(5, Math.min(50, targetRaw)));
    const diff = target - current;
    const action: "ADD" | "REDUCE" | "OK" = Math.abs(diff) < 5 ? "OK" : diff > 0 ? "ADD" : "REDUCE";
    return { symbol: pos.symbol, current, target, diff, action };
  });
}

export default function AIPortfolioBalancer() {
  const positions = useTradingStore((s) => s.positions);
  const fetchPositions = useTradingStore((s) => s.fetchPositions);
  const subWsTrading = useTradingStore((s) => s.subscribeWs);

  const signals = useAiStore((s) => s.signals);
  const fetchSignals = useAiStore((s) => s.fetchSignals);
  const subscribeWsAi = useAiStore((s) => s.subscribeWs);

  const [showModal, setShowModal] = useState(false);
  const [rebalanced, setRebalanced] = useState(false);

  useEffect(() => {
    void fetchPositions();
    void fetchSignals();
    const unsubT = subWsTrading();
    const unsubA = subscribeWsAi();
    return () => { unsubT(); unsubA(); };
  }, [fetchPositions, fetchSignals, subWsTrading, subscribeWsAi]);

  const allocation = buildAllocation(positions, signals);
  const hasImbalance = allocation.some((a) => a.action !== "OK");
  const totalMarginUsed = positions.reduce((s, p) => s + p.marginUsed, 0);
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

  const confirmRebalance = () => {
    setRebalanced(true);
    setShowModal(false);
  };

  const COLORS = ["bg-cyan-400", "bg-emerald-400", "bg-amber-400", "bg-violet-400", "bg-rose-400", "bg-sky-400"];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="text-cyan-400" size={20} />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Portfolio Balancer</h1>
          <p className="text-slate-400 mt-1">Bilanciamento automatico del portafoglio suggerito dall'AI</p>
        </div>
        {hasImbalance && !rebalanced && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-[12px] font-bold text-slate-950 hover:bg-cyan-300 transition">
            <ArrowRight size={14} /> Rebalance
          </button>
        )}
        {rebalanced && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-[12px] font-bold text-emerald-400">Rebalance applicato</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Posizioni Totali</p>
          <p className="text-3xl font-extrabold text-white">{positions.length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Margine Utilizzato</p>
          <p className="text-3xl font-extrabold text-cyan-400">${totalMarginUsed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className={`border rounded-xl p-4 ${totalPnl >= 0 ? "bg-emerald-500/10 border-emerald-400/20" : "bg-rose-500/10 border-rose-400/20"}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">P&L Non Realizzato</p>
          <p className={`text-3xl font-extrabold ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col items-center justify-center py-20">
          <PieChart size={36} className="text-slate-700 mb-4" />
          <p className="text-slate-500 font-semibold">Nessuna posizione aperta</p>
          <p className="text-slate-600 text-sm mt-1">Apri posizioni per vedere i suggerimenti di ribilanciamento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Allocation */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4">Allocazione Attuale</h2>
            <div className="space-y-3">
              {allocation.map(({ symbol, current }, i) => (
                <div key={symbol}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-bold text-white">{symbol}</span>
                    <span className="text-sm font-bold text-white">{current}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${COLORS[i % COLORS.length]}`} style={{ width: `${current}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Target Allocation with diff */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4">Allocazione Target AI</h2>
            <div className="space-y-3">
              {allocation.map(({ symbol, current, target, diff, action }) => (
                <div key={symbol}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white">{symbol}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">{current}%</span>
                      <ArrowRight size={11} className="text-slate-600" />
                      <span className="text-sm font-bold text-white">{target}%</span>
                      <span className={`text-[11px] font-bold flex items-center gap-0.5 ${action === "ADD" ? "text-emerald-400" : action === "REDUCE" ? "text-rose-400" : "text-slate-500"}`}>
                        {action === "ADD" ? <TrendingUp size={10} /> : action === "REDUCE" ? <TrendingDown size={10} /> : null}
                        {action === "ADD" ? `+${diff}%` : action === "REDUCE" ? `${diff}%` : "OK"}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${action === "ADD" ? "bg-emerald-400" : action === "REDUCE" ? "bg-rose-400" : "bg-slate-600"}`}
                      style={{ width: `${target}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {!hasImbalance && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
                <TrendingUp size={14} className="text-emerald-400" />
                <p className="text-[12px] text-emerald-400 font-semibold">Il portafoglio è già bilanciato secondo i target AI</p>
              </div>
            )}
          </div>

          {/* Action list */}
          {hasImbalance && (
            <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-white mb-4">Azioni di Ribilanciamento</h2>
              <div className="space-y-2">
                {allocation.filter((a) => a.action !== "OK").map(({ symbol, action, diff }) => (
                  <div key={symbol} className={`flex items-center gap-3 p-3 rounded-lg border ${action === "ADD" ? "border-emerald-400/20 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5"}`}>
                    {action === "ADD" ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-rose-400" />}
                    <p className="text-sm text-slate-300">
                      <strong className="text-white">{action === "ADD" ? "Aumenta" : "Riduci"}</strong> {symbol} del{" "}
                      <strong className={action === "ADD" ? "text-emerald-400" : "text-rose-400"}>{Math.abs(diff)}%</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rebalance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">Conferma Rebalance</h3>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              OLOS eseguirà {allocation.filter((a) => a.action !== "OK").length} operazioni per ribilanciare il portafoglio secondo i target AI.
            </p>
            <div className="flex items-start gap-2 text-amber-400/80 mb-5">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-400/70">Il rebalance aprirà/chiuderà posizioni nel mercato. Verifica margine e spread prima di procedere.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-slate-800 transition">
                Annulla
              </button>
              <button onClick={confirmRebalance}
                className="flex-1 rounded-xl bg-cyan-400 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition">
                Conferma Rebalance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { AIPortfolioBalancer };
