/**
 * AI Trade Scanner — Live scanner of trading opportunities across all instruments
 */
import { useEffect, useState } from "react";
import { ScanLine, TrendingUp, TrendingDown, Minus, Filter, ArrowUpDown } from "lucide-react";
import { useAiStore } from "../../store/ai.store";
import { useMarketStore } from "../../store/market.store";

type SortKey = "confidence" | "changePct" | "symbol";
type SortDir = "asc" | "desc";

type ScanRow = {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  changePct: number;
  signalType: "BUY" | "SELL" | "HOLD" | "NONE";
  confidence: number;
  horizon: string;
};

const ALL_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US500", "BTCUSD", "GBPJPY", "USDCHF", "AUDUSD", "NZDUSD", "EURJPY", "USDCAD"];

export default function AITradeScanner() {
  const signals = useAiStore((s) => s.signals);
  const fetchSignals = useAiStore((s) => s.fetchSignals);
  const subscribeWsAi = useAiStore((s) => s.subscribeWs);

  const quotes = useMarketStore((s) => s.quotes);
  const fetchQuotes = useMarketStore((s) => s.fetchQuotes);
  const subscribeWsMarket = useMarketStore((s) => s.subscribeWs);

  const [filterType, setFilterType] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [minConf, setMinConf] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    void fetchSignals();
    void fetchQuotes();
    const unsubAi = subscribeWsAi();
    const unsubMarket = subscribeWsMarket();
    return () => { unsubAi(); unsubMarket(); };
  }, [fetchSignals, fetchQuotes, subscribeWsAi, subscribeWsMarket]);

  const activeSignals = signals.filter((s) => s.status === "ACTIVE");

  // Build scan rows: merge quotes with signals
  const signalSymbols = [...new Set(activeSignals.map((s) => s.symbol))];
  const allSymbols = [...new Set([...ALL_SYMBOLS, ...signalSymbols])];

  const rows: ScanRow[] = allSymbols.map((sym) => {
    const quote = quotes[sym];
    const symSigs = activeSignals.filter((s) => s.symbol === sym).sort((a, b) => b.confidence - a.confidence);
    const topSig = symSigs[0];

    return {
      symbol: sym,
      bid: quote?.bid ?? 0,
      ask: quote?.ask ?? 0,
      mid: quote?.mid ?? 0,
      changePct: quote?.changePct ?? 0,
      signalType: topSig ? (topSig.signalType as "BUY" | "SELL" | "HOLD") : "NONE",
      confidence: topSig?.confidence ?? 0,
      horizon: topSig?.timeframe ?? "—",
    };
  });

  // Filters
  const filtered = rows.filter((r) => {
    if (filterType === "BUY" && r.signalType !== "BUY") return false;
    if (filterType === "SELL" && r.signalType !== "SELL") return false;
    if (minConf > 0 && r.confidence < minConf) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortKey === "confidence") diff = a.confidence - b.confidence;
    else if (sortKey === "changePct") diff = a.changePct - b.changePct;
    else diff = a.symbol.localeCompare(b.symbol);
    return sortDir === "desc" ? -diff : diff;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const formatPrice = (sym: string, price: number) => {
    if (price === 0) return "—";
    if (sym.includes("JPY")) return price.toFixed(3);
    if (sym.includes("BTC")) return price.toFixed(0);
    return price.toFixed(5);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <ScanLine className="text-cyan-400" size={20} />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
        </div>
        <h1 className="text-2xl font-bold text-white">AI Trade Scanner</h1>
        <p className="text-slate-400 mt-1">Scanner opportunità in tempo reale su tutti gli strumenti</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{rows.filter((r) => r.signalType === "BUY").length}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Opportunità BUY</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-rose-400">{rows.filter((r) => r.signalType === "SELL").length}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Opportunità SELL</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{rows.filter((r) => r.confidence >= 70).length}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Alta Confidence</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {(["ALL", "BUY", "SELL"] as const).map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${filterType === t ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-400 hover:border-slate-600"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400" />
          <span className="text-[11px] text-slate-400">Min confidence:</span>
          <div className="flex gap-1">
            {[0, 40, 60, 75].map((v) => (
              <button key={v} onClick={() => setMinConf(v)}
                className={`rounded px-2.5 py-1 text-[11px] font-bold transition ${minConf === v ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-400"}`}>
                {v > 0 ? `${v}%+` : "All"}
              </button>
            ))}
          </div>
        </div>
        <span className="ml-auto text-[11px] text-slate-500 self-center">{sorted.length} strumenti</span>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-5 py-3 text-left">
                  <button onClick={() => toggleSort("symbol")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                    Simbolo <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Prezzo</th>
                <th className="px-5 py-3 text-right">
                  <button onClick={() => toggleSort("changePct")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 ml-auto">
                    Var% <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">Segnale AI</th>
                <th className="px-5 py-3 text-right">
                  <button onClick={() => toggleSort("confidence")} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 ml-auto">
                    Confidence <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">Orizzonte</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const pos = row.changePct >= 0;
                const hasSignal = row.signalType !== "NONE";
                return (
                  <tr key={row.symbol} className={`border-t border-slate-800/40 hover:bg-slate-800/20 transition ${hasSignal && row.confidence >= 70 ? "bg-cyan-400/2" : ""}`}>
                    <td className="px-5 py-3">
                      <span className="font-bold text-white">{row.symbol}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-300">
                      {row.mid > 0 ? formatPrice(row.symbol, row.mid) : "—"}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold font-mono ${pos ? "text-emerald-400" : "text-rose-400"}`}>
                      {row.changePct !== 0 ? `${pos ? "+" : ""}${row.changePct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {row.signalType === "BUY" && (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                          <TrendingUp size={9} /> BUY
                        </span>
                      )}
                      {row.signalType === "SELL" && (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-rose-500/15 text-rose-400">
                          <TrendingDown size={9} /> SELL
                        </span>
                      )}
                      {row.signalType === "HOLD" && (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-slate-700/60 text-slate-400">
                          <Minus size={9} /> HOLD
                        </span>
                      )}
                      {row.signalType === "NONE" && (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.confidence > 0 ? (
                        <span className={`font-bold text-sm ${row.confidence >= 70 ? "text-emerald-400" : row.confidence >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                          {row.confidence.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center text-[11px] text-slate-500">
                      {row.horizon !== "—" ? row.horizon : "—"}
                    </td>
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

export { AITradeScanner };
