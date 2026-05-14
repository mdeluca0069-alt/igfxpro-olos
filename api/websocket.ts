import { getClientEnv } from "../shared/config/clientEnv";
import { createLogger } from "../shared/lib/logger";

const log = createLogger("ws");

type EventHandler = (payload: unknown) => void;

type WsInbound = { type: string; payload?: unknown };

function parseInbound(raw: string): WsInbound | null {
  try {
    const msg = JSON.parse(raw) as unknown;
    if (!msg || typeof msg !== "object") return null;
    const m = msg as Record<string, unknown>;
    const type = m.type;
    if (typeof type !== "string") return null;
    return { type, payload: m.payload };
  } catch {
    log.warn("ignored malformed ws frame");
    return null;
  }
}

function backoffMs(attempt: number, cap: number): number {
  const base = Math.min(1000 * 2 ** attempt, cap);
  const jitter = base * (0.2 * Math.random());
  return Math.floor(base + jitter);
}

class WebSocketManager {
  private ws?: WebSocket;
  private readonly handlers = new Map<string, EventHandler[]>();
  private shouldReconnect = true;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private attempt = 0;

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private emitLocal(type: string, payload: unknown): void {
    const list = this.handlers.get(type) ?? [];
    list.forEach((h) => {
      try {
        h(payload);
      } catch (e) {
        log.error("ws handler threw", { detail: String(e) });
      }
    });
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    const env = getClientEnv();
    this.clearTimers();
    const delay = backoffMs(this.attempt, env.WS_RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => {
      this.openSocket();
    }, delay);
  }

  private startHeartbeat(): void {
    const env = getClientEnv();
    if (env.WS_HEARTBEAT_MS <= 0) return;
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "ping", payload: {} }));
        } catch {
          /* ignore */
        }
      }
    }, env.WS_HEARTBEAT_MS);
  }

  private openSocket(): void {
    const env = getClientEnv();
    this.clearTimers();

    try {
      this.ws = new WebSocket(env.WS_URL);
    } catch (e) {
      log.error("ws construct failed", { detail: String(e) });
      this.attempt += 1;
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.attempt = 0;
      log.info("websocket open");
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const msg = parseInbound(String(event.data));
      if (!msg) return;
      this.emitLocal(msg.type, msg.payload ?? null);
    };

    this.ws.onerror = () => {
      log.warn("websocket error event");
    };

    this.ws.onclose = () => {
      log.warn("websocket closed");
      this.clearTimers();
      this.attempt += 1;
      this.scheduleReconnect();
    };
  }

  connect(): void {
    this.shouldReconnect = true;
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearTimers();
    this.ws?.close();
    this.ws = undefined;
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      log.warn("send skipped — socket not open", { type });
      return;
    }
    try {
      this.ws.send(JSON.stringify({ type, payload }));
    } catch (e) {
      log.error("ws send failed", { detail: String(e), type });
    }
  }
}

const manager = new WebSocketManager();

/**
 * Legacy surface used by stream facades — delegates to the shared manager.
 */
export const wsClient = {
  connect: () => manager.connect(),
  disconnect: () => manager.disconnect(),
  on: (event: string, handler: EventHandler) => manager.on(event, handler),
  send: (type: string, payload: unknown) => manager.send(type, payload),
};

export { manager as wsManager };
