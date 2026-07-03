export type IndicatorsResult = {
  module: string;
  status: "ready";
  generatedAt: string;
};

export function createIndicators(): IndicatorsResult {
  return {
    module: "Indicators",
    status: "ready",
    generatedAt: new Date().toISOString(),
  };
}

export const Indicators = createIndicators();

export default Indicators;
