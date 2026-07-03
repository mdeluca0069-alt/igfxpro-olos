/**
 * AI Regime Map — Market regime detection per symbol
 */
import { useEffect } from "react";
import { Map, TrendingUp, TrendingDown, Minus, Zap, RefreshCw } from "lucide-react";
import { useAiStore } from "../../store/ai.store";
import { useMarketStore } from "../../store/market.store";

type RegimeType = "TRENDING_UP" | "TRENDING_DOWN" | "RANGING" | "VOLATILE";

type SymbolRegime = {
  symbol: string;
  regime: RegimeType;
  confidence: number;
  spread: number;
  changePct: number;
  signalCount: number;
};

function detectRegime(signals: ReturnType<typeof useAiStore.getState>["signals"], symbol: string, spread: number, changePct: number): RegimeType {
  const symSigs = signals.filter((s) => s.symbol === symbol && s.status === "ACTIVE");
  if (symSigs.length === 0) {
    if (Math.abs(changePct) > 0.8) return changePct > 0 ? "TRENDING_UP" : "TRENDING_DOWN";
    return "RANGING";
  }
  const buyCount = symSigs.filter((s) => s.signalType === "BUY").length;
  const sellCount = symSigs.filter((s) => s.signalType === "SELL").length;
  const avgConf = symSigs.reduce((sum, s) => sum + s.confidence, 0) / symSigs.length;

  if (spread > 0.003 || Math.abs(changePct) > 1.2) return "VOLATILE";
  if (buyCount > sellCount * 1.5 && avgConf > 60) return "TRENDING_UP";
  if (sellCount > buyCount * 1.5 && avgConf > 60) return "TRENDING_DOWN";
  return "RANGING";
}

const REGIME_CONFIG: Record<RegimeType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  TRENDING_UP:   { label: "Trending Up",   color: "text-emerald-400", bg: "bg-emerald-400/10",  border: "border-emerald-400/30", icon: TrendingUp },
  TRENDING_DOWN: { label: "Trending Down", color: "text-rose-400",    bg: "bg-rose-400/10",     border: "border-rose-400/30",    icon: TrendingDown },
  RANGING:       { label: "Ranging",       color: "text-slate-400",   bg: "bg-slate-800/40",    border: "border-slate-700",      icon: Minus },
  VOLATILE:      { label: "Volatile",      color: "text-amber-400",   bg: "bg-amber-400/10",    border: "border-amber-400/30",   icon: Zap },
};

const KNOWN_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US500", "BTCUSD", "GBPJPY", "USDCHF", "AUDUSD", "NZDUSD"];

export default function AIRegimeMap() {
  const signals = useAiStore((s) => s.signals);
  const fetchSignals = useAiStore((s) => s.fetchSignals);
  const fetchConfidence = useAiStore((s) => s.fetchConfidence);
  const subscribeWsAi = useAiStore((s) => s.subscribeWs);
  const loading = useAiStore((s) => s.loading);

  const quotes = useMarketStore((s) => s.quotes);
  const fetchQuotes = useMarketStore((s) => s.fetchQuotes);
  const subscribeWsMarket = useMarketStore((s) => s.subscribeWs);

  useEffect(() => {
    void fetchSignals();
    void fetchConfidence();
    void fetchQuotes();
    const unsubAi = subscribeWsAi();
    const unsubMarket = subscribeWsMarket();
    return () => { unsubAi(); unsubMarket(); };
  }, [fetchSignals, fetchConfidence, fetchQuotes, subscribeWsAi, subscribeWsMarket]);

  // Build list from known symbols + any that appear in signals
  const signalSymbols = [...new Set(signals.map((s) => s.symbol))];
  const allSymbols = [...new Set([...KNOWN_SYMBOLS, ...signalSymbols])];

  const regimeData: SymbolRegime[] = allSymbols.map((sym) => {
    const quote = quotes[sym];
    const spread = quote?.spread ?? 0;
    const changePct = quote?.changePct ?? 0;
    const regime = detectRegime(signals, sym, spread, changePct);
    const symSigs = signals.filter((s) => s.symbol === sym && s.status === "ACTIVE");
    const confidence = symSigs.length > 0 ? symSigs.reduce((sum, s) => sum + s.confidence, 0) / symSigs.length : 50;

    return { symbol: sym, regime, confidence, spread, changePct, signalCount: symSigs.length };
  });

  const counts = {
    TRENDING_UP: regimeData.filter((r) => r.regime === "TRENDING_UP").length,
    TRENDING_DOWN: regimeData.filter((r) => r.regime === "TRENDING_DOWN").length,
    RANGING: regimeData.filter((r) => r.regime === "RANGING").length,
    VOLATILE: regimeData.filter((r) => r.regime === "VOLATILE").length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Map className="text-cyan-400" size={20} />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Regime Map</h1>
          <p className="text-slate-400 mt-1">Rilevamento del regime di mercato per strumento</p>
        </div>
        <button onClick={() => { void fetchSignals(); void fetchQuotes(); }}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-[12px] text-slate-300 hover:bg-slate-800 transition">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Aggiorna
        </button>
      </div>

      {/* Regime summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {(["TRENDING_UP", "TRENDING_DOWN", "VOLATILE", "RANGING"] as RegimeType[]).map((regime) => {
          const cfg = REGIME_CONFIG[regime];
          const Icon = cfg.icon;
          return (
            <div key={regime} className={`border rounded-xl p-4 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={cfg.color} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{cfg.label}</span>
              </div>
              <p className={`text-3xl font-extrabold ${cfg.color}`}>{counts[regime]}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">strumenti</p>
            </div>
          );
        })}
      </div>

      {/* Symbol Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {regimeData.map(({ symbol, regime, confidence, spread, changePct, signalCount }) => {
          const cfg = REGIME_CONFIG[regime];
          const Icon = cfg.icon;
          const quote = quotes[symbol];
          const pos = changePct >= 0;

          return (
            <div key={symbol} className={`border rounded-xl p-4 ${cfg.border} ${cfg.bg} transition hover:scale-[1.01]`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-lg">{symbol}</span>
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border ${cfg.border} ${cfg.color}`}>
                  <Icon size={10} />
                  {cfg.label}
                </div>
              </div>

              {quote && (
                <div className="mb-3">
                  <p className="text-xl font-bold font-mono text-white">{quote.mid.toFixed(symbol.includes("JPY") ? 3 : symbol.includes("BTC") ? 0 : 5)}</p>
                  <p className={`text-[11px] font-semibold ${pos ? "text-emerald-400" : "text-rose-400"}`}>
                    {pos ? "+" : ""}{changePct.toFixed(2)}%
                  </p>
                </div>
              )}

              <div className="space-y-1.5 text-[11px] border-t border-slate-800/40 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Confidence AI</span>
                  <span className={`font-bold ${confidence >= 70 ? "text-emerald-400" : confidence >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                    {confidence.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Segnali Attivi</span>
                  <span className="font-bold text-white">{signalCount}</span>
                </div>
                {spread > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Spread</span>
                    <span className={`font-bold ${spread > 0.003 ? "text-amber-400" : "text-slate-300"}`}>{(spread * 10000).toFixed(1)} pip</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { AIRegimeMap };
