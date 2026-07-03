import { getApiClient } from "../httpClient";

export const AdminAPI = {
  namespace: "Admin",

  // Overview and workspace
  overview: async () => {
    return getApiClient().get("/api/v1/admin/overview");
  },

  workspace: async () => {
    return getApiClient().get("/api/v1/admin/workspace");
  },

  audit: async () => {
    return getApiClient().get("/api/v1/admin/audit");
  },

  serviceHealth: async () => {
    return getApiClient().get("/api/v1/admin/service-health");
  },

  // Client management
  clientAccounts: async () => {
    return getApiClient().get("/api/v1/admin/client-accounts");
  },

  clientDetail: async (email: string) => {
    return getApiClient().get(`/api/v1/admin/client/${encodeURIComponent(email)}`);
  },

  // Capital allocation
  allocateCapital: async (userId: string, amount: number, note?: string) => {
    return getApiClient().post("/api/v1/admin/capital/allocate", {
      userId,
      amount,
      note: note || "Allocazione manuale dal Broker Control Center",
    });
  },

  withdrawCapital: async (userId: string, amount: number, note?: string) => {
    return getApiClient().post("/api/v1/admin/capital/withdraw", {
      userId,
      amount,
      note: note || "Prelievo cliente approvato dal Broker Control Center",
    });
  },

  // Document review
  reviewDocument: async (userId: string, documentId: string, status: "APPROVED" | "REJECTED", rejectionReason?: string) => {
    return getApiClient().post("/api/v1/admin/documents/review", {
      userId,
      documentId,
      status,
      rejectionReason: status === "REJECTED" ? rejectionReason || "Documento non leggibile o dati non coerenti." : undefined,
    });
  },

  // Ledger review
  reviewLedger: async (userId: string, ledgerId: string, status: "APPROVED" | "REJECTED", note?: string) => {
    return getApiClient().post("/api/v1/admin/ledger/review", {
      userId,
      ledgerId,
      status,
      note: note || (status === "APPROVED" ? "Movimento approvato dal CRM admin." : "Movimento rifiutato dal CRM admin."),
    });
  },

  // Client tier management
  updateClientTier: async (userId: string, tier: "STANDARD" | "GOLD" | "PLATINUM" | "VIP" | "ENTERPRISE") => {
    return getApiClient().post("/api/v1/admin/client/tier", {
      userId,
      tier,
    });
  },

  // Liquidity management
  updateLiquidity: async (symbol: string, enabled?: boolean, spreadMarkupBps?: number, mode?: "internal_lp" | "halted") => {
    return getApiClient().post("/api/v1/admin/liquidity/update", {
      symbol,
      enabled,
      spreadMarkupBps,
      mode,
    });
  },

  // Trading control
  toggleKillSwitch: async (enabled: boolean, reason?: string) => {
    return getApiClient().post("/api/v1/admin/trading/kill-switch", {
      enabled,
      reason: reason || (enabled ? "Blocco manuale da Broker Control Center" : "Sblocco manuale da Broker Control Center"),
    });
  },

  // Risk policy
  updateRiskPolicy: async (policy: {
    stopOutLevelPct?: number;
    maxDrawdownPct?: number;
    maxRiskPerTradePct?: number;
    negativeBalanceProtection?: boolean;
    eventRiskMode?: "normal" | "blocked";
    killSwitchEnabled?: boolean;
    killSwitchReason?: string;
  }) => {
    return getApiClient().post("/api/v1/admin/risk-policy/update", policy);
  },

  // OLOS governance
  updateOlosGovernance: async (governance: {
    autopilotEnabled?: boolean;
    minConfidence?: number;
    eventLockMinutes?: number;
    modelStatus?: "operational" | "degraded";
  }) => {
    return getApiClient().post("/api/v1/admin/olos/update", governance);
  },

  // Real infrastructure metrics (DB, WS, EventBus, Redis, Execution)
  infraMetrics: async () => {
    return getApiClient().get("/api/v1/admin/infra");
  },

  // Derived hedge engine stats (positions + Prometheus metrics)
  hedgeStats: async () => {
    return getApiClient().get("/api/v1/admin/hedge/stats");
  },

  // Full infrastructure telemetry (latencies, process stats, service statuses)
  latencyTelemetry: async () => {
    return getApiClient().get("/api/v1/telemetry/health");
  },

  // Real user behavior analytics (orders, hourly chart, top symbols)
  behaviorAnalytics: async () => {
    return getApiClient().get("/api/v1/admin/behavior");
  },

  // Affiliate / IB referral program
  affiliates: async () => {
    return getApiClient().get("/api/v1/admin/affiliates");
  },

  createAffiliate: async (name: string, email: string, commissionPct?: number) => {
    return getApiClient().post("/api/v1/admin/affiliates", { name, email, commissionPct });
  },

  activateAffiliate: async (affiliateId: string) => {
    return getApiClient().post(`/api/v1/admin/affiliates/${encodeURIComponent(affiliateId)}/activate`, {});
  },

  deactivateAffiliate: async (affiliateId: string) => {
    return getApiClient().post(`/api/v1/admin/affiliates/${encodeURIComponent(affiliateId)}/deactivate`, {});
  },

  payAffiliateCommissions: async (affiliateId: string) => {
    return getApiClient().post(`/api/v1/admin/affiliates/${encodeURIComponent(affiliateId)}/pay-commissions`, {});
  },

  health: async () => {
    return { status: "ready" as const, namespace: "Admin" };
  },
};

export default AdminAPI;
