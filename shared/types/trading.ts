import { z } from "zod";

export const OrderSideSchema = z.enum(["BUY", "SELL"]);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const TimeInForceSchema = z.enum([
  "DAY",
  "GTC",
  "IOC",
  "FOK",
  "GTD",
]);
export type TimeInForce = z.infer<typeof TimeInForceSchema>;

export const OrderTypeSchema = z.enum([
  "MARKET",
  "LIMIT",
  "STOP",
  "STOP_LIMIT",
]);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const InstrumentRefSchema = z.object({
  symbol: z.string().min(1),
  venue: z.string().min(1).optional(),
  assetClass: z.enum(["EQUITY", "FX", "CRYPTO", "FUTURES", "OPTION"]).optional(),
});
export type InstrumentRef = z.infer<typeof InstrumentRefSchema>;

export const NewOrderRequestSchema = z.object({
  clientOrderId: z.string().min(8).max(64),
  instrument: InstrumentRefSchema,
  side: OrderSideSchema,
  type: OrderTypeSchema,
  quantity: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  timeInForce: TimeInForceSchema.default("DAY"),
  tags: z.array(z.string()).max(16).optional(),
});
export type NewOrderRequest = z.infer<typeof NewOrderRequestSchema>;

export const OrderAckSchema = z.object({
  orderId: z.string().min(1),
  clientOrderId: z.string().min(1),
  status: z.enum(["ACCEPTED", "REJECTED", "PENDING"]),
  reason: z.string().optional(),
});
export type OrderAck = z.infer<typeof OrderAckSchema>;

export const PositionRowSchema = z.object({
  instrument: InstrumentRefSchema,
  quantity: z.number(),
  avgPrice: z.number(),
  unrealizedPnl: z.number().optional(),
});
export type PositionRow = z.infer<typeof PositionRowSchema>;
