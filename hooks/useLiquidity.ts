export type UseLiquidityState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseLiquidity(): UseLiquidityState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseLiquidity;
