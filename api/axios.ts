import type { AxiosInstance } from "axios";
import { getApiClient } from "./httpClient";

/**
 * Lazy `AxiosInstance` — first property access initializes the instrumented client.
 * Preserves legacy `import { apiClient } from "../axios"` import paths.
 */
export const apiClient = new Proxy({} as AxiosInstance, {
  get(_target, prop, receiver) {
    const inst = getApiClient();
    const value = Reflect.get(inst, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(inst)
      : value;
  },
});
