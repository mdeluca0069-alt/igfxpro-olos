/**
 * OLOS Brain — Master overview of the entire OLOS AI system
 */
import { useEffect, useState } from "react";
import { Brain, Activity, Zap, Radio, Shield, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { useAiStore } from "../../store/ai.store";
import { useMarketStore } from "../../store/market.store";
import { useTradingStore } from "../../store/trading.store";
import { useRiskStore } from "../../store/risk.store";

type ActivityItem = { id: string; type: "signal" | "order" | "risk" | "system"; text: string; ts: Date; color: string };

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  return `${Math.floor(diff / 3600)}h fa`;
}

function buildActivity(
  signals: ReturnType<typeof useAiStore.getState>["signals"],
  orders: ReturnType<typeof useTradingStore.getState>["orders"],
): ActivityItem[] {
  const items: ActivityItem[] = [];

  signals.slice(0, 5).forEach((sig) => {
    items.push({
      id: `sig_${sig.id}`,
      type: "signal",
      text: `Segnale ${sig.signalType} generato su ${sig.symbol} — confidence ${sig.confidence.toFixed(0)}%`,
      ts: new Date(sig.createdAt),
      color: sig.signalType === "BUY" ? "text-emerald-400" : sig.signalType === "SELL" ? "text-rose-400" : "text-slate-400",
    });
  });

  orders.slice(0, 3).forEach((order) => {
    items.push({
      id: `ord_${order.id}`,
      type: "order",
      text: `Ordine ${order.side} ${order.symbol} — ${order.status}`,
      ts: new Date(order.createdAt),
      color: order.status === "FILLED" ? "text-emerald-400" : order.status === "REJECTED" ? "text-rose-400" : "text-slate-400",
    });
  });

  items.push({
    id: "sys_1",
    type: "system",
    text: "OLOS Brain attivo — monitoraggio mercati in corso",
    ts: new Date(Date.now() - 120000),
    color: "text-cyan-400",
  });

  return items.sort((a, b) => b.ts.getTime() - a.ts.getTime()).slice(0, 10);
}

