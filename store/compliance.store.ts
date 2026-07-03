import { create } from "zustand";
import {
  ComplianceAPI,
  type ComplianceDisclosure,
  type OnboardingStatus,
  type RiskWarning,
} from "../api/endpoints/compliance";
import { wsClient } from "../api/websocket";

type ComplianceState = {
  disclosure: ComplianceDisclosure | null;
  onboarding: OnboardingStatus | null;
  currentWarning: RiskWarning | null;
  riskDashboard: unknown | null;
  loading: boolean;
  error: string | null;
  lastFetchAt: string | null;

  // Actions
  fetchDisclosures: () => Promise<void>;
  fetchOnboardingStatus: () => Promise<void>;
  fetchCurrentWarning: () => Promise<void>;
  fetchRiskDashboard: () => Promise<void>;
  acknowledgeWarning: (warningId: string) => Promise<void>;
  setWarning: (warning: RiskWarning | null) => void;
  clearError: () => void;

  // WebSocket lifecycle
  subscribeWs: () => () => void;

  // Selectors
  isKycApproved: () => boolean;
  isLiveTradingAllowed: () => boolean;
  hasActiveWarning: () => boolean;
  isCriticalWarning: () => boolean;
};

export const useComplianceStore = create<ComplianceState>((set, get) => ({
  disclosure: null,
  onboarding: null,
  currentWarning: null,
  riskDashboard: null,
  loading: false,
  error: null,
  lastFetchAt: null,

  fetchDisclosures: async () => {
    try {
      const disclosure = await ComplianceAPI.getDisclosures();
      set({ disclosure });
    } catch {
      // Non-fatal
    }
  },

  fetchOnboardingStatus: async () => {
    try {
      const onboarding = await ComplianceAPI.getOnboardingStatus();
      set({ onboarding });
    } catch {
      // Non-fatal
    }
  },

  fetchCurrentWarning: async () => {
    try {
      const currentWarning = await ComplianceAPI.getCurrentWarning();
      set({ currentWarning });
    } catch {
      // Non-fatal
    }
  },

  fetchRiskDashboard: async () => {
    set({ loading: true });
    try {
      const riskDashboard = await ComplianceAPI.getRiskDashboard();
      set({ riskDashboard, lastFetchAt: new Date().toISOString() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load risk dashboard" });
    } finally {
      set({ loading: false });
    }
  },

  acknowledgeWarning: async (warningId) => {
    try {
      await ComplianceAPI.acknowledgeWarning(warningId);
      set((state) => ({
        currentWarning:
          state.currentWarning?.id === warningId
            ? { ...state.currentWarning, acknowledgedAt: new Date().toISOString() }
            : state.currentWarning,
      }));
    } catch {
      // Non-fatal — re-fetch to sync
      void get().fetchCurrentWarning();
    }
  },

  setWarning: (currentWarning) => set({ currentWarning }),

  clearError: () => set({ error: null }),

  subscribeWs: () => {
    const unsubRisk = wsClient.on("risk.warning", (payload) => {
      const p = payload as { warning?: RiskWarning };
      const warning = p?.warning;
      if (warning) get().setWarning(warning);
    });

    const unsubMargin = wsClient.on("margin.warning", (payload) => {
      const p = payload as Partial<RiskWarning>;
      if (p?.id) {
        get().setWarning({
          id: p.id,
          type: p.type ?? "MARGIN_WARNING",
          severity: p.severity ?? "HIGH",
          message: p.message ?? "Margin warning received",
          createdAt: p.createdAt ?? new Date().toISOString(),
        });
      }
    });

    const unsubConnected = wsClient.on("ws.connected", () => {
      void get().fetchCurrentWarning();
    });

    return () => {
      unsubRisk();
      unsubMargin();
      unsubConnected();
    };
  },

  isKycApproved: () => get().onboarding?.kyc === "approved",

  isLiveTradingAllowed: () => get().onboarding?.liveTradingAllowed === true,

  hasActiveWarning: () => {
    const w = get().currentWarning;
    return w !== null && !w.acknowledgedAt;
  },

  isCriticalWarning: () => {
    const w = get().currentWarning;
    return w?.severity === "CRITICAL" && !w.acknowledgedAt;
  },
}));
