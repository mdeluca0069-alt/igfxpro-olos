import { wsClient } from "../api/websocket";

type StreamEvent =
  | "market"
  | "ai"
  | "execution"
  | "signal"
  | "portfolio"
  | "risk";

type Handler = (data: any) => void;

class UnifiedStream {
  private handlers: Map<StreamEvent, Handler[]> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    wsClient.connect();

    wsClient.on("market", (data) => this.emit("market", data));
    wsClient.on("ai", (data) => this.emit("ai", data));
    wsClient.on("execution", (data) => this.emit("execution", data));
    wsClient.on("signal", (data) => this.emit("signal", data));
    wsClient.on("portfolio", (data) => this.emit("portfolio", data));
    wsClient.on("risk", (data) => this.emit("risk", data));
  }

  on(event: StreamEvent, handler: Handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: StreamEvent, data: any) {
    const list = this.handlers.get(event);
    if (!list) return;
    list.forEach((h) => h(data));
  }

  send(event: StreamEvent, payload: any) {
    wsClient.send(event, payload);
  }
}

export const unifiedStream = new UnifiedStream();