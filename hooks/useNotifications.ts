export type UseNotificationsState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseNotifications(): UseNotificationsState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseNotifications;
