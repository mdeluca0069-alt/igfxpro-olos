import { apiClient } from "../axios";

export const CANDLE_LIMIT: Record<string, number> = {
  "1M":  1440,
  "5M":  2016,
  "15M": 6720,
  "30M": 8760,
  "1H":  8760,
  "4H":  10950,
  "1D":  1825,
};

export function candleLimitFor(timeframe: string): number {
  return CANDLE_LIMIT[timeframe] ?? 1000;
}

export type QuoteRow = {
  symbol:    string;
  bid:       number;
  ask:       number;
  mid:       number;
  spread:    number;
  changePct: number;
  ts:        string;
};

export type InstrumentRow = {
  symbol:            string;
  name:              string;
  assetClass:        string;
  base:              string;
  quote:             string;
  precision:         number;
  minTradeSize:      number;
  maxLeverageRetail: number;
  session:           string;
};

export type CandleRow = {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
};

export type LiquidityBook = {
  symbol: string;
  bids:   [number, number][];
  asks:   [number, number][];
  ts:     string;
};

export type DomLevel = {
  price:            number;
  volume:           number;
  cumulativeVolume: number;
};

export type DomBook = {
  symbol:      string;
  provider:    string;
  bid:         number;
  ask:         number;
  spread:      number;
  spreadBps:   number;
  changePct:   number;
  bids:        DomLevel[];
  asks:        DomLevel[];
  generatedAt: string;
};

export const MarketsAPI = {
  async getInstruments(): Promise<InstrumentRow[]> {
    const res = await apiClient.get<InstrumentRow[]>("/api/v1/trading/instruments");
    return Array.isArray(res.data) ? res.data : [];
  },

  async getQuotes(): Promise<QuoteRow[]> {
    const res = await apiClient.get<QuoteRow[]>("/api/v1/trading/quotes");
    return Array.isArray(res.data) ? res.data : [];
  },

  async getCandles(
    symbol:    string,
    timeframe: string,
    limit     = 1000,
  ): Promise<CandleRow[]> {
    const res = await apiClient.get<CandleRow[]>(
      `/api/v1/candles/${encodeURIComponent(symbol)}/${encodeURIComponent(timeframe)}?limit=${limit}`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  async getLiquidityBook(symbol: string): Promise<LiquidityBook | null> {
    try {
      const res = await apiClient.get<LiquidityBook>(
        `/api/v1/liquidity/book/${encodeURIComponent(symbol)}`
      );
      return res.data;
    } catch {
      return null;
    }
  },

  async getDomBook(symbol: string): Promise<DomBook | null> {
    try {
      const res = await apiClient.get<DomBook>(
        `/api/v1/dom/${encodeURIComponent(symbol)}`
      );
      return res.data;
    } catch {
      return null;
    }
  },

  async health() {
    return { status: "ready" as const, namespace: "Markets" };
  },
};

export default MarketsAPI;
