/**
 * AI Trade Simulation — Simulate trade outcomes with risk/reward analysis
 */
import { useState } from "react";
import { Calculator, TrendingUp, TrendingDown, Target, ShieldCheck, AlertCircle, BarChart2 } from "lucide-react";
import { useAiStore } from "../../store/ai.store";
import { useMarketStore } from "../../store/market.store";

type Side = "BUY" | "SELL";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US500", "BTCUSD", "GBPJPY"];

type SimResult = {
  maxLoss: number;
  maxProfit: number;
  rrRatio: number;
  breakEven: number;
  aiSuccessProb: number;
  expectedValue: number;
  recommendation: "PROCEED" | "CAUTION" | "AVOID";
};

function simulate(
  symbol: string,
  side: Side,
  size: number,
  entry: number,
  sl: number,
  tp: number,
  aiConfidence: number,
): SimResult | null {
  if (!entry || !sl || !tp || !size) return null;
  const slDiff = Math.abs(entry - sl);
  const tpDiff = Math.abs(tp - entry);
  if (slDiff === 0 || tpDiff === 0) return null;

  const pipValue = symbol.includes("JPY") ? 0.01 : symbol.includes("XAU") ? 0.1 : symbol.includes("BTC") ? 1 : 0.0001;
  const maxLoss = -(slDiff / pipValue) * size;
  const maxProfit = (tpDiff / pipValue) * size;
  const rrRatio = tpDiff / slDiff;

  // Break even: price at which net P&L = 0 (entry + spread)
  const breakEven = side === "BUY" ? entry + pipValue * 2 : entry - pipValue * 2;

  // AI success probability based on signal confidence and R:R
  const confBonus = (aiConfidence - 50) * 0.3;
  const rrBonus = Math.min((rrRatio - 1) * 5, 15);
  const aiSuccessProb = Math.min(Math.max(35 + confBonus + rrBonus, 20), 85);

  // Expected value
  const expectedValue = (aiSuccessProb / 100) * maxProfit + ((100 - aiSuccessProb) / 100) * maxLoss;

  const recommendation: SimResult["recommendation"] = expectedValue > 0 && rrRatio >= 1.5 && aiSuccessProb >= 50 ? "PROCEED"
    : rrRatio < 1 || aiSuccessProb < 35 ? "AVOID"
    : "CAUTION";

  return { maxLoss, maxProfit, rrRatio, breakEven, aiSuccessProb, expectedValue, recommendation };
}

