import { create } from "zustand";
import { wsClient } from "../api/websocket";
import { MarketsAPI } from "../api/endpoints/markets";
import type { QuoteRow, InstrumentRow } from "../api/endpoints/markets";

export type Quote = QuoteRow;
export type Instrument = InstrumentRow & { session: string };

type MarketState = {
  quotes:          Record<string, Quote>;
  instruments:     Instrument[];
  watchlist:       string[];
  selectedSymbol:  string;
  connected:       boolean;
  lastUpdateAt:    string | null;
  instrumentsLoaded: boolean;

  // Setters
  setQuote:          (quote: Quote) => void;
  setQuotes:         (quotes: Quote[]) => void;
  setInstruments:    (instruments: Instrument[]) => void;
  setWatchlist:      (symbols: string[]) => void;
  addToWatchlist:    (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setSelectedSymbol: (symbol: string) => void;
  setConnected:      (connected: boolean) => void;

  // API actions
  fetchInstruments: () => Promise<void>;
  fetchQuotes:      () => Promise<void>;

  // WebSocket
  subscribeWs: () => () => void;

  // Computed
  getQuote:     (symbol: string) => Quote | undefined;
  getMid:       (symbol: string) => number;
  getBid:       (symbol: string) => number;
  getAsk:       (symbol: string) => number;
  getSpread:    (symbol: string) => number;
};

export const useMarketStore = create<MarketState>((set, get) => ({
  quotes:            {},
  instruments:       [],
  watchlist:         ["EURUSD", "XAUUSD", "US500", "BTCUSD"],
  selectedSymbol:    "EURUSD",
  connected:         false,
  lastUpdateAt:      null,
  instrumentsLoaded: false,

  setQuote: (quote) =>
    set((state) => ({
      quotes:       { ...state.quotes, [quote.symbol]: quote },
      lastUpdateAt: new Date().toISOString(),
    })),

  setQuotes: (quotes) =>
    set((state) => {
      const next = { ...state.quotes };
      for (const q of quotes) next[q.symbol] = q;
      return { quotes: next, lastUpdateAt: new Date().toISOString() };
    }),

  setInstruments:    (instruments) => set({ instruments, instrumentsLoaded: true }),
  setWatchlist:      (watchlist)   => set({ watchlist }),
  setConnected:      (connected)   => set({ connected }),
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),

  addToWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.includes(symbol)
        ? state.watchlist
        : [...state.watchlist, symbol],
    })),

  removeFromWatchlist: (symbol) =>
    set((state) => ({ watchlist: state.watchlist.filter((s) => s !== symbol) })),

  // ── API actions ────────────────────────────────────────────────────────────────

  fetchInstruments: async () => {
    if (get().instrumentsLoaded) return;
    try {
      const data = await MarketsAPI.getInstruments();
      if (data.length > 0) get().setInstruments(data as Instrument[]);
    } catch { /* non-fatal */ }
  },

  fetchQuotes: async () => {
    try {
      const data = await MarketsAPI.getQuotes();
      if (data.length > 0) get().setQuotes(data);
    } catch { /* non-fatal: WS stream is primary source */ }
  },

  // ── WebSocket subscription ─────────────────────────────────────────────────────

  subscribeWs: () => {
    // Real-time quote stream
    const unsubQuote = wsClient.on("quote", (payload) => {
      const q = payload as Record<string, unknown>;
      if (q?.symbol && typeof q.bid === "number") {
        get().setQuote({
          symbol:    String(q.symbol),
          bid:       Number(q.bid),
          ask:       Number(q.ask ?? q.bid),
          mid:       Number(q.mid ?? q.bid),
          spread:    Number(q.spread ?? 0),
          changePct: Number(q.changePct ?? 0),
          ts:        String(q.ts ?? new Date().toISOString()),
        });
      }
    });

    // Bulk quote tick (sent by backend every second)
    const unsubTick = wsClient.on("market.quotes", (payload) => {
      const quotes = Array.isArray(payload) ? payload : [];
      for (const q of quotes as Record<string, unknown>[]) {
        if (q?.symbol) {
          get().setQuote({
            symbol:    String(q.symbol),
            bid:       Number(q.bid ?? 0),
            ask:       Number(q.ask ?? 0),
            mid:       Number(q.mid ?? 0),
            spread:    Number(q.spread ?? 0),
            changePct: Number(q.changePct ?? 0),
            ts:        String(q.ts ?? new Date().toISOString()),
          });
        }
      }
    });

    const unsubConnected = wsClient.on("ws.connected", () => {
      set({ connected: true });
      // Fallback REST fetch if WS was down
      void get().fetchQuotes();
      void get().fetchInstruments();
    });

    const unsubDisconnected = wsClient.on("ws.closed", () => {
      set({ connected: false });
    });

    return () => {
      unsubQuote();
      unsubTick();
      unsubConnected();
      unsubDisconnected();
    };
  },

  // ── Computed ───────────────────────────────────────────────────────────────────

  getQuote:  (symbol) => get().quotes[symbol],
  getMid:    (symbol) => get().quotes[symbol]?.mid  ?? 0,
  getBid:    (symbol) => get().quotes[symbol]?.bid  ?? 0,
  getAsk:    (symbol) => get().quotes[symbol]?.ask  ?? 0,
  getSpread: (symbol) => get().quotes[symbol]?.spread ?? 0,
}));
