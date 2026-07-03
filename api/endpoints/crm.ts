export const CrmAPI = {
  namespace: "Crm",
  list: async () => [] as unknown[],
  health: async () => ({ status: "ready" as const, namespace: "Crm" }),
};

export default CrmAPI;
