/**
 * AI Execution Flow — Visualize the signal-to-order pipeline
 */
import { useEffect } from "react";
import { GitBranch, CheckCircle, ShieldCheck, Target, Layers, ArrowRight } from "lucide-react";
import { useAiStore } from "../../store/ai.store";
import { useTradingStore } from "../../store/trading.store";

type FlowStep = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: "active" | "ok" | "pending";
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  return `${Math.floor(diff / 3600)}h fa`;
}

export default function AIExecutionFlow() {
  const signals = useAiStore((s) => s.signals);
  const fetchSignals = useAiStore((s) => s.fetchSignals);
  const fetchConfidence = useAiStore((s) => s.fetchConfidence);
  const subscribeWs = useAiStore((s) => s.subscribeWs);
  const getActiveSignals = useAiStore((s) => s.getActiveSignals);

  const orders = useTradingStore((s) => s.orders);
  const positions = useTradingStore((s) => s.positions);
  const fetchOrders = useTradingStore((s) => s.fetchOrders);
  const fetchPositions = useTradingStore((s) => s.fetchPositions);
  const subWsTrading = useTradingStore((s) => s.subscribeWs);

  useEffect(() => {
    void fetchSignals();
    void fetchConfidence();
    void fetchOrders();
    void fetchPositions();
    const unsubAi = subscribeWs();
    const unsubTrading = subWsTrading();
    return () => { unsubAi(); unsubTrading(); };
  }, [fetchSignals, fetchConfidence, fetchOrders, fetchPositions, subscribeWs, subWsTrading]);

  const active = getActiveSignals();
  const recentOrders = orders.slice(0, 8);

  const steps: FlowStep[] = [
    { id: "signal", label: "Signal Generated", description: `${active.length} segnali attivi generati da OLOS`, icon: GitBranch, status: active.length > 0 ? "active" : "pending" },
    { id: "risk", label: "Risk Check", description: "Verifica limiti di rischio e margine disponibile", icon: ShieldCheck, status: "ok" },
    { id: "confidence", label: "Confidence Filter", description: "Solo segnali con confidence ≥ soglia configurata", icon: Target, status: "ok" },
    { id: "order", label: "Order Placed", description: `${orders.filter((o) => o.status === "FILLED").length} ordini eseguiti`, icon: Layers, status: orders.length > 0 ? "ok" : "pending" },
    { id: "position", label: "Position Managed", description: `${positions.length} posizioni monitorate in tempo reale`, icon: CheckCircle, status: positions.length > 0 ? "active" : "pending" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="text-cyan-400" size={20} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
        </div>
        <h1 className="text-2xl font-bold text-white">AI Execution Flow</h1>
        <p className="text-slate-400 mt-1">Pipeline di esecuzione dal segnale all'ordine</p>
      </div>

      {/* Flow Diagram */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-bold text-white mb-6">Pipeline OLOS</h2>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-0 overflow-x-auto">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const statusColor = step.status === "active" ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-400"
              : step.status === "ok" ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
              : "border-slate-700 bg-slate-800/40 text-slate-500";
            const dotColor = step.status === "active" ? "bg-cyan-400 animate-pulse"
              : step.status === "ok" ? "bg-emerald-400"
              : "bg-slate-600";

            return (
              <div key={step.id} className="flex flex-col md:flex-row items-center md:items-start flex-1 min-w-0">
                <div className={`flex flex-col items-center rounded-xl border p-4 w-full md:w-auto md:min-w-36 ${statusColor}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <Icon size={16} />
                  </div>
                  <p className="text-[11px] font-bold text-center text-white">{step.label}</p>
                  <p className="text-[10px] text-center text-slate-400 mt-1 leading-4">{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="md:flex-1 flex justify-center items-center py-2 md:py-0 md:px-2">
                    <ArrowRight size={16} className="text-slate-600 rotate-90 md:rotate-0" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signals with AI label */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
            <GitBranch size={14} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Segnali Recenti</h2>
          </div>
          {active.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-slate-500 text-sm">Nessun segnale attivo</div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {active.slice(0, 8).map((sig) => (
                <div key={sig.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/20">
                  <div>
                    <p className="text-sm font-bold text-white">{sig.symbol}</p>
                    <p className="text-[10px] text-slate-500">{timeAgo(sig.createdAt)} · {sig.timeframe}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${sig.signalType === "BUY" ? "bg-emerald-500/15 text-emerald-400" : sig.signalType === "SELL" ? "bg-rose-500/15 text-rose-400" : "bg-slate-700 text-slate-400"}`}>
                      {sig.signalType}
                    </span>
                    <span className={`text-sm font-bold ${sig.confidence >= 70 ? "text-emerald-400" : sig.confidence >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                      {sig.confidence.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
            <Layers size={14} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Ordini Recenti</h2>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-slate-500 text-sm">Nessun ordine recente</div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/20">
                  <div>
                    <p className="text-sm font-bold text-white">{order.symbol}</p>
                    <p className="text-[10px] text-slate-500">{order.type} · {order.quantity.toLocaleString()} units</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${order.side === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                      {order.side}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                      order.status === "FILLED" ? "bg-emerald-500/10 text-emerald-400"
                      : order.status === "REJECTED" ? "bg-rose-500/10 text-rose-400"
                      : order.status === "CANCELLED" ? "bg-slate-700 text-slate-500"
                      : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Flow status metrics */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">Metriche Flusso</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Segnali Generati", value: signals.length, color: "text-cyan-400" },
              { label: "Segnali Attivi", value: active.length, color: "text-emerald-400" },
              { label: "Ordini Eseguiti", value: orders.filter((o) => o.status === "FILLED").length, color: "text-white" },
              { label: "Posizioni Aperte", value: positions.length, color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-center">
                <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { AIExecutionFlow };
