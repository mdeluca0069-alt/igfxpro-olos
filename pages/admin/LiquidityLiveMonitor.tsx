/**
 * LiquidityLiveMonitor — Live quotes from API with 2s refresh, grouped by asset class
 */
import { useQuery } from "@tanstack/react-query";
import { Radio, RefreshCw } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { number } from "../../shared/utils/format";

type Quote = {
  symbol: string; bid: number; ask: number; mid: number; spread: number; changePct?: number;
};

type AssetClass = "Forex" | "Crypto" | "Commodities" | "Indices";

function classify(symbol: string): AssetClass {
  if (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("XRP")) return "Crypto";
  if (symbol.includes("XAU") || symbol.includes("WTI") || symbol.includes("BRENT")) return "Commodities";
  if (symbol.startsWith("US") || symbol.startsWith("DE") || symbol.startsWith("UK") || symbol.startsWith("JP")) return "Indices";
  return "Forex";
}

const CLASS_ORDER: AssetClass[] = ["Forex", "Crypto", "Commodities", "Indices"];


function QuoteRow({ q }: { q: Quote }) {
  const up = (q.changePct ?? 0) >= 0;
  return (
    <tr className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
      <td className="px-4 py-3 font-bold text-white">{q.symbol}</td>
      <td className="px-4 py-3 font-mono text-rose-300">{number(q.bid, 5)}</td>
      <td className="px-4 py-3 font-mono text-emerald-300">{number(q.ask, 5)}</td>
      <td className="px-4 py-3 font-mono text-slate-400">{number(q.mid, 5)}</td>
      <td className="px-4 py-3 font-mono text-[12px] text-slate-500">{number(q.spread, 5)}</td>
      <td className="px-4 py-3">
        <span className={`text-[12px] font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>
          {up ? "+" : ""}{(q.changePct ?? 0).toFixed(2)}%
        </span>
      </td>
    </tr>
  );
}

export function LiquidityLiveMonitor() {
  const quotesQ = useQuery<Quote[]>({
    queryKey: ["admin", "liquidity", "live"],
    queryFn: () => apiGet("/api/v1/trading/quotes", "admin"),
    staleTime: 2_000,
    refetchInterval: 2_000,
  });

  if (quotesQ.isError || (quotesQ.isFetched && (!quotesQ.data || quotesQ.data.length === 0))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-8 py-6 text-center">
          <p className="text-sm font-bold text-rose-400">Live feed unavailable</p>
          <p className="mt-1 text-[12px] text-slate-500">Market data API is not responding. No fallback prices are shown.</p>
        </div>
      </div>
    );
  }

  const quotes = quotesQ.data ?? [];

  const groups = CLASS_ORDER.reduce<Record<AssetClass, Quote[]>>(
    (acc, cls) => { acc[cls] = []; return acc; },
    {} as Record<AssetClass, Quote[]>
  );

  for (const q of quotes) {
    const cls = classify(q.symbol);
    groups[cls].push(q);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-emerald-400 animate-pulse" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Liquidity Live Monitor</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
            </span>
            <button
              type="button"
              onClick={() => quotesQ.refetch()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[12px] text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              <RefreshCw size={12} className={quotesQ.isFetching ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-5 p-6">
        {CLASS_ORDER.map((cls) => {
          const rows = groups[cls];
          if (rows.length === 0) return null;
          return (
            <div key={cls} className="overflow-x-auto rounded-xl border border-slate-800">
              <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{cls}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/50 bg-slate-900/30 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    {["Symbol", "Bid", "Ask", "Mid", "Spread", "Change"].map((h) => (
                      <th key={h} className="px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((q) => <QuoteRow key={q.symbol} q={q} />)}
                </tbody>
              </table>
            </div>
          );
        })}
      </main>
    </div>
  );
}

export default LiquidityLiveMonitor;
