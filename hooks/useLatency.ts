export type UseLatencyState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseLatency(): UseLatencyState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseLatency;
