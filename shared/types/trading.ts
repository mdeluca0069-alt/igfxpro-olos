import { z } from "zod";

export const OrderSideSchema = z.enum(["BUY", "SELL"]);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const OrderTypeSchema = z.enum(["MARKET", "LIMIT", "STOP", "OCO"]);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const InstrumentRefSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().optional(),
  assetClass: z.string().optional(),
});
export type InstrumentRef = z.infer<typeof InstrumentRefSchema>;

export const NewOrderRequestSchema = z.object({
  symbol: z.string().min(3),
  side: OrderSideSchema,
  type: OrderTypeSchema.default("MARKET"),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  leverage: z.number().positive().max(500).default(1),
  clientOrderId: z.string().min(3).max(80).optional(),
});
export type NewOrderRequest = z.infer<typeof NewOrderRequestSchema>;

export const OrderAckSchema = z.object({
  id: z.string().min(1),
  clientOrderId: z.string().optional(),
  symbol: z.string().min(1),
  side: OrderSideSchema,
  type: OrderTypeSchema,
  quantity: z.number(),
  requestedPrice: z.number().optional(),
  averageFillPrice: z.number().optional(),
  status: z.enum([
    "RECEIVED",
    "RISK_REVIEW",
    "ACCEPTED",
    "PARTIALLY_FILLED",
    "FILLED",
    "REJECTED",
    "CANCELLED",
  ]),
  rejectionReason: z.string().optional(),
  marginRequired: z.number(),
  notional: z.number(),
  createdAt: z.string(),
});
export type OrderAck = z.infer<typeof OrderAckSchema>;

export const PositionRowSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  side: OrderSideSchema,
  quantity:   z.coerce.number(),
  entryPrice: z.coerce.number(),
  markPrice:  z.coerce.number(),
  pnl:        z.coerce.number(),
  marginUsed: z.coerce.number(),
  leverage:   z.coerce.number(),
  openedAt: z.string(),
});
export type PositionRow = z.infer<typeof PositionRowSchema>;

export const LiquidityLevelSchema = z.object({
  price: z.number(),
  volume: z.number(),
  cumulativeVolume: z.number(),
});
export type LiquidityLevel = z.infer<typeof LiquidityLevelSchema>;

export const LiquidityBookSchema = z.object({
  symbol: z.string(),
  provider: z.literal("IGFX_INTERNAL_LP"),
  mode: z.enum(["sandbox", "live", "internal"]),
  bid: z.number(),
  ask: z.number(),
  spread: z.number(),
  spreadBps: z.number(),
  bids: z.array(LiquidityLevelSchema),
  asks: z.array(LiquidityLevelSchema),
  generatedAt: z.string(),
});
export type LiquidityBook = z.infer<typeof LiquidityBookSchema>;
