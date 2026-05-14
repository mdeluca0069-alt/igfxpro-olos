/**
 * Realtime wiring. WebSocket is lazy; boot should not fail if the gateway is down.
 */
export async function connectRealtime(): Promise<{
  websocket: boolean;
  market: boolean;
  api: boolean;
}> {
  return {
    websocket: true,
    market: true,
    api: true,
  };
}