export default function AITradeSimulation() {
  const signals = useAiStore((s) => s.signals);
  const quotes = useMarketStore((s) => s.quotes);

  const [symbol, setSymbol] = useState("EURUSD");
  const [side, setSide] = useState<Side>("BUY");
  const [size, setSize] = useState(1);
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [result, setResult] = useState<SimResult | null>(null);

  // Get AI confidence for selected symbol
  const symSigs = signals.filter((s) => s.symbol === symbol && s.status === "ACTIVE");
  const aiConfidence = symSigs.length > 0 ? symSigs.reduce((sum, s) => sum + s.confidence, 0) / symSigs.length : 50;
  const topSig = symSigs.sort((a, b) => b.confidence - a.confidence)[0];

  // Auto-fill entry from quote
  const quote = quotes[symbol];
  const fillFromQuote = () => {
    if (quote) setEntry(quote.mid.toFixed(symbol.includes("JPY") ? 3 : symbol.includes("BTC") ? 0 : 5));
  };

  const runSim = () => {
    const r = simulate(symbol, side, size, Number(entry), Number(sl), Number(tp), aiConfidence);
    setResult(r);
  };

  const recColors = { PROCEED: "border-emerald-400/30 bg-emerald-400/5 text-emerald-400", CAUTION: "border-amber-400/30 bg-amber-400/5 text-amber-400", AVOID: "border-rose-400/30 bg-rose-400/5 text-rose-400" };
  const recLabels = { PROCEED: "Procedi", CAUTION: "Attenzione", AVOID: "Evita" };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="text-cyan-400" size={20} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
        </div>
        <h1 className="text-2xl font-bold text-white">AI Trade Simulation</h1>
        <p className="text-slate-400 mt-1">Simula il rischio/rendimento di un trade con l'analisi OLOS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Parametri Trade</h2>

          {/* AI signal hint */}
          {topSig && (
            <div className={`p-3 rounded-lg border text-[12px] ${topSig.signalType === "BUY" ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400" : topSig.signalType === "SELL" ? "border-rose-400/20 bg-rose-400/5 text-rose-400" : "border-slate-700 text-slate-400"}`}>
              OLOS: Segnale {topSig.signalType} su {symbol} — Confidence {topSig.confidence.toFixed(0)}%
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Simbolo</label>
            <select value={symbol} onChange={(e) => { setSymbol(e.target.value); setResult(null); }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50">
              {SYMBOLS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Direzione</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSide("BUY")} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition ${side === "BUY" ? "bg-emerald-400/20 border border-emerald-400/40 text-emerald-400" : "border border-slate-700 text-slate-400"}`}>
                <TrendingUp size={14} /> BUY
              </button>
              <button onClick={() => setSide("SELL")} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition ${side === "SELL" ? "bg-rose-400/20 border border-rose-400/40 text-rose-400" : "border border-slate-700 text-slate-400"}`}>
                <TrendingDown size={14} /> SELL
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Dimensione (lots)</label>
            <input type="number" value={size} onChange={(e) => setSize(Number(e.target.value))} min={0.01} step={0.01}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Prezzo Entry</label>
              {quote && (
                <button onClick={fillFromQuote} className="text-[10px] text-cyan-400 hover:text-cyan-300">
                  Usa quotazione ({quote.mid.toFixed(5)})
                </button>
              )}
            </div>
            <input type="number" value={entry} onChange={(e) => setEntry(e.target.value)} step="0.00001" placeholder="1.09250"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1">
                <ShieldCheck size={10} className="text-rose-400" /> Stop Loss
              </label>
              <input type="number" value={sl} onChange={(e) => setSl(e.target.value)} step="0.00001" placeholder="1.09000"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-rose-400/40" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1">
                <Target size={10} className="text-emerald-400" /> Take Profit
              </label>
              <input type="number" value={tp} onChange={(e) => setTp(e.target.value)} step="0.00001" placeholder="1.09750"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40" />
            </div>
          </div>

          <button onClick={runSim} disabled={!entry || !sl || !tp}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-40 transition">
            <Calculator size={15} /> Simula Trade
          </button>
        </div>

        {/* Results */}
        <div>
          {!result ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col items-center justify-center h-full min-h-[400px]">
              <BarChart2 size={36} className="text-slate-700 mb-4" />
              <p className="text-slate-500 font-semibold">Inserisci i parametri e simula</p>
              <p className="text-slate-600 text-sm mt-1">Analisi AI apparirà qui</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recommendation */}
              <div className={`rounded-xl border p-4 ${recColors[result.recommendation]}`}>
                <div className="flex items-center gap-2">
                  {result.recommendation === "AVOID" ? <AlertCircle size={18} /> : result.recommendation === "CAUTION" ? <AlertCircle size={18} /> : <Target size={18} />}
                  <div>
                    <p className="font-bold text-lg">Raccomandazione OLOS: {recLabels[result.recommendation]}</p>
                    <p className="text-[12px] opacity-80">
                      {result.recommendation === "PROCEED" && "Buon rapporto R:R e confidence AI elevata. Il trade è ben impostato."}
                      {result.recommendation === "CAUTION" && "Parametri accettabili ma con margini ridotti. Valuta di ottimizzare SL/TP."}
                      {result.recommendation === "AVOID" && "R:R sfavorevole o confidence AI bassa. Ricerca un setup migliore."}
                    </p>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-rose-500/10 border border-rose-400/20 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Max Perdita</p>
                  <p className="text-2xl font-extrabold text-rose-400">${Math.abs(result.maxLoss).toFixed(2)}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Max Profitto</p>
                  <p className="text-2xl font-extrabold text-emerald-400">${result.maxProfit.toFixed(2)}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">R:R Ratio</p>
                  <p className={`text-2xl font-extrabold ${result.rrRatio >= 2 ? "text-emerald-400" : result.rrRatio >= 1.5 ? "text-amber-400" : "text-rose-400"}`}>
                    1:{result.rrRatio.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Prob. Successo AI</p>
                  <p className={`text-2xl font-extrabold ${result.aiSuccessProb >= 60 ? "text-emerald-400" : result.aiSuccessProb >= 45 ? "text-amber-400" : "text-rose-400"}`}>
                    {result.aiSuccessProb.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Expected value */}
              <div className={`rounded-xl border p-4 ${result.expectedValue >= 0 ? "border-emerald-400/20 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5"}`}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Valore Atteso</p>
                <p className={`text-3xl font-extrabold ${result.expectedValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {result.expectedValue >= 0 ? "+" : ""}${result.expectedValue.toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Break-even: {result.breakEven.toFixed(5)}</p>
              </div>

              {/* AI confidence */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-[11px] text-slate-400">Confidence OLOS su {symbol}</span>
                  <span className={`text-sm font-bold ${aiConfidence >= 70 ? "text-emerald-400" : aiConfidence >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                    {aiConfidence.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${aiConfidence >= 70 ? "bg-emerald-400" : aiConfidence >= 40 ? "bg-amber-400" : "bg-rose-400"}`}
                    style={{ width: `${aiConfidence}%` }} />
                </div>
                {symSigs.length === 0 && (
                  <p className="text-[10px] text-slate-600 mt-1">Nessun segnale attivo — confidence di default 50%</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { AITradeSimulation };
