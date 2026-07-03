import { useQuery } from "@tanstack/react-query";
import { Layers3 } from "lucide-react";
import { TradingAPI } from "../../api/endpoints/trading";
import type { LiquidityBook } from "../../shared/types/trading";

export interface OrderBookProps {
  symbol?: string;
  book?: LiquidityBook;
  className?: string;
}

function formatPrice(symbol: string, value: number) {
  const digits = symbol === "EURUSD" ? 5 : symbol.includes("JPY") ? 3 : 2;
  return value.toLocaleString("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function BookSide({ symbol, rows, tone }: { symbol: string; rows: LiquidityBook["bids"]; tone: "bid" | "ask" }) {
  const maxVolume = Math.max(...rows.map((row) => row.volume), 1);
  const color = tone === "bid" ? "bg-emerald-400/14 text-emerald-200" : "bg-rose-400/14 text-rose-200";

  return (
    <div className="space-y-1">
      {rows.map((row) => (
        <div key={`${tone}-${row.price}`} className={`relative overflow-hidden rounded px-3 py-2 font-mono text-xs ${color}`}>
          <div
            className={tone === "bid" ? "absolute inset-y-0 right-0 bg-emerald-400/14" : "absolute inset-y-0 left-0 bg-rose-400/14"}
            style={{ width: `${Math.max(8, (row.volume / maxVolume) * 100)}%` }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <span>{formatPrice(symbol, row.price)}</span>
            <span>{row.volume.toFixed(3)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderBook({ symbol = "EURUSD", book, className = "" }: OrderBookProps) {
  const query = useQuery({
    queryKey: ["liquidity-book", symbol],
    queryFn: () => TradingAPI.getLiquidityBook(symbol),
    refetchInterval: 1000,
    enabled: !book,
  });
  const activeBook = book ?? query.data;

  return (
    <section className={["rounded-lg border border-slate-800 bg-slate-950/82 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.2)]", className].filter(Boolean).join(" ")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">IGFX internal LP</p>
          <h3 className="mt-1 text-sm font-semibold text-white">Order book {symbol}</h3>
        </div>
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200"><Layers3 size={18} /></div>
      </div>

      {!activeBook ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Loading live order book…</div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded bg-slate-900 p-2"><div className="text-slate-500">Bid</div><div className="font-mono text-emerald-300">{formatPrice(activeBook.symbol, activeBook.bid)}</div></div>
            <div className="rounded bg-slate-900 p-2"><div className="text-slate-500">Spread</div><div className="font-mono text-cyan-200">{activeBook.spreadBps} bps</div></div>
            <div className="rounded bg-slate-900 p-2"><div className="text-slate-500">Ask</div><div className="font-mono text-rose-300">{formatPrice(activeBook.symbol, activeBook.ask)}</div></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300">Ask</div><BookSide symbol={activeBook.symbol} rows={activeBook.asks} tone="ask" /></div>
            <div><div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Bid</div><BookSide symbol={activeBook.symbol} rows={activeBook.bids} tone="bid" /></div>
          </div>
        </>
      )}
    </section>
  );
}

export default OrderBook;
