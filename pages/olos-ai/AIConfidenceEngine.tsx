/**
 * AI Confidence Engine — Global and per-symbol confidence scoring
 */
import { useEffect } from "react";
import { Gauge, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { useAiStore } from "../../store/ai.store";

function ConfidenceGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#f87171";
  const label = pct >= 70 ? "Alta" : pct >= 40 ? "Moderata" : "Bassa";
  // SVG arc gauge
  const r = 70;
  const cx = 90;
  const cy = 90;
  const startAngle = -200;
  const endAngle = 20;
  const totalArc = endAngle - startAngle;
  const fillArc = (pct / 100) * totalArc;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polarToCart = (angle: number) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  });
  const start = polarToCart(startAngle);
  const end = polarToCart(endAngle);
  const fill = polarToCart(startAngle + fillArc);
  const largeArc = totalArc > 180 ? 1 : 0;
  const fillLargeArc = fillArc > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={180} height={140} viewBox="0 0 180 140">
        {/* Track */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`}
          fill="none" stroke="#1e293b" strokeWidth={12} strokeLinecap="round" />
        {/* Fill */}
        {pct > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${fillLargeArc} 1 ${fill.x} ${fill.y}`}
            fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" />
        )}
        {/* Center text */}
        <text x={cx} y={cy + 8} textAnchor="middle" fill={color} fontSize={28} fontWeight="bold" fontFamily="monospace">{pct}%</text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill="#64748b" fontSize={11} fontFamily="sans-serif">{label}</text>
      </svg>
    </div>
  );
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%`, transition: "width 0.5s ease" }} />
    </div>
  );
}

export default function AIConfidenceEngine() {
  const signals = useAiStore((s) => s.signals);
  const confidence = useAiStore((s) => s.confidence);
  const loading = useAiStore((s) => s.loading);
  const fetchSignals = useAiStore((s) => s.fetchSignals);
  const fetchConfidence = useAiStore((s) => s.fetchConfidence);
  const subscribeWs = useAiStore((s) => s.subscribeWs);
  const getActiveSignals = useAiStore((s) => s.getActiveSignals);
  const getOverallConfidenceScore = useAiStore((s) => s.getOverallConfidenceScore);

  useEffect(() => {
    void fetchSignals();
    void fetchConfidence();
    const unsub = subscribeWs();
    return unsub;
  }, [fetchSignals, fetchConfidence, subscribeWs]);

  const active = getActiveSignals();
  const overallScore = getOverallConfidenceScore(); // 0-1

  // Per-symbol confidence
  const symbols = [...new Set(active.map((s) => s.symbol))];
  const symbolData = symbols.map((sym) => {
    const symSigs = active.filter((s) => s.symbol === sym);
    const avg = symSigs.reduce((sum, s) => sum + s.confidence, 0) / symSigs.length;
    const topSig = symSigs.sort((a, b) => b.confidence - a.confidence)[0];
    return { sym, avg, count: symSigs.length, topType: topSig?.signalType ?? "HOLD" };
  }).sort((a, b) => b.avg - a.avg);

  // History: last 20 signals sorted by date
  const history = [...signals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);

  const colorForPct = (pct: number) => pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-rose-400";
  const textColorForPct = (pct: number) => pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="text-cyan-400" size={20} />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Confidence Engine</h1>
          <p className="text-slate-400 mt-1">Score di confidenza globale e per simbolo</p>
        </div>
        <button onClick={() => { void fetchSignals(); void fetchConfidence(); }}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-[12px] text-slate-300 hover:bg-slate-800 transition">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Aggiorna
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Score */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col items-center">
          <h2 className="text-sm font-bold text-white mb-2">Confidence Globale</h2>
          <ConfidenceGauge score={overallScore} />
          <div className="mt-2 text-center">
            <p className="text-[11px] text-slate-500">Basato su {active.length} segnali attivi</p>
            {confidence && (
              <p className="text-[10px] text-slate-600 mt-1">
                Aggiornato: {new Date(confidence.asOf ?? Date.now()).toLocaleTimeString("it-IT")}
              </p>
            )}
          </div>

          <div className="w-full mt-6 space-y-3">
            {[
              { label: "Segnali BUY", count: active.filter((s) => s.signalType === "BUY").length, icon: TrendingUp, color: "text-emerald-400" },
              { label: "Segnali SELL", count: active.filter((s) => s.signalType === "SELL").length, icon: TrendingDown, color: "text-rose-400" },
              { label: "Segnali HOLD", count: active.filter((s) => s.signalType === "HOLD").length, icon: Minus, color: "text-slate-400" },
            ].map(({ label, count, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={13} className={color} />
                  <span className="text-[11px] text-slate-400">{label}</span>
                </div>
                <span className={`text-sm font-bold ${color}`}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-symbol breakdown */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">Confidence per Simbolo</h2>
          {symbolData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Gauge size={28} className="text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm">Nessun segnale attivo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {symbolData.map(({ sym, avg, count, topType }) => (
                <div key={sym}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-sm w-20">{sym}</span>
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                        topType === "BUY" ? "bg-emerald-500/15 text-emerald-400"
                        : topType === "SELL" ? "bg-rose-500/15 text-rose-400"
                        : "bg-slate-700/60 text-slate-400"
                      }`}>
                        {topType}
                      </span>
                      <span className="text-[10px] text-slate-600">{count} segnali</span>
                    </div>
                    <span className={`font-bold text-sm ${textColorForPct(avg)}`}>{avg.toFixed(0)}%</span>
                  </div>
                  <ConfidenceBar value={avg} color={colorForPct(avg)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="lg:col-span-3 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white">Storico Confidence — Ultimi Segnali</h2>
          </div>
          {history.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-500 text-sm">Nessun dato storico</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-2 p-4 min-w-max">
                {history.map((sig) => {
                  const pct = sig.confidence;
                  const color = pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-rose-400";
                  return (
                    <div key={sig.id} className="flex flex-col items-center gap-1 w-12">
                      <div className="relative h-20 w-6 bg-slate-800 rounded-full overflow-hidden flex flex-col justify-end">
                        <div className={`w-full rounded-full ${color}`} style={{ height: `${pct}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-500 rotate-45 origin-left">{sig.symbol.slice(0, 3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { AIConfidenceEngine };
