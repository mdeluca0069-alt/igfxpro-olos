export const AcademyAPI = {
  namespace: "Academy",
  list: async () => [] as unknown[],
  health: async () => ({ status: "ready" as const, namespace: "Academy" }),
};

export default AcademyAPI;
