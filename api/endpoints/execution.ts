import { getApiClient } from "../httpClient";
import type { Order } from "../../store/trading.store";

export type NewOrderPayload = {
  symbol: string;
  side: "BUY" | "SELL";
  type?: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  clientOrderId?: string;
};

export const ExecutionAPI = {
  async placeOrder(payload: NewOrderPayload): Promise<Order> {
    const res = await getApiClient().post<Order>("/api/v1/trading/order", payload);
    return res.data;
  },

  async getOrders(): Promise<Order[]> {
    const res = await getApiClient().get<Order[]>("/api/v1/trading/history");
    return Array.isArray(res.data) ? res.data : [];
  },

  async getPositions() {
    const res = await getApiClient().get("/api/v1/trading/positions");
    return Array.isArray(res.data) ? res.data : [];
  },
};

export default ExecutionAPI;
