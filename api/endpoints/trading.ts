import { z } from "zod";
import { apiClient } from "../axios";
import {
  NewOrderRequest,
  NewOrderRequestSchema,
  OrderAckSchema,
  PositionRowSchema,
} from "../../shared/types/trading";

const OrderListSchema = z.array(PositionRowSchema);

export const TradingAPI = {
  placeOrder: async (data: NewOrderRequest) => {
    const payload = NewOrderRequestSchema.parse(data);
    const res = await apiClient.post("/trading/order", payload);
    return OrderAckSchema.parse(res.data);
  },

  getPositions: async () => {
    const res = await apiClient.get("/trading/positions");
    return OrderListSchema.parse(res.data);
  },

  getHistory: async () => {
    const res = await apiClient.get("/trading/history");
    return z.array(z.record(z.string(), z.unknown())).parse(res.data);
  },
};
