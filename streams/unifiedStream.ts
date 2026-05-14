import { wsClient } from "../api/websocket";

type StreamEvent =
  | "market"
  | "ai"
  | "execution"
  | "signal"
  | "portfolio"
  | "risk";

type Handler = (data: unknown) => void;

class UnifiedStream {
  private readonly handlers = new Map<StreamEvent, Handler[]>();
  private wired = false;

  private ensureTransport(): void {
    if (this.wired) return;
    this.wired = true;

    wsClient.connect();

    wsClient.on("market", (data) => this.emit("market", data));
    wsClient.on("ai", (data) => this.emit("ai", data));
    wsClient.on("execution", (data) => this.emit("execution", data));
    wsClient.on("signal", (data) => this.emit("signal", data));
    wsClient.on("portfolio", (data) => this.emit("portfolio", data));
    wsClient.on("risk", (data) => this.emit("risk", data));
  }

  on(event: StreamEvent, handler: Handler): void {
    this.ensureTransport();
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: StreamEvent, data: unknown): void {
    const list = this.handlers.get(event);
    if (!list) return;
    list.forEach((h) => {
      try {
        h(data);
      } catch {
        /* isolate subscriber failures */
      }
    });
  }

  send(event: StreamEvent, payload: unknown): void {
    this.ensureTransport();
    wsClient.send(event, payload);
  }
}

export const unifiedStream = new UnifiedStream();
