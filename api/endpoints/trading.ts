import { z } from "zod";
import { apiClient } from "../axios";
import {
  NewOrderRequest,
  NewOrderRequestSchema,
  OrderAckSchema,
  PositionRowSchema,
  LiquidityBookSchema,
} from "../../shared/types/trading";

const OrderListSchema = z.array(PositionRowSchema);

export const TradingAPI = {
  placeOrder: async (data: NewOrderRequest) => {
    const payload = NewOrderRequestSchema.parse(data);
    const res = await apiClient.post("/api/v1/trading/order", payload);
    return OrderAckSchema.parse(res.data);
  },

  getPositions: async () => {
    const res = await apiClient.get("/api/v1/trading/positions");
    return OrderListSchema.parse(res.data);
  },

  getHistory: async () => {
    const res = await apiClient.get("/api/v1/trading/history");
    return z.array(OrderAckSchema).parse(res.data);
  },

  getLiquidityBook: async (symbol: string) => {
    const res = await apiClient.get(`/api/v1/liquidity/book/${encodeURIComponent(symbol)}`);
    return LiquidityBookSchema.parse(res.data);
  },
};

