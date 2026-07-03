import { create } from "zustand";

export type SignalType     = "BUY" | "SELL" | "NEUTRAL";
export type SignalStatus   = "ACTIVE" | "TRIGGERED" | "CLOSED" | "CANCELLED" | "EXPIRED";
export type SignalHorizon  = "INTRADAY" | "SWING" | "POSITION";

export type OlosSignal = {
  id: string;
  symbol: string;
  timeframe: string;
  signalType: SignalType;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  targetLevels: number[];
  riskRewardRatio: number;
  marketRegime: string;
  volatilityLevel: string;
  confluenceFactors: string[];
  confidenceBreakdown: Record<string, number>;
  entryRationale: string;
  slRationale: string;
  setupPattern: string;
  status: SignalStatus;
  generatedAt: string;
  triggeredAt?: string;
};

type SignalState = {
  signals: OlosSignal[];
  activeSignals: OlosSignal[];
  lastSignalAt: string | null;
  totalGenerated: number;

  addSignal: (signal: OlosSignal) => void;
  setSignals: (signals: OlosSignal[]) => void;
  updateSignalStatus: (signalId: string, status: SignalStatus, triggeredAt?: string) => void;
  getBySymbol: (symbol: string) => OlosSignal[];
  getTopSignal: () => OlosSignal | undefined;
};

export const useSignalStore = create<SignalState>((set, get) => ({
  signals:        [],
  activeSignals:  [],
  lastSignalAt:   null,
  totalGenerated: 0,

  addSignal: (signal) =>
    set((state) => {
      const signals       = [signal, ...state.signals].slice(0, 200);
      const activeSignals = signals.filter((s) => s.status === "ACTIVE");
      return {
        signals,
        activeSignals,
        lastSignalAt:   signal.generatedAt,
        totalGenerated: state.totalGenerated + 1,
      };
    }),

  setSignals: (signals) =>
    set({
      signals,
      activeSignals: signals.filter((s) => s.status === "ACTIVE"),
    }),

  updateSignalStatus: (signalId, status, triggeredAt) =>
    set((state) => {
      const updated = state.signals.map((s) =>
        s.id === signalId ? { ...s, status, ...(triggeredAt ? { triggeredAt } : {}) } : s
      );
      return {
        signals:       updated,
        activeSignals: updated.filter((s) => s.status === "ACTIVE"),
      };
    }),

  getBySymbol: (symbol) =>
    get().signals.filter((s) => s.symbol === symbol),

  getTopSignal: () =>
    get().activeSignals.sort((a, b) => b.confidence - a.confidence)[0],
}));