export default function OLOSBrain() {
  const signals = useAiStore((s) => s.signals);
  const fetchSignals = useAiStore((s) => s.fetchSignals);
  const fetchConfidence = useAiStore((s) => s.fetchConfidence);
  const subscribeWsAi = useAiStore((s) => s.subscribeWs);
  const getActiveSignals = useAiStore((s) => s.getActiveSignals);
  const getOverallConfidenceScore = useAiStore((s) => s.getOverallConfidenceScore);
  const lastFetchAt = useAiStore((s) => s.lastFetchAt);
  const aiError = useAiStore((s) => s.error);

  const connected = useMarketStore((s) => s.connected);
  const quotes = useMarketStore((s) => s.quotes);
  const fetchQuotes = useMarketStore((s) => s.fetchQuotes);
  const subscribeWsMarket = useMarketStore((s) => s.subscribeWs);

  const orders = useTradingStore((s) => s.orders);
  const positions = useTradingStore((s) => s.positions);
  const fetchOrders = useTradingStore((s) => s.fetchOrders);
  const fetchPositions = useTradingStore((s) => s.fetchPositions);
  const subWsTrading = useTradingStore((s) => s.subscribeWs);
  const ordersError = useTradingStore((s) => s.ordersError);

  const snapshot = useRiskStore((s) => s.snapshot);
  const fetchSnapshot = useRiskStore((s) => s.fetchSnapshot);
  const subWsRisk = useRiskStore((s) => s.subscribeWs);
  const riskError = useRiskStore((s) => s.error);

  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  useEffect(() => {
    void fetchSignals();
    void fetchConfidence();
    void fetchQuotes();
    void fetchOrders();
    void fetchPositions();
    void fetchSnapshot();

    const unsubAi = subscribeWsAi();
    const unsubMarket = subscribeWsMarket();
    const unsubTrading = subWsTrading();
    const unsubRisk = subWsRisk();

    const uptimeInterval = setInterval(() => setUptimeSeconds((s) => s + 1), 1000);

    return () => {
      unsubAi(); unsubMarket(); unsubTrading(); unsubRisk();
      clearInterval(uptimeInterval);
    };
  }, [fetchSignals, fetchConfidence, fetchQuotes, fetchOrders, fetchPositions, fetchSnapshot, subscribeWsAi, subscribeWsMarket, subWsTrading, subWsRisk]);

  const active = getActiveSignals();
  const confidenceScore = getOverallConfidenceScore();
  const confidencePct = Math.round(confidenceScore * 100);
  const quotedSymbols = Object.keys(quotes).length;
  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const activity = buildActivity(signals, orders);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const buyCount = active.filter((s) => s.signalType === "BUY").length;
  const sellCount = active.filter((s) => s.signalType === "SELL").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="text-cyan-400" size={20} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
        </div>
        <h1 className="text-2xl font-bold text-white">OLOS Brain</h1>
        <p className="text-slate-400 mt-1">Centro di controllo dell'intelligenza artificiale OLOS</p>
      </div>

      {/* System Status Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-2 border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center">
              <Brain size={24} className="text-cyan-400" />
            </div>
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">OLOS Brain</h2>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> ACTIVE
              </span>
            </div>
            <p className="text-sm text-slate-400">12-engine AI orchestrator · Real-time signal generation</p>
          </div>
        </div>
        <div className="hidden md:grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Uptime</p>
            <p className="font-mono font-bold text-cyan-400">{formatUptime(uptimeSeconds)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">WebSocket</p>
            <p className={`font-bold ${connected ? "text-emerald-400" : "text-rose-400"}`}>{connected ? "Connected" : "Reconnecting"}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Versione</p>
            <p className="font-bold text-white">v3.2.1</p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Segnali Attivi", value: active.length, color: "text-cyan-400", icon: Radio, sub: `${buyCount} BUY · ${sellCount} SELL` },
          { label: "Confidence Globale", value: `${confidencePct}%`, color: confidencePct >= 70 ? "text-emerald-400" : confidencePct >= 40 ? "text-amber-400" : "text-rose-400", icon: Zap, sub: "Score aggregato OLOS" },
          { label: "Simboli Monitorati", value: quotedSymbols || "—", color: "text-white", icon: Activity, sub: "Feed real-time attivo" },
          { label: "Ordini Oggi", value: todayOrders, color: "text-amber-400", icon: TrendingUp, sub: `${positions.length} posizioni aperte` },
        ].map(({ label, value, color, icon: Icon, sub }) => (
          <div key={label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={color} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
            </div>
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
            <Activity size={14} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Feed Attività Recente</h2>
          </div>
          <div className="divide-y divide-slate-800/40">
            {activity.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
                In attesa di attività...
              </div>
            ) : (
              activity.map((item) => {
                const icons = { signal: Radio, order: TrendingUp, risk: Shield, system: Brain };
                const ItemIcon = icons[item.type];
                return (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-800/20 transition">
                    <div className="shrink-0 mt-0.5">
                      <ItemIcon size={13} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-slate-300 leading-4">{item.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(item.ts)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* System sidebar */}
        <div className="space-y-4">
          {/* Confidence breakdown */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Zap size={14} className="text-cyan-400" /> Confidence Score
            </h2>
            <div className="text-center mb-4">
              <p className={`text-5xl font-extrabold ${confidencePct >= 70 ? "text-emerald-400" : confidencePct >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                {confidencePct}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {confidencePct >= 70 ? "Alta fiducia" : confidencePct >= 40 ? "Fiducia moderata" : "Bassa fiducia"}
              </p>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${confidencePct >= 70 ? "bg-emerald-400" : confidencePct >= 40 ? "bg-amber-400" : "bg-rose-400"}`}
                style={{ width: `${confidencePct}%`, transition: "width 0.5s ease" }} />
            </div>
          </div>

          {/* Signal distribution */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Radio size={14} className="text-cyan-400" /> Distribuzione Segnali
            </h2>
            <div className="space-y-2.5">
              {[
                { label: "BUY", count: buyCount, color: "bg-emerald-400", textColor: "text-emerald-400", icon: TrendingUp },
                { label: "SELL", count: sellCount, color: "bg-rose-400", textColor: "text-rose-400", icon: TrendingDown },
                { label: "HOLD", count: active.filter((s) => s.signalType === "HOLD").length, color: "bg-slate-500", textColor: "text-slate-400", icon: Minus },
              ].map(({ label, count, color, textColor, icon: Icon }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon size={11} className={textColor} />
                      <span className="text-[11px] text-slate-400">{label}</span>
                    </div>
                    <span className={`text-sm font-bold ${textColor}`}>{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: active.length > 0 ? `${(count / active.length) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System health */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Shield size={14} className="text-cyan-400" /> Sistema
            </h2>
            <div className="space-y-2.5">
              {[
                { label: "Signal Engine", ok: lastFetchAt !== null && !aiError },
                { label: "Market Feed", ok: connected },
                { label: "Risk Monitor", ok: snapshot !== null && !riskError },
                { label: "Order Engine", ok: !ordersError },
                // A real 0-signal tick (technical setup gate not met) is a
                // normal outcome of the signal generator, not a failure —
                // "ok" reflects whether the pipeline itself last synced
                // successfully, not whether it happened to find a setup.
                { label: "Data Pipeline", ok: lastFetchAt !== null && !aiError },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-400"}`} />
                    <span className={`text-[10px] font-semibold ${ok ? "text-emerald-400" : "text-rose-400"}`}>{ok ? "OK" : "ERR"}</span>
                  </div>
                </div>
              ))}
            </div>
            {lastFetchAt && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-600">
                <Clock size={10} />
                Ultimo sync: {new Date(lastFetchAt).toLocaleTimeString("it-IT")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { OLOSBrain };
