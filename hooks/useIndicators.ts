export type UseIndicatorsState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseIndicators(): UseIndicatorsState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseIndicators;
