export const AnalyticsAPI = {
  namespace: "Analytics",
  list: async () => [] as unknown[],
  health: async () => ({ status: "ready" as const, namespace: "Analytics" }),
};

export default AnalyticsAPI;
