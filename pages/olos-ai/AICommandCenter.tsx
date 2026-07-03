/**
 * AI Command Center — Overview di tutti i segnali attivi OLOS
 */
import { useEffect, useState } from "react";
import { Command, TrendingUp, TrendingDown, Minus, Radio, RefreshCw, Filter } from "lucide-react";
import { useAiStore } from "../../store/ai.store";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  return `${Math.floor(diff / 86400)}g fa`;
}

function SignalBadge({ type }: { type: string }) {
  if (type === "BUY") return <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400"><TrendingUp size={9} /> BUY</span>;
  if (type === "SELL") return <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-rose-500/15 text-rose-400"><TrendingDown size={9} /> SELL</span>;
  return <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-slate-700/60 text-slate-400"><Minus size={9} /> HOLD</span>;
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-emerald-400" : value >= 40 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-bold text-white w-8 text-right">{value.toFixed(0)}%</span>
    </div>
  );
}

export default function AICommandCenter() {
  const signals = useAiStore((s) => s.signals);
  const loading = useAiStore((s) => s.loading);
  const lastFetchAt = useAiStore((s) => s.lastFetchAt);
  const fetchSignals = useAiStore((s) => s.fetchSignals);
  const fetchConfidence = useAiStore((s) => s.fetchConfidence);
  const subscribeWs = useAiStore((s) => s.subscribeWs);
  const getActiveSignals = useAiStore((s) => s.getActiveSignals);

  const [filterSymbol, setFilterSymbol] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "BUY" | "SELL" | "HOLD">("ALL");

  useEffect(() => {
    void fetchSignals();
    void fetchConfidence();
    const unsub = subscribeWs();
    return unsub;
  }, [fetchSignals, fetchConfidence, subscribeWs]);

  const active = getActiveSignals();

  const buyCount = active.filter((s) => s.signalType === "BUY").length;
  const sellCount = active.filter((s) => s.signalType === "SELL").length;
  const avgConf = active.length ? active.reduce((sum, s) => sum + s.confidence, 0) / active.length : 0;

  const filtered = signals.filter((s) => {
    if (filterSymbol && !s.symbol.toLowerCase().includes(filterSymbol.toLowerCase())) return false;
    if (filterType !== "ALL" && s.signalType !== filterType) return false;
    return true;
  });

  const symbols = [...new Set(signals.map((s) => s.symbol))];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Command className="text-cyan-400" size={20} />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Command Center</h1>
          <p className="text-slate-400 mt-1">Centro di controllo segnali in tempo reale</p>
        </div>
        <button onClick={() => { void fetchSignals(); void fetchConfidence(); }}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-[12px] text-slate-300 hover:bg-slate-800 transition">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Aggiorna
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Segnali Attivi", value: active.length, color: "text-cyan-400", icon: Radio },
          { label: "BUY", value: buyCount, color: "text-emerald-400", icon: TrendingUp },
          { label: "SELL", value: sellCount, color: "text-rose-400", icon: TrendingDown },
          { label: "Avg Confidence", value: `${avgConf.toFixed(0)}%`, color: "text-amber-400", icon: Command },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={color} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
            </div>
            <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <input value={filterSymbol} onChange={(e) => setFilterSymbol(e.target.value)}
            placeholder="Filtra per simbolo..."
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400/50 w-44" />
        </div>
        <div className="flex gap-1">
          {(["ALL", "BUY", "SELL", "HOLD"] as const).map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${filterType === t ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-400 hover:border-slate-600"}`}>
              {t}
            </button>
          ))}
        </div>
        {lastFetchAt && (
          <span className="ml-auto text-[10px] text-slate-500 self-center">
            Aggiornato: {new Date(lastFetchAt).toLocaleTimeString("it-IT")}
          </span>
        )}
      </div>

      {/* Signals Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">Segnali Recenti</h2>
          <p className="text-[11px] text-slate-400">{filtered.length} segnali visualizzati</p>
        </div>

        {loading && !signals.length ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={20} className="animate-spin text-cyan-400 mr-3" />
            <span className="text-slate-400">Caricamento segnali...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Radio size={28} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">Nessun segnale trovato</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  {["Simbolo", "Direzione", "Confidence", "Timeframe", "Status", "Generato"].map((h) => (
                    <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((sig) => (
                  <tr key={sig.id} className="border-t border-slate-800/40 hover:bg-slate-800/20 transition">
                    <td className="px-5 py-3 font-bold text-white">{sig.symbol}</td>
                    <td className="px-5 py-3"><SignalBadge type={sig.signalType} /></td>
                    <td className="px-5 py-3 w-40"><ConfidenceBar value={sig.confidence} /></td>
                    <td className="px-5 py-3 text-slate-400 text-[11px]">{sig.timeframe}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${sig.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/60 text-slate-500"}`}>
                        {sig.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-[11px]">{timeAgo(sig.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Symbol breakdown */}
      {symbols.length > 0 && (
        <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">Segnali per Simbolo</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {symbols.slice(0, 12).map((sym) => {
              const symSigs = active.filter((s) => s.symbol === sym);
              const topSig = symSigs.sort((a, b) => b.confidence - a.confidence)[0];
              return (
                <div key={sym} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-sm">{sym}</span>
                    {topSig && <SignalBadge type={topSig.signalType} />}
                  </div>
                  {topSig && <ConfidenceBar value={topSig.confidence} />}
                  {!topSig && <span className="text-[10px] text-slate-600">Nessun segnale attivo</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { AICommandCenter };
