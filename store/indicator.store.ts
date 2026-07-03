import { create } from "zustand";
import { IndicatorsAPI, type IndicatorSnapshot } from "../api/endpoints/indicators";
import { wsClient } from "../api/websocket";

type IndicatorState = {
  snapshots: Record<string, IndicatorSnapshot>;
  selectedSymbol: string;
  selectedTimeframe: string;
  loading: boolean;
  error: string | null;
  lastFetchAt: string | null;
  autoRefreshEnabled: boolean;

  // Actions
  fetchSnapshot: (symbol?: string, timeframe?: string) => Promise<void>;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  setAutoRefresh: (enabled: boolean) => void;
  clearError: () => void;

  // WebSocket lifecycle
  subscribeWs: () => () => void;

  // Selectors
  getCurrentSnapshot: () => IndicatorSnapshot | null;
  getSnapshotFor: (symbol: string, timeframe?: string) => IndicatorSnapshot | null;
  getOverallSignal: () => "BUY" | "SELL" | "NEUTRAL";
};

const SUPPORTED_TIMEFRAMES = ["1M", "5M", "15M", "30M", "1H", "4H", "1D"];

export const useIndicatorStore = create<IndicatorState>((set, get) => {
  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  return {
    snapshots: {},
    selectedSymbol: "EURUSD",
    selectedTimeframe: "15M",
    loading: false,
    error: null,
    lastFetchAt: null,
    autoRefreshEnabled: true,

    fetchSnapshot: async (symbol, timeframe) => {
      const sym = symbol ?? get().selectedSymbol;
      const tf  = timeframe ?? get().selectedTimeframe;

      set({ loading: true, error: null });
      try {
        const snapshot = await IndicatorsAPI.getSnapshot(sym, tf);
        if (snapshot) {
          const key = `${sym}:${tf}`;
          set((state) => ({
            snapshots: { ...state.snapshots, [key]: snapshot },
            lastFetchAt: new Date().toISOString(),
          }));
        }
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Failed to fetch indicators" });
      } finally {
        set({ loading: false });
      }
    },

    setSelectedSymbol: (selectedSymbol) => {
      set({ selectedSymbol });
      void get().fetchSnapshot(selectedSymbol, get().selectedTimeframe);
    },

    setSelectedTimeframe: (selectedTimeframe) => {
      if (!SUPPORTED_TIMEFRAMES.includes(selectedTimeframe)) return;
      set({ selectedTimeframe });
      void get().fetchSnapshot(get().selectedSymbol, selectedTimeframe);
    },

    setAutoRefresh: (autoRefreshEnabled) => {
      set({ autoRefreshEnabled });
      if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = undefined; }
      if (autoRefreshEnabled) {
        refreshTimer = setInterval(() => {
          void get().fetchSnapshot();
        }, 30_000);
      }
    },

    clearError: () => set({ error: null }),

    subscribeWs: () => {
      // Refresh indicators when new market quotes arrive (throttled — 30s in auto-refresh)
      // On connect, fetch immediately
      const unsubConnected = wsClient.on("ws.connected", () => {
        void get().fetchSnapshot();
        // Also start auto-refresh
        get().setAutoRefresh(true);
      });

      const unsubDisconnected = wsClient.on("ws.closed", () => {
        if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = undefined; }
      });

      return () => {
        unsubConnected();
        unsubDisconnected();
        if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = undefined; }
      };
    },

    getCurrentSnapshot: () => {
      const key = `${get().selectedSymbol}:${get().selectedTimeframe}`;
      return get().snapshots[key] ?? null;
    },

    getSnapshotFor: (symbol, timeframe) => {
      const tf  = timeframe ?? get().selectedTimeframe;
      const key = `${symbol}:${tf}`;
      return get().snapshots[key] ?? null;
    },

    getOverallSignal: () => {
      const snapshot = get().getCurrentSnapshot();
      return snapshot?.summary?.overallSignal ?? "NEUTRAL";
    },
  };
});
