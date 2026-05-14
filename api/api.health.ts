import { apiClient } from "./axios";

export const checkApiHealth = async () => {
  try {
    const res = await apiClient.get("/health");
    return res.data;
  } catch {
    return { status: "offline" };
  }
};