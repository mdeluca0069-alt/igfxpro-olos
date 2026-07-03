import { getApiClient } from "../httpClient";

export type IndicatorValue = {
  name: string;
  value: number | null;
  signal?: "BUY" | "SELL" | "NEUTRAL" | null;
  description?: string;
};

export type IndicatorSnapshot = {
  symbol: string;
  timeframe: string;
  timestamp: string;
  trend: IndicatorValue[];
  oscillators: IndicatorValue[];
  volatility: IndicatorValue[];
  summary: {
    buy: number;
    sell: number;
    neutral: number;
    overallSignal: "BUY" | "SELL" | "NEUTRAL";
  };
};

export const IndicatorsAPI = {
  async getSnapshot(symbol: string, timeframe = "15M"): Promise<IndicatorSnapshot | null> {
    try {
      const res = await getApiClient().get<IndicatorSnapshot>(
        `/api/v1/indicators/${encodeURIComponent(symbol)}`,
        { params: { timeframe } },
      );
      return res.data;
    } catch {
      return null;
    }
  },
};

export default IndicatorsAPI;
