import { apiClient } from "./axios";
import { isApiError } from "./error.mapper";

export const checkApiHealth = async () => {
  try {
    const res = await apiClient.get("/health");
    return res.data as unknown;
  } catch (e) {
    if (isApiError(e)) {
      return { status: "degraded", kind: e.kind };
    }
    return { status: "offline" };
  }
};
