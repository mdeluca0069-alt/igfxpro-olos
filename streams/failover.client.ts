import { wsClient } from "../api/websocket";

class FailoverClient {
  private fallbackMode = false;

  enableFallback() {
    this.fallbackMode = true;
    console.warn("[FAILOVER] Activated safe mode");
  }

  disableFallback() {
    this.fallbackMode = false;
  }

  isFallback() {
    return this.fallbackMode;
  }

  reconnect() {
    try {
      wsClient.connect();
      this.disableFallback();
    } catch {
      this.enableFallback();
    }
  }
}

export const failoverClient = new FailoverClient();