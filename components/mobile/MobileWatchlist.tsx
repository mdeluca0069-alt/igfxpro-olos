import { memo, useEffect } from "react";
import { TrendingUp, TrendingDown, Wifi, WifiOff } from "lucide-react";
import { useMarketStore } from "../../store/market.store";
import { priceDigits } from "../../shared/utils/format";

interface Props {
  onSymbolSelect?: (symbol: string) => void;
}

function QuoteRow({
  symbol,
  onSelect,
}: {
  symbol:   string;
  onSelect?: (sym: string) => void;
}) {
  const quote  = useMarketStore((s) => s.getQuote(symbol));
  const digits = priceDigits(symbol);
  const isUp   = (quote?.changePct ?? 0) >= 0;

  if (!quote) {
    return (
      <div className="flex items-center justify-between px-4 py-3 opacity-40">
        <span className="text-[13px] font-bold text-slate-400">{symbol}</span>
        <span className="font-mono text-[12px] text-slate-600">—</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect?.(symbol)}
      aria-label={`${symbol}, ${isUp ? "up" : "down"} ${quote.changePct.toFixed(2)}%, bid ${quote.bid.toFixed(digits)}`}
      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-slate-800/60"
    >
      {/* Left: symbol + change */}
      <div className="flex items-center gap-2">
        <span className={[
          "flex h-6 w-6 items-center justify-center rounded-md",
          isUp ? "bg-emerald-500/10" : "bg-rose-500/10",
        ].join(" ")}>
          {isUp
            ? <TrendingUp  size={12} className="text-emerald-400" />
            : <TrendingDown size={12} className="text-rose-400" />}
        </span>
        <div>
          <p className="text-[13px] font-black text-white">{symbol}</p>
          <p className={`text-[10px] font-semibold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
            {isUp ? "+" : ""}{quote.changePct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Right: bid/ask */}
      <div className="text-right">
        <p className="font-mono text-[14px] font-bold tabular-nums text-white">
          {quote.bid.toFixed(digits)}
        </p>
        <p className="font-mono text-[10px] tabular-nums text-slate-500">
          {quote.ask.toFixed(digits)}
        </p>
      </div>
    </button>
  );
}

export const MobileWatchlist = memo(function MobileWatchlist({ onSymbolSelect }: Props) {
  const watchlist  = useMarketStore((s) => s.watchlist);
  const connected  = useMarketStore((s) => s.connected);
  const subscribeWs = useMarketStore((s) => s.subscribeWs);

  useEffect(() => {
    const unsub = subscribeWs();
    return unsub;
  }, [subscribeWs]);

  return (
    <div className="flex flex-col bg-[#050a0f] md:hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-[13px] font-black uppercase tracking-[0.12em] text-white">
          Watchlist
        </h2>
        <div className={[
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
          connected
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-slate-800 text-slate-500",
        ].join(" ")}>
          {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
          {connected ? "Live" : "Offline"}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/60">
        {watchlist.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-slate-600">
            No symbols in watchlist
          </p>
        ) : (
          watchlist.map((sym) => (
            <QuoteRow key={sym} symbol={sym} onSelect={onSymbolSelect} />
          ))
        )}
      </div>
    </div>
  );
});

export default MobileWatchlist;
