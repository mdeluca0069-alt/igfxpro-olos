import { getApiClient } from "../httpClient";

export type OlosSignal = {
  id: string;
  symbol: string;
  signalType: "BUY" | "SELL" | "HOLD" | "STRONG_BUY" | "STRONG_SELL";
  confidence: number;
  timeframe: string;
  summary: string;
  reasoning?: string;
  createdAt: string;
  expiresAt?: string;
  status: "ACTIVE" | "EXPIRED" | "INVALIDATED";
};

export type SignalStats = {
  totalSignals: number;
  activeSignals: number;
  avgConfidence: number;
  successRate: number;
  bySymbol: Record<string, { count: number; avgConfidence: number }>;
};

export type AiConfidence = {
  score: number | null;
  breakdown: {
    trend: number;
    momentum: number;
    volume: number;
    macro: number;
  } | null;
  status: "ACTIVE" | "SCANNING";
  signalCount?: number;
  nextScanInSec?: number;
  message?: string;
  asOf: string;
};

export const SignalsAPI = {
  async getActiveSignals(params?: { symbol?: string }): Promise<OlosSignal[]> {
    const res = await getApiClient().get<OlosSignal[]>("/api/v1/signals/active", { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getSignalHistory(params?: {
    symbol?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<OlosSignal[]> {
    const res = await getApiClient().get<OlosSignal[]>("/api/v1/signals/history", { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getSignalStats(): Promise<SignalStats> {
    const res = await getApiClient().get<SignalStats>("/api/v1/signals/stats");
    return res.data;
  },

  async getAiConfidence(): Promise<AiConfidence> {
    const res = await getApiClient().get<AiConfidence>("/api/v1/ai/confidence");
    return res.data;
  },

  async getLegacySignals(): Promise<OlosSignal[]> {
    const res = await getApiClient().get<OlosSignal[]>("/api/v1/ai/signals");
    return Array.isArray(res.data) ? res.data : [];
  },
};

export default SignalsAPI;
