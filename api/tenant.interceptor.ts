import { apiClient } from "./axios";

apiClient.interceptors.request.use((config) => {
  const tenant = localStorage.getItem("tenant_id");

  if (tenant) {
    config.headers["x-tenant-id"] = tenant;
  }

  return config;
});