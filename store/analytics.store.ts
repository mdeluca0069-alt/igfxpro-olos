import { create } from "zustand";
import { PortfolioAPI, type TradeStats } from "../api/endpoints/portfolio";

export type PnLDataPoint = {
  date: string;
  pnl: number;
  cumulativePnl: number;
};

export type PerformanceMetrics = {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
};

type AnalyticsState = {
  tradeStats: TradeStats | null;
  pnlHistory: PnLDataPoint[];
  performanceMetrics: PerformanceMetrics | null;
  loading: boolean;
  error: string | null;
  lastFetchAt: string | null;
  periodDays: 7 | 30 | 90 | 365;

  // Actions
  fetchAll: () => Promise<void>;
  fetchTradeStats: () => Promise<void>;
  setPeriod: (days: 7 | 30 | 90 | 365) => void;
  clearError: () => void;
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  tradeStats: null,
  pnlHistory: [],
  performanceMetrics: null,
  loading: false,
  error: null,
  lastFetchAt: null,
  periodDays: 30,

  fetchAll: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [statsResult, historyResult] = await Promise.allSettled([
        PortfolioAPI.getTradeStats(),
        PortfolioAPI.getTradeHistory({ limit: 200 }),
      ]);

      const tradeStats = statsResult.status === "fulfilled" ? statsResult.value : null;

      // Build PnL history from trade history
      let pnlHistory: PnLDataPoint[] = [];
      if (historyResult.status === "fulfilled") {
        const history = historyResult.value;
        let cumulative = 0;
        pnlHistory = history
          .filter((t) => t.realizedPnl !== undefined && t.closedAt)
          .sort((a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime())
          .map((t) => {
            cumulative += t.realizedPnl ?? 0;
            return {
              date: t.closedAt!,
              pnl: t.realizedPnl ?? 0,
              cumulativePnl: cumulative,
            };
          });
      }

      // Compute performance metrics from trade stats
      let performanceMetrics: PerformanceMetrics | null = null;
      if (tradeStats) {
        const { winRate, avgPnl, totalPnl, totalTrades, bestTrade, worstTrade } = tradeStats;
        const profitFactor =
          worstTrade !== 0 ? Math.abs(bestTrade) / Math.abs(worstTrade) : 0;
        performanceMetrics = {
          totalReturn: totalPnl,
          sharpeRatio: avgPnl > 0 ? avgPnl / Math.abs(worstTrade || 1) : 0,
          maxDrawdown: worstTrade,
          winRate,
          profitFactor,
          avgWin: bestTrade,
          avgLoss: worstTrade,
          totalTrades,
        };
      }

      set({
        tradeStats,
        pnlHistory,
        performanceMetrics,
        lastFetchAt: new Date().toISOString(),
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load analytics" });
    } finally {
      set({ loading: false });
    }
  },

  fetchTradeStats: async () => {
    try {
      const tradeStats = await PortfolioAPI.getTradeStats();
      set({ tradeStats });
    } catch {
      // Non-fatal
    }
  },

  setPeriod: (periodDays) => {
    set({ periodDays });
    void get().fetchAll();
  },

  clearError: () => set({ error: null }),
}));

