type EventHandler = (data: any) => void;

class WebSocketClient {
  private ws?: WebSocket;
  private url: string;
  private handlers: Map<string, EventHandler[]> = new Map();
  private reconnectInterval = 3000;
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WS] Connected");
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const handlers = this.handlers.get(msg.type) || [];
      handlers.forEach((h) => h(msg.payload));
    };

    this.ws.onclose = () => {
      console.warn("[WS] Disconnected");
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  send(type: string, payload: any) {
    this.ws?.send(JSON.stringify({ type, payload }));
  }

  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
  }
}

export const wsClient = new WebSocketClient(
  import.meta.env.VITE_WS_URL || "ws://localhost:3000/ws"
);