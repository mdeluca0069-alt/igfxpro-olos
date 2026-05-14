import { apiClient } from "../axios";

export const AIAPI = {
  getSignals: () => apiClient.get("/ai/signals"),
  getConfidence: () => apiClient.get("/ai/confidence"),
};