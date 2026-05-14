import { wsClient } from "../../api/websocket";

/**
 * Realtime wiring. WebSocket is lazy; boot should not fail if the gateway is down.
 */
export async function connectRealtime(): Promise<{
  websocket: boolean;
  market: boolean;
  api: boolean;
}> {
  try {
    wsClient.connect();
    return {
      websocket: true,
      market: true,
      api: true,
    };
  } catch {
    return {
      websocket: false,
      market: false,
      api: true,
    };
  }
}
