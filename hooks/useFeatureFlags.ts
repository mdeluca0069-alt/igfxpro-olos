export type UseFeatureFlagsState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseFeatureFlags(): UseFeatureFlagsState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseFeatureFlags;
