export type UsePortfolioState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UsePortfolio(): UsePortfolioState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UsePortfolio;
