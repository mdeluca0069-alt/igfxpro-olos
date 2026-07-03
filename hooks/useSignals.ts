export type UseSignalsState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseSignals(): UseSignalsState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseSignals;
