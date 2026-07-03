import { getApiClient } from "../httpClient";

export type PortfolioPosition = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent: number;
  marginUsed: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: string;
};

export type TradeHistoryEntry = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  realizedPnl?: number;
  fees?: number;
  openedAt: string;
  closedAt?: string;
  status: string;
};

function n(v: unknown): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function coercePosition(p: PortfolioPosition): PortfolioPosition {
  return {
    ...p,
    quantity:   n(p.quantity),
    entryPrice: n(p.entryPrice),
    markPrice:  n(p.markPrice),
    pnl:        n(p.pnl),
    pnlPercent: n(p.pnlPercent),
    marginUsed: n(p.marginUsed),
    leverage:   n(p.leverage),
    ...(p.stopLoss   != null ? { stopLoss:   n(p.stopLoss)   } : {}),
    ...(p.takeProfit != null ? { takeProfit: n(p.takeProfit) } : {}),
  };
}

function coerceTrade(t: TradeHistoryEntry): TradeHistoryEntry {
  return {
    ...t,
    quantity:    n(t.quantity),
    entryPrice:  n(t.entryPrice),
    ...(t.exitPrice   != null ? { exitPrice:   n(t.exitPrice)   } : {}),
    ...(t.realizedPnl != null ? { realizedPnl: n(t.realizedPnl) } : {}),
    ...(t.fees        != null ? { fees:         n(t.fees)        } : {}),
  };
}

export type TradeStats = {
  totalTrades: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
  totalFees: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldTimeMs: number;
};

export const PortfolioAPI = {
  async getPositions(): Promise<PortfolioPosition[]> {
    const res = await getApiClient().get<PortfolioPosition[]>("/api/v1/trading/positions");
    return (Array.isArray(res.data) ? res.data : []).map(coercePosition);
  },

  async getTradeHistory(params?: {
    symbol?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<TradeHistoryEntry[]> {
    const res = await getApiClient().get<TradeHistoryEntry[]>("/api/v1/trading/audit/history", {
      params,
    });
    return (Array.isArray(res.data) ? res.data : []).map(coerceTrade);
  },

  async getTradeStats(): Promise<TradeStats> {
    const res = await getApiClient().get<TradeStats>("/api/v1/trading/audit/stats");
    return res.data;
  },
};

export default PortfolioAPI;
