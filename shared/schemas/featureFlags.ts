import { z } from "zod";

export const FeatureFlagsSchema = z.object({
  aiTrading: z.boolean(),
  smartSignals: z.boolean(),
  brokerControlCenter: z.boolean(),
  hedgeAutomation: z.boolean(),
  institutionalCharts: z.boolean(),
  liveTrading: z.boolean(),
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  aiTrading: true,
  smartSignals: true,
  brokerControlCenter: true,
  hedgeAutomation: true,
  institutionalCharts: true,
  liveTrading: true,   // default LIVE — changed to false only by explicit admin flag
};

export function parseFeatureFlagsPayload(raw: unknown): FeatureFlags {
  const direct = FeatureFlagsSchema.safeParse(raw);
  if (direct.success) return direct.data;

  const wrappedFlags = z
    .object({ flags: FeatureFlagsSchema })
    .safeParse(raw);
  if (wrappedFlags.success) return wrappedFlags.data.flags;

  const wrappedData = z
    .object({ data: FeatureFlagsSchema })
    .safeParse(raw);
  if (wrappedData.success) return wrappedData.data.data;

  return DEFAULT_FEATURE_FLAGS;
}
