export const TiersAPI = {
  namespace: "Tiers",
  list: async () => [] as unknown[],
  health: async () => ({ status: "ready" as const, namespace: "Tiers" }),
};

export default TiersAPI;
