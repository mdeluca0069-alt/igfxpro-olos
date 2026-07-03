import { create } from "zustand";
import { SignalsAPI, type OlosSignal, type AiConfidence } from "../api/endpoints/signals";
import { wsClient } from "../api/websocket";

type AiState = {
  signals: OlosSignal[];
  confidence: AiConfidence | null;
  loading: boolean;
  error: string | null;
  lastFetchAt: string | null;
  filterSymbol: string | null;

  // Actions
  fetchSignals: (symbol?: string) => Promise<void>;
  fetchConfidence: () => Promise<void>;
  addSignal: (signal: OlosSignal) => void;
  setFilterSymbol: (symbol: string | null) => void;
  clearError: () => void;

  // WebSocket lifecycle
  subscribeWs: () => () => void;

  // Selectors
  getActiveSignals: () => OlosSignal[];
  getSignalsBySymbol: (symbol: string) => OlosSignal[];
  getTopSignal: () => OlosSignal | null;
  getOverallConfidenceScore: () => number;
};

export const useAiStore = create<AiState>((set, get) => ({
  signals: [],
  confidence: null,
  loading: false,
  error: null,
  lastFetchAt: null,
  filterSymbol: null,

  fetchSignals: async (symbol) => {
    set({ loading: true, error: null });
    try {
      const [active, legacy] = await Promise.allSettled([
        SignalsAPI.getActiveSignals(symbol ? { symbol } : undefined),
        SignalsAPI.getLegacySignals(),
      ]);

      const activeSignals = active.status === "fulfilled" ? active.value : [];
      const legacySignals = legacy.status === "fulfilled" ? legacy.value : [];

      // Merge: prefer active over legacy; deduplicate by id
      const merged = [...activeSignals];
      for (const sig of legacySignals) {
        if (!merged.some((s) => s.id === sig.id)) merged.push(sig);
      }
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      set({ signals: merged, lastFetchAt: new Date().toISOString() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch signals" });
    } finally {
      set({ loading: false });
    }
  },

  fetchConfidence: async () => {
    try {
      const confidence = await SignalsAPI.getAiConfidence();
      set({ confidence });
    } catch {
      // Non-fatal
    }
  },

  addSignal: (signal) => {
    set((state) => {
      const exists = state.signals.some((s) => s.id === signal.id);
      if (exists) return state;
      return {
        signals: [signal, ...state.signals].slice(0, 200),
        lastFetchAt: new Date().toISOString(),
      };
    });
  },

  setFilterSymbol: (filterSymbol) => set({ filterSymbol }),

  clearError: () => set({ error: null }),

  subscribeWs: () => {
    const unsubSignal = wsClient.on("signal.generated", (payload) => {
      const signal = payload as OlosSignal;
      if (signal?.id && signal?.symbol) {
        get().addSignal(signal);
        // Refresh confidence score when a new signal arrives
        void get().fetchConfidence();
      }
    });

    const unsubConnected = wsClient.on("ws.connected", () => {
      void get().fetchSignals();
      void get().fetchConfidence();
    });

    return () => {
      unsubSignal();
      unsubConnected();
    };
  },

  getActiveSignals: () =>
    get().signals.filter((s) => s.status === "ACTIVE"),

  getSignalsBySymbol: (symbol) =>
    get().signals.filter((s) => s.symbol === symbol),

  getTopSignal: () => {
    const active = get().getActiveSignals();
    if (!active.length) return null;
    return active.reduce((best, s) => (s.confidence > best.confidence ? s : best), active[0]);
  },

  getOverallConfidenceScore: () => {
    const c = get().confidence;
    if (c && c.score != null) return c.score;
    const active = get().getActiveSignals();
    if (!active.length) return 0;
    return active.reduce((sum, s) => sum + s.confidence, 0) / active.length / 100;
  },
}));
