import { create } from "zustand";
import { wsClient } from "../api/websocket";
import { getApiClient } from "../api/httpClient";

export type RiskSeverity = "INFO" | "WARNING" | "CRITICAL";

export type RiskWarning = {
  id: string;
  severity: RiskSeverity;
  marginLevel: number;
  riskScore: number;
  message: string;
  acknowledged: boolean;
  createdAt: string;
};

export type RiskSnapshot = {
  riskScore: number;
  marginLevelPct: number;
  exposure: number;
  drawdownPct: number;
  negativeBalanceProtection: boolean;
  stopOutLevelPct: number;
  leveragePolicy: Record<string, number>;
  alerts: string[];
  freeMargin?: number;
  equity?: number;
  balance?: number;
  marginUsed?: number;
};

type RiskState = {
  snapshot:            RiskSnapshot | null;
  warnings:            RiskWarning[];
  unacknowledgedCount: number;
  lastUpdatedAt:       string | null;
  killSwitchActive:    boolean;
  liveTradeDisabled:   boolean;
  loading:             boolean;

  // Setters
  setSnapshot:          (snapshot: RiskSnapshot) => void;
  addWarning:           (warning: RiskWarning) => void;
  setWarnings:          (warnings: RiskWarning[]) => void;
  acknowledgeWarning:   (warningId: string) => void;
  acknowledgeAll:       () => void;
  setKillSwitch:        (active: boolean) => void;
  setLiveTradeDisabled: (disabled: boolean) => void;

  // API actions
  fetchSnapshot:        () => Promise<void>;
  acknowledgeWarningApi:(warningId: string) => Promise<void>;

  // WebSocket
  subscribeWs: () => () => void;

  // Computed
  getMarginLevel: () => number;
  isHighRisk:     () => boolean;
};

export const useRiskStore = create<RiskState>((set, get) => ({
  snapshot:            null,
  warnings:            [],
  unacknowledgedCount: 0,
  lastUpdatedAt:       null,
  killSwitchActive:    false,
  liveTradeDisabled:   false,
  loading:             false,

  setSnapshot: (snapshot) =>
    set({
      snapshot,
      lastUpdatedAt:    new Date().toISOString(),
      killSwitchActive:  snapshot.alerts.some((a) => a.toLowerCase().includes("kill switch")),
      liveTradeDisabled: snapshot.alerts.some((a) => a.toLowerCase().includes("live trading disabled")),
    }),

  addWarning: (warning) =>
    set((state) => {
      const warnings = [warning, ...state.warnings].slice(0, 50);
      return { warnings, unacknowledgedCount: warnings.filter((w) => !w.acknowledged).length };
    }),

  setWarnings: (warnings) =>
    set({
      warnings,
      unacknowledgedCount: warnings.filter((w) => !w.acknowledged).length,
    }),

  acknowledgeWarning: (warningId) =>
    set((state) => {
      const warnings = state.warnings.map((w) =>
        w.id === warningId ? { ...w, acknowledged: true } : w
      );
      return { warnings, unacknowledgedCount: warnings.filter((w) => !w.acknowledged).length };
    }),

  acknowledgeAll: () =>
    set((state) => ({
      warnings:            state.warnings.map((w) => ({ ...w, acknowledged: true })),
      unacknowledgedCount: 0,
    })),

  setKillSwitch:        (killSwitchActive)   => set({ killSwitchActive }),
  setLiveTradeDisabled: (liveTradeDisabled)  => set({ liveTradeDisabled }),

  // ── API actions ────────────────────────────────────────────────────────────────

  fetchSnapshot: async () => {
    set({ loading: true });
    try {
      const res = await getApiClient().get<RiskSnapshot>("/api/v1/risk/snapshot");
      if (res.data) get().setSnapshot(res.data);
    } catch {
      // Non-fatal
    } finally {
      set({ loading: false });
    }
  },

  acknowledgeWarningApi: async (warningId) => {
    try {
      await getApiClient().post(`/api/v1/risk/warning/${encodeURIComponent(warningId)}/acknowledge`);
      get().acknowledgeWarning(warningId);
    } catch {
      // fall back to local-only
      get().acknowledgeWarning(warningId);
    }
  },

  // ── WebSocket subscription ─────────────────────────────────────────────────────

  subscribeWs: () => {
    const unsubWarning = wsClient.on("risk.warning", (payload) => {
      const p = payload as Record<string, unknown>;
      const w = (p?.warning ?? payload) as Record<string, unknown>;
      get().addWarning({
        id:           String(w.id ?? `warn_${Date.now()}`),
        severity:     (String(w.severity ?? "WARNING") as RiskSeverity),
        marginLevel:  Number(w.marginLevel ?? 0),
        riskScore:    Number(w.riskScore   ?? 0),
        message:      String(w.message ?? w.regulatoryText ?? "Risk alert"),
        acknowledged: false,
        createdAt:    new Date().toISOString(),
      });
    });

    const unsubMargin = wsClient.on("margin.warning", (payload) => {
      const p = payload as Record<string, unknown>;
      get().addWarning({
        id:           `margin_${Date.now()}`,
        severity:     "CRITICAL",
        marginLevel:  Number(p.marginLevel ?? 0),
        riskScore:    100,
        message:      String(p.message ?? "Margin level critical"),
        acknowledged: false,
        createdAt:    new Date().toISOString(),
      });
    });

    const unsubConnected = wsClient.on("ws.connected", () => {
      void get().fetchSnapshot();
    });

    return () => {
      unsubWarning();
      unsubMargin();
      unsubConnected();
    };
  },

  // ── Computed ───────────────────────────────────────────────────────────────────

  getMarginLevel: () => get().snapshot?.marginLevelPct ?? Infinity,

  isHighRisk: () => {
    const snap = get().snapshot;
    return snap !== null && (snap.marginLevelPct < 120 || snap.riskScore > 70);
  },
}));
