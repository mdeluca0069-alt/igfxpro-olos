export type UseTierState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseTier(): UseTierState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseTier;
