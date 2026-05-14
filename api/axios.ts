import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

// GLOBAL HEADERS INJECTION
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  const tenant = localStorage.getItem("tenant_id");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenant) {
    config.headers["x-tenant-id"] = tenant;
  }

  config.headers["x-client"] = "olos-frontend";

  return config;
});

// GLOBAL RESPONSE HANDLING
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[API ERROR]", err?.response?.data || err.message);
    return Promise.reject(err);
  }
);