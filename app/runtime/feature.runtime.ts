import { primeFeatureFlagCache } from "../services/featureFlags.service";

export async function syncFeatureFlags(): Promise<void> {
  await primeFeatureFlagCache();
}

export async function loadFeatureFlags(): Promise<void> {
  await primeFeatureFlagCache();
}
