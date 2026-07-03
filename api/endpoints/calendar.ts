export const CalendarAPI = {
  namespace: "Calendar",
  list: async () => [] as unknown[],
  health: async () => ({ status: "ready" as const, namespace: "Calendar" }),
};

export default CalendarAPI;
