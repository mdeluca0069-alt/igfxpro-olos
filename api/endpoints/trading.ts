import { apiClient } from "../axios";

export const TradingAPI = {
  placeOrder: (data: any) => apiClient.post("/trading/order", data),
  getPositions: () => apiClient.get("/trading/positions"),
  getHistory: () => apiClient.get("/trading/history"),
};