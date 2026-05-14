import { unifiedStream } from "./unifiedStream";

type AppEvent =
  | "UI_UPDATE"
  | "RISK_ALERT"
  | "AI_OVERLAY"
  | "ORDER_FEED"
  | "SYSTEM_WARNING";

class EventRouter {
  private handlers: Map<AppEvent, ((data: any) => void)[]> = new Map();

  constructor() {
    this.bind();
  }

  private bind() {
    unifiedStream.on("risk", (d) => this.emit("RISK_ALERT", d));
    unifiedStream.on("ai", (d) => this.emit("AI_OVERLAY", d));
    unifiedStream.on("execution", (d) => this.emit("ORDER_FEED", d));
  }

  on(event: AppEvent, cb: (data: any) => void) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(cb);
  }

  emit(event: AppEvent, data: any) {
    const list = this.handlers.get(event);
    if (!list) return;
    list.forEach((h) => h(data));
  }
}

export const eventRouter = new EventRouter();