import { getClientEnv } from "../../shared/config/clientEnv";

export async function initializeEnvironment(): Promise<void> {
  getClientEnv();
}
