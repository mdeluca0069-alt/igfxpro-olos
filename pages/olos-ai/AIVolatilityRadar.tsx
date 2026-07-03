/**
 * AI Volatility Radar — Real-time volatility assessment per symbol
 */
import { useEffect, useState } from "react";
import { Radio, AlertTriangle, TrendingUp, TrendingDown, Bell, RefreshCw } from "lucide-react";
import { useMarketStore } from "../../store/market.store";
import { useAiStore } from "../../store/ai.store";

type VolLevel = "HIGH" | "MEDIUM" | "LOW";

type VolatilityRow = {
  symbol: string;
  spread: number;
  spreadPips: number;
  changePct: number;
  volLevel: VolLevel;
  volScore: number;
  bid: number;
  ask: number;
  signalCount: number;
};

const ALL_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US500", "BTCUSD", "GBPJPY", "USDCHF", "AUDUSD", "NZDUSD", "EURJPY", "USDCAD"];

// Pip size per symbol category
function getPipSize(symbol: string): number {
  if (symbol.includes("JPY")) return 0.01;
  if (symbol.includes("XAU")) return 0.1;
  if (symbol.includes("BTC")) return 1;
  return 0.0001;
}

function calcVolScore(spread: number, changePct: number, symbol: string): number {
  const pip = getPipSize(symbol);
  const spreadPips = spread / pip;
  const spreadScore = Math.min(spreadPips * 5, 60);
  const changeScore = Math.min(Math.abs(changePct) * 20, 40);
  return Math.round(spreadScore + changeScore);
}

function getVolLevel(score: number): VolLevel {
  if (score >= 50) return "HIGH";
  if (score >= 20) return "MEDIUM";
  return "LOW";
}

