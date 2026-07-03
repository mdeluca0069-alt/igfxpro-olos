import { getApiClient } from "../httpClient";

export type ComplianceDisclosure = {
  jurisdiction: string;
  retailProtections: string[];
  legalNote: string;
};

export type OnboardingStatus = {
  kyc: "pending" | "approved" | "rejected" | "in_review";
  appropriateness: "required" | "completed" | "waived";
  documents: string[];
  liveTradingAllowed: boolean;
};

export type RiskWarning = {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  acknowledgedAt?: string;
  createdAt: string;
};

export const ComplianceAPI = {
  async getDisclosures(): Promise<ComplianceDisclosure> {
    const res = await getApiClient().get<ComplianceDisclosure>("/api/v1/compliance/disclosures");
    return res.data;
  },

  async getOnboardingStatus(): Promise<OnboardingStatus> {
    const res = await getApiClient().get<OnboardingStatus>("/api/v1/onboarding/status");
    return res.data;
  },

  async getCurrentWarning(): Promise<RiskWarning | null> {
    try {
      const res = await getApiClient().get<RiskWarning | null>("/api/v1/risk/warning/current");
      return res.data;
    } catch {
      return null;
    }
  },

  async getRiskDashboard() {
    const res = await getApiClient().get("/api/v1/risk/warning/dashboard");
    return res.data;
  },

  async acknowledgeWarning(warningId: string): Promise<void> {
    await getApiClient().post(`/api/v1/risk/warning/${warningId}/acknowledge`);
  },
};

export default ComplianceAPI;
