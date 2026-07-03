import { useCallback } from "react";
import { useMarketStore, type Quote, type Instrument } from "../store/market.store";

export type { Quote, Instrument };

export type RealtimeMarketHook = {
  /** All live quotes as an array, sorted by watchlist order then alphabetically. */
  quotes: Quote[];
  /** Raw quotes map keyed by symbol for O(1) lookups. */
  quotesMap: Record<string, Quote>;
  /** Ordered list of symbols in the user watchlist. */
  watchlist: string[];
  /** Currently selected symbol (e.g. for the chart). */
  selectedSymbol: string;
  /** Whether the WebSocket stream is currently connected. */
  connected: boolean;
  /** ISO timestamp of last quote update, or null if no update received. */
  lastUpdateAt: string | null;
  /** Known tradeable instruments. */
  instruments: Instrument[];
  /** Get a single quote by symbol — undefined if not yet received. */
  getQuote: (symbol: string) => Quote | undefined;
  /** Get the mid price for a symbol — 0 if not yet received. */
  getMid: (symbol: string) => number;
  /** Change the selected symbol (updates the store, re-renders subscribers). */
  setSelectedSymbol: (symbol: string) => void;
  /** Replace the watchlist. */
  setWatchlist: (symbols: string[]) => void;
};

export function useRealtimeMarket(): RealtimeMarketHook {
  const quotesMap        = useMarketStore((s) => s.quotes);
  const watchlist        = useMarketStore((s) => s.watchlist);
  const selectedSymbol   = useMarketStore((s) => s.selectedSymbol);
  const connected        = useMarketStore((s) => s.connected);
  const lastUpdateAt     = useMarketStore((s) => s.lastUpdateAt);
  const instruments      = useMarketStore((s) => s.instruments);
  const setSelectedSymbol = useMarketStore((s) => s.setSelectedSymbol);
  const setWatchlist     = useMarketStore((s) => s.setWatchlist);
  const storeGetQuote    = useMarketStore((s) => s.getQuote);
  const storeGetMid      = useMarketStore((s) => s.getMid);

  // Stable references — these Zustand-bound functions are already stable,
  // but wrapping them guarantees the contract even if the store changes.
  const getQuote = useCallback((symbol: string) => storeGetQuote(symbol), [storeGetQuote]);
  const getMid   = useCallback((symbol: string) => storeGetMid(symbol),   [storeGetMid]);

  // Sort: watchlist symbols first (in order), then remaining alphabetically.
  const quotes = (() => {
    const all = Object.values(quotesMap);
    const wlSet = new Set(watchlist);
    const inWl  = watchlist.map((s) => quotesMap[s]).filter(Boolean) as Quote[];
    const rest  = all.filter((q) => !wlSet.has(q.symbol)).sort((a, b) => a.symbol.localeCompare(b.symbol));
    return [...inWl, ...rest];
  })();

  return {
    quotes,
    quotesMap,
    watchlist,
    selectedSymbol,
    connected,
    lastUpdateAt,
    instruments,
    getQuote,
    getMid,
    setSelectedSymbol,
    setWatchlist,
  };
}

export default useRealtimeMarket;