const VOL_CONFIG: Record<VolLevel, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  HIGH:   { label: "ALTA",   color: "text-rose-400",    bg: "bg-rose-400/10",    border: "border-rose-400/30",    icon: AlertTriangle },
  MEDIUM: { label: "MEDIA",  color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/30",   icon: TrendingUp },
  LOW:    { label: "BASSA",  color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", icon: TrendingDown },
};

export default function AIVolatilityRadar() {
  const quotes = useMarketStore((s) => s.quotes);
  const fetchQuotes = useMarketStore((s) => s.fetchQuotes);
  const subscribeWsMarket = useMarketStore((s) => s.subscribeWs);

  const signals = useAiStore((s) => s.signals);
  const fetchSignals = useAiStore((s) => s.fetchSignals);
  const subscribeWsAi = useAiStore((s) => s.subscribeWs);

  const [alertThreshold, setAlertThreshold] = useState(50);
  const [triggered, setTriggered] = useState<Set<string>>(new Set());

  useEffect(() => {
    void fetchQuotes();
    void fetchSignals();
    const unsubMarket = subscribeWsMarket();
    const unsubAi = subscribeWsAi();
    return () => { unsubMarket(); unsubAi(); };
  }, [fetchQuotes, fetchSignals, subscribeWsMarket, subscribeWsAi]);

  // Build volatility rows
  const signalSymbols = [...new Set(signals.map((s) => s.symbol))];
  const allSymbols = [...new Set([...ALL_SYMBOLS, ...signalSymbols])];

  const rows: VolatilityRow[] = allSymbols.map((sym) => {
    const quote = quotes[sym];
    const spread = quote?.spread ?? 0;
    const changePct = quote?.changePct ?? 0;
    const pip = getPipSize(sym);
    const spreadPips = spread / pip;
    const volScore = quote ? calcVolScore(spread, changePct, sym) : 0;
    const volLevel = getVolLevel(volScore);
    const symSigs = signals.filter((s) => s.symbol === sym && s.status === "ACTIVE");

    return {
      symbol: sym,
      spread,
      spreadPips,
      changePct,
      volLevel,
      volScore,
      bid: quote?.bid ?? 0,
      ask: quote?.ask ?? 0,
      signalCount: symSigs.length,
    };
  }).sort((a, b) => b.volScore - a.volScore);

  // Alert logic
  useEffect(() => {
    const newAlerts = rows.filter((r) => r.volScore >= alertThreshold && !triggered.has(r.symbol));
    if (newAlerts.length > 0) {
      setTriggered((prev) => new Set([...prev, ...newAlerts.map((r) => r.symbol)]));
    }
  }, [rows, alertThreshold]);

  const highCount = rows.filter((r) => r.volLevel === "HIGH").length;
  const medCount = rows.filter((r) => r.volLevel === "MEDIUM").length;
  const lowCount = rows.filter((r) => r.volLevel === "LOW").length;

  const formatPrice = (sym: string, price: number) => {
    if (price === 0) return "—";
    if (sym.includes("JPY")) return price.toFixed(3);
    if (sym.includes("BTC")) return price.toFixed(0);
    return price.toFixed(5);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radio className="text-cyan-400" size={20} />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Volatility Radar</h1>
          <p className="text-slate-400 mt-1">Monitor volatilità in tempo reale per tutti gli strumenti</p>
        </div>
        <button onClick={() => { void fetchQuotes(); void fetchSignals(); }}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-[12px] text-slate-300 hover:bg-slate-800 transition">
          <RefreshCw size={13} /> Aggiorna
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-rose-400/10 border border-rose-400/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-rose-400">{highCount}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Alta Volatilità</p>
        </div>
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-amber-400">{medCount}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Media Volatilità</p>
        </div>
        <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-emerald-400">{lowCount}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Bassa Volatilità</p>
        </div>
      </div>

      {/* Alert threshold */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <Bell size={14} className="text-amber-400" />
          <span className="text-sm text-slate-300">Soglia Alert Volatilità</span>
          <div className="flex-1 flex items-center gap-3">
            <input type="range" min={20} max={90} step={5} value={alertThreshold}
              onChange={(e) => { setAlertThreshold(Number(e.target.value)); setTriggered(new Set()); }}
              className="flex-1 accent-amber-400" />
            <span className="text-sm font-bold text-amber-400 w-10">{alertThreshold}</span>
          </div>
          {triggered.size > 0 && (
            <span className="text-[11px] text-rose-400 font-bold">
              {triggered.size} alert attivi
            </span>
          )}
        </div>
      </div>

      {/* Volatility Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {rows.map((row) => {
          const cfg = VOL_CONFIG[row.volLevel];
          const Icon = cfg.icon;
          const alertActive = row.volScore >= alertThreshold;
          const pos = row.changePct >= 0;

          return (
            <div key={row.symbol} className={`border rounded-xl p-4 transition ${cfg.border} ${cfg.bg} ${alertActive ? "ring-1 ring-offset-0 ring-rose-400/40" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-lg">{row.symbol}</span>
                <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${cfg.border} ${cfg.color}`}>
                  <Icon size={10} />
                  {cfg.label}
                </div>
              </div>

              {/* Score bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-slate-500">Vol Score</span>
                  <span className={`text-[11px] font-bold ${cfg.color}`}>{row.volScore}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${row.volLevel === "HIGH" ? "bg-rose-400" : row.volLevel === "MEDIUM" ? "bg-amber-400" : "bg-emerald-400"}`}
                    style={{ width: `${Math.min(row.volScore, 100)}%` }} />
                </div>
              </div>

              <div className="space-y-1.5 text-[11px]">
                {row.bid > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prezzo</span>
                    <span className="font-mono font-bold text-white">{formatPrice(row.symbol, (row.bid + row.ask) / 2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Variazione</span>
                  <span className={`font-bold ${pos ? "text-emerald-400" : "text-rose-400"}`}>
                    {row.changePct !== 0 ? `${pos ? "+" : ""}${row.changePct.toFixed(2)}%` : "—"}
                  </span>
                </div>
                {row.spreadPips > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Spread</span>
                    <span className={`font-bold ${row.spreadPips > 5 ? "text-rose-400" : row.spreadPips > 2 ? "text-amber-400" : "text-slate-300"}`}>
                      {row.spreadPips.toFixed(1)} pip
                    </span>
                  </div>
                )}
                {row.signalCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Segnali AI</span>
                    <span className="font-bold text-cyan-400">{row.signalCount}</span>
                  </div>
                )}
              </div>

              {alertActive && (
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-rose-400 font-semibold">
                  <AlertTriangle size={10} /> Volatilità elevata — operare con cautela
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table view */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">Tabella Riepilogativa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {["Simbolo", "Vol Level", "Score", "Spread (pip)", "Variazione%", "Segnali AI"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const cfg = VOL_CONFIG[row.volLevel];
                return (
                  <tr key={row.symbol} className="border-t border-slate-800/40 hover:bg-slate-800/20">
                    <td className="px-4 py-2.5 font-bold text-white">{row.symbol}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${cfg.border} ${cfg.color} ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 font-bold ${cfg.color}`}>{row.volScore}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{row.spreadPips > 0 ? row.spreadPips.toFixed(1) : "—"}</td>
                    <td className={`px-4 py-2.5 font-mono font-semibold ${row.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {row.changePct !== 0 ? `${row.changePct >= 0 ? "+" : ""}${row.changePct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-cyan-400 font-bold">{row.signalCount || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export { AIVolatilityRadar };
