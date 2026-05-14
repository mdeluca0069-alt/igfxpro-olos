import axios, { type AxiosInstance } from "axios";
import { getClientEnv } from "../shared/config/clientEnv";

/**
 * Minimal HTTP surface for auth endpoints — avoids coupling with the
 * instrumented `apiClient` interceptors (401 refresh loop).
 */
let instance: AxiosInstance | null = null;

export function getAuthHttp(): AxiosInstance {
  if (instance) return instance;
  const env = getClientEnv();
  instance = axios.create({
    baseURL: env.API_BASE_URL,
    timeout: env.REQUEST_TIMEOUT_MS,
    withCredentials: true,
    headers: {
      "x-client": env.CLIENT_NAME,
    },
  });
  return instance;
}
