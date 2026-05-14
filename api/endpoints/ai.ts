import { z } from "zod";
import { apiClient } from "../axios";

const SignalSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  horizon: z.enum(["INTRADAY", "SWING", "POSITION"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  generatedAt: z.string().optional(),
});

const SignalsEnvelope = z.array(SignalSchema);

const ConfidenceSchema = z.object({
  score: z.number().min(0).max(1),
  asOf: z.string().optional(),
});

export const AIAPI = {
  getSignals: async () => {
    const res = await apiClient.get("/ai/signals");
    return SignalsEnvelope.parse(res.data);
  },

  getConfidence: async () => {
    const res = await apiClient.get("/ai/confidence");
    return ConfidenceSchema.parse(res.data);
  },
};
