import { create } from "zustand";
import { PortfolioAPI, type PortfolioPosition, type TradeStats } from "../api/endpoints/portfolio";
import { wsClient } from "../api/websocket";

type PortfolioState = {
  positions: PortfolioPosition[];
  tradeStats: TradeStats | null;
  loading: boolean;
  statsLoading: boolean;
  error: string | null;
  lastFetchAt: string | null;

  // Actions
  fetchPositions: () => Promise<void>;
  fetchTradeStats: () => Promise<void>;
  upsertPosition: (position: PortfolioPosition) => void;
  removePosition: (positionId: string) => void;
  updatePositionMark: (positionId: string, markPrice: number, pnl: number, pnlPercent?: number) => void;
  clearError: () => void;

  // WebSocket lifecycle
  subscribeWs: () => () => void;

  // Computed
  getTotalUnrealizedPnL: () => number;
  getTotalMarginUsed: () => number;
  getTotalNotional: () => number;
  getPositionBySymbol: (symbol: string) => PortfolioPosition | undefined;
};

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  positions: [],
  tradeStats: null,
  loading: false,
  statsLoading: false,
  error: null,
  lastFetchAt: null,

  fetchPositions: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const positions = await PortfolioAPI.getPositions();
      set({ positions, lastFetchAt: new Date().toISOString() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch positions" });
    } finally {
      set({ loading: false });
    }
  },

  fetchTradeStats: async () => {
    set({ statsLoading: true });
    try {
      const tradeStats = await PortfolioAPI.getTradeStats();
      set({ tradeStats });
    } catch {
      // Non-fatal — stats are supplementary
    } finally {
      set({ statsLoading: false });
    }
  },

  upsertPosition: (position) => {
    set((state) => {
      const exists = state.positions.some((p) => p.id === position.id);
      if (exists) {
        return { positions: state.positions.map((p) => (p.id === position.id ? position : p)) };
      }
      return { positions: [position, ...state.positions] };
    });
  },

  removePosition: (positionId) => {
    set((state) => ({
      positions: state.positions.filter((p) => p.id !== positionId),
    }));
  },

  updatePositionMark: (positionId, markPrice, pnl, pnlPercent) => {
    set((state) => ({
      positions: state.positions.map((p) =>
        p.id === positionId
          ? { ...p, markPrice, pnl, ...(pnlPercent !== undefined ? { pnlPercent } : {}) }
          : p,
      ),
    }));
  },

  clearError: () => set({ error: null }),

  subscribeWs: () => {
    const unsubOpened = wsClient.on("position.opened", (payload) => {
      const p = payload as PortfolioPosition;
      if (p?.id) get().upsertPosition(p);
    });

    const unsubClosed = wsClient.on("position.closed", (payload) => {
      const p = payload as { positionId?: string; id?: string };
      const id = p?.positionId ?? p?.id;
      if (id) get().removePosition(id);
    });

    const unsubPnl = wsClient.on("position.pnl_updated", (payload) => {
      const p = payload as {
        positionId?: string;
        markPrice?: number;
        pnl?: number;
        pnlPercent?: number;
      };
      if (p?.positionId && p.markPrice !== undefined && p.pnl !== undefined) {
        get().updatePositionMark(p.positionId, p.markPrice, p.pnl, p.pnlPercent);
      }
    });

    const unsubConnected = wsClient.on("ws.connected", () => {
      void get().fetchPositions();
    });

    return () => {
      unsubOpened();
      unsubClosed();
      unsubPnl();
      unsubConnected();
    };
  },

  getTotalUnrealizedPnL: () =>
    get().positions.reduce((sum, p) => sum + (p.pnl ?? 0), 0),

  getTotalMarginUsed: () =>
    get().positions.reduce((sum, p) => sum + (p.marginUsed ?? 0), 0),

  getTotalNotional: () =>
    get().positions.reduce((sum, p) => sum + p.quantity * p.markPrice, 0),

  getPositionBySymbol: (symbol) =>
    get().positions.find((p) => p.symbol === symbol),
}));
