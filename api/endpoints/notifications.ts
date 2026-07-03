import { apiClient } from "../axios";

export type ApiNotification = {
  id:          string;
  channel:     string;
  category:    string;
  priority:    string;
  title:       string;
  body:        string;
  sent:        boolean;
  sentAt:      string | null;
  createdAt:   string;
  payload?:    Record<string, unknown>;
};

export type NotificationPreferences = {
  emailEnabled: boolean;
  smsEnabled:   boolean;
  pushEnabled:  boolean;
  inAppEnabled: boolean;
  categories:   Record<string, boolean>;
};

export const NotificationsAPI = {
  async list(limit = 50): Promise<ApiNotification[]> {
    const res = await apiClient.get<ApiNotification[] | { notifications?: ApiNotification[] }>(
      `/api/v1/notifications?limit=${limit}`
    );
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as { notifications?: ApiNotification[] }).notifications)) {
      return (data as { notifications: ApiNotification[] }).notifications;
    }
    return [];
  },

  async markRead(ids?: string[]): Promise<void> {
    await apiClient.post("/api/v1/notifications/read", { ids });
  },

  async markAllRead(): Promise<void> {
    await apiClient.post("/api/v1/notifications/read", { ids: undefined });
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const res = await apiClient.get<NotificationPreferences>("/api/v1/notifications/preferences");
    return res.data;
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const res = await apiClient.put<NotificationPreferences>(
      "/api/v1/notifications/preferences",
      prefs,
    );
    return res.data;
  },

  async health() {
    return { status: "ready" as const, namespace: "Notifications" };
  },
};

export default NotificationsAPI;
