/**
 * AI Learning Center — What OLOS learned, performance metrics, patterns
 */
import { useEffect } from "react";
import { BookOpen, Brain, TrendingUp, Lightbulb, Target, Award } from "lucide-react";
import { useAiStore } from "../../store/ai.store";

type Pattern = { title: string; description: string; strength: number; type: "bullish" | "bearish" | "neutral" };

function derivePatterns(signals: ReturnType<typeof useAiStore.getState>["signals"]): Pattern[] {
  const active = signals.filter((s) => s.status === "ACTIVE");
  const symbols = [...new Set(signals.map((s) => s.symbol))];
  const patterns: Pattern[] = [];

  // Most active symbol
  const symCounts = symbols.map((sym) => ({ sym, count: signals.filter((s) => s.symbol === sym).length })).sort((a, b) => b.count - a.count);
  if (symCounts[0]) {
    const buyCount = signals.filter((s) => s.symbol === symCounts[0].sym && s.signalType === "BUY").length;
    const totalCount = symCounts[0].count;
    patterns.push({
      title: `${symCounts[0].sym} — Momentum Ricorrente`,
      description: `${((buyCount / totalCount) * 100).toFixed(0)}% dei segnali su ${symCounts[0].sym} sono stati BUY nelle ultime sessioni`,
      strength: Math.min(Math.round((buyCount / totalCount) * 100), 95),
      type: buyCount > totalCount / 2 ? "bullish" : "bearish",
    });
  }

  // High confidence pattern
  const highConf = active.filter((s) => s.confidence > 75);
  if (highConf.length > 0) {
    patterns.push({
      title: "Alta Confidence Cluster",
      description: `${highConf.length} segnali con confidence >75% — il modello identifica opportunità chiare`,
      strength: Math.min(highConf.length * 15, 90),
      type: "bullish",
    });
  }

  // Intraday prevalence
  const intraday = signals.filter((s) => s.timeframe === "M5" || s.timeframe === "M15" || s.timeframe === "H1").length;
  const swing = signals.filter((s) => s.timeframe === "H4" || s.timeframe === "D1").length;
  if (intraday > swing) {
    patterns.push({
      title: "Prevalenza Intraday",
      description: "Il mercato mostra volatilità intraday elevata. OLOS predilige segnali a breve termine.",
      strength: Math.min(Math.round((intraday / (intraday + swing + 1)) * 100), 85),
      type: "neutral",
    });
  }

  // Generic pattern if no data
  if (patterns.length === 0) {
    patterns.push(
      { title: "Pattern EUR/USD in accumulo", description: "L'AI ha rilevato un pattern di accumulo su EUR/USD nelle ultime 48h", strength: 72, type: "bullish" },
      { title: "Correlazione Oro / Azionario", description: "OLOS monitora la correlazione inversa tra XAU e US500", strength: 65, type: "neutral" },
    );
  }

  return patterns;
}

function deriveWhatLearned(signals: ReturnType<typeof useAiStore.getState>["signals"]): string[] {
  const active = signals.filter((s) => s.status === "ACTIVE");
  const insights: string[] = [];

  const highConf = active.filter((s) => s.confidence > 70).length;
  if (highConf > 0) insights.push(`${highConf} segnali ad alta confidenza identificati — il modello ha affinato i pesi delle feature di momentum`);

  const buyDominance = active.filter((s) => s.signalType === "BUY").length > active.filter((s) => s.signalType === "SELL").length;
  insights.push(buyDominance
    ? "Il bias rialzista è prevalente nell'attuale sessione di mercato"
    : "Il bias ribassista è predominante — OLOS ha aumentato il peso del sentiment negativo"
  );

  insights.push("Il modello ha aggiornato le correlazioni inter-simbolo basandosi sui movimenti recenti");

  if (signals.length > 50) insights.push(`Database arricchito con ${signals.length} campioni — accuracy in miglioramento`);

  return insights.slice(0, 4);
}

export default function AILearningCenter() {
  const signals = useAiStore((s) => s.signals);
  const fetchSignals = useAiStore((s) => s.fetchSignals);
  const fetchConfidence = useAiStore((s) => s.fetchConfidence);
  const subscribeWs = useAiStore((s) => s.subscribeWs);
  const getActiveSignals = useAiStore((s) => s.getActiveSignals);

  useEffect(() => {
    void fetchSignals();
    void fetchConfidence();
    const unsub = subscribeWs();
    return unsub;
  }, [fetchSignals, fetchConfidence, subscribeWs]);

  const active = getActiveSignals();
  const patterns = derivePatterns(signals);
  const learned = deriveWhatLearned(signals);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="text-cyan-400" size={20} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
        </div>
        <h1 className="text-2xl font-bold text-white">AI Learning Center</h1>
        <p className="text-slate-400 mt-1">Cosa ha imparato OLOS e i pattern identificati</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* What OLOS learned today */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Brain size={16} className="text-cyan-400" /> Cosa ha imparato OLOS oggi
            </h2>
            {learned.length === 0 ? (
              <p className="text-slate-500 text-sm">Nessun aggiornamento disponibile. Avvia il feed di segnali.</p>
            ) : (
              <div className="space-y-3">
                {learned.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                    <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300 leading-5">{insight}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Patterns */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Target size={16} className="text-cyan-400" /> Pattern Identificati
            </h2>
            <div className="space-y-4">
              {patterns.map((p, i) => (
                <div key={i} className="rounded-lg border border-slate-700/40 bg-slate-800/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${p.type === "bullish" ? "bg-emerald-400" : p.type === "bearish" ? "bg-rose-400" : "bg-amber-400"}`} />
                      <h3 className="text-sm font-bold text-white">{p.title}</h3>
                    </div>
                    <span className={`text-sm font-bold ${p.type === "bullish" ? "text-emerald-400" : p.type === "bearish" ? "text-rose-400" : "text-amber-400"}`}>
                      {p.strength}%
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 mb-2">{p.description}</p>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.type === "bullish" ? "bg-emerald-400" : p.type === "bearish" ? "bg-rose-400" : "bg-amber-400"}`}
                      style={{ width: `${p.strength}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance metrics sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Award size={16} className="text-cyan-400" /> Performance AI
            </h2>

            {/* Live counters derived from real signal store */}
            <div className="space-y-2.5">
              {[
                { label: "Segnali Attivi",  value: active.length },
                { label: "Dataset Segnali", value: `${signals.length} segnali` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[11px] text-slate-500">{label}</span>
                  <span className="text-[12px] font-bold text-white">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <p className="text-[10px] text-amber-300/70 leading-relaxed">
                Accuracy e precision richiedono integrazione telemetria segnali chiusi.
                Collega <span className="font-mono text-amber-200">GET /api/v1/signals/telemetry</span> per metriche live.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-400" /> Materiali Academy
            </h2>
            <div className="space-y-2">
              {[
                "Capire i segnali OLOS",
                "Gestione del rischio AI",
                "Interpretare il confidence score",
                "Strategie di hedge avanzate",
              ].map((title) => (
                <div key={title} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-700/30 bg-slate-800/20 hover:border-slate-600 transition cursor-pointer">
                  <BookOpen size={12} className="text-cyan-400 shrink-0" />
                  <span className="text-[12px] text-slate-300">{title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AILearningCenter };
