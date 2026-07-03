import { getClientEnv } from "../shared/config/clientEnv";
import { createLogger } from "../shared/lib/logger";
import { tokenVault } from "../shared/lib/tokenVault";

const log = createLogger("ws");

type EventHandler = (payload: unknown) => void;
type WsInbound    = { type: string; payload?: unknown };

function parseInbound(raw: string): WsInbound | null {
  try {
    const msg = JSON.parse(raw) as unknown;
    if (!msg || typeof msg !== "object") return null;
    const m = msg as Record<string, unknown>;
    if (typeof m.type !== "string") return null;
    return { type: m.type, payload: m.payload };
  } catch {
    log.warn("ignored malformed ws frame");
    return null;
  }
}

function backoffMs(attempt: number, cap: number): number {
  const base   = Math.min(500 * 2 ** attempt, cap);
  const jitter = base * (0.2 * Math.random());
  return Math.floor(base + jitter);
}

export type WsReadyState = "connecting" | "open" | "closing" | "closed";

class WebSocketManager {
  private ws?: WebSocket;
  private readonly handlers = new Map<string, EventHandler[]>();
  private shouldReconnect   = true;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private attempt = 0;
  private _readyState: WsReadyState = "closed";

  get readyState(): WsReadyState { return this._readyState; }

  private clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer);  this.reconnectTimer = undefined; }
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = undefined; }
  }

  private emitLocal(type: string, payload: unknown): void {
    const list = this.handlers.get(type) ?? [];
    list.forEach((h) => {
      try { h(payload); } catch (e) { log.error("ws handler threw", { detail: String(e) }); }
    });
    // also emit to wildcard listeners
    const wildcard = this.handlers.get("*") ?? [];
    wildcard.forEach((h) => {
      try { h({ type, payload }); } catch { /* ignore */ }
    });
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    const env   = getClientEnv();
    this._readyState = "closed";
    this.clearTimers();
    const delay = backoffMs(this.attempt, env.WS_RECONNECT_MAX_MS);
    log.warn(`ws reconnecting in ${delay}ms (attempt ${this.attempt})`);
    this.emitLocal("ws.reconnecting", { attempt: this.attempt, delayMs: delay });
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  private startHeartbeat(): void {
    const env = getClientEnv();
    if (env.WS_HEARTBEAT_MS <= 0) return;
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try { this.ws.send(JSON.stringify({ type: "ping", payload: {} })); } catch { /* ignore */ }
      }
    }, env.WS_HEARTBEAT_MS);
  }

  private buildUrl(): string {
    const env   = getClientEnv();
    const token = tokenVault.getAccessToken();

    // Empty WS_URL = use same host as the page, path /ws (goes through Vite proxy in dev)
    const base = env.WS_URL || (() => {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.host}/ws`;
    })();

    const url = new URL(base);
    if (token) url.searchParams.set("token", token);
    return url.toString();
  }

  private openSocket(): void {
    this.clearTimers();
    this._readyState = "connecting";

    let wsUrl: string;
    try {
      wsUrl = this.buildUrl();
    } catch (e) {
      log.error("ws url build failed", { detail: String(e) });
      this.attempt++;
      this.scheduleReconnect();
      return;
    }

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      log.error("ws construct failed", { detail: String(e) });
      this.attempt++;
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.attempt      = 0;
      this._readyState  = "open";
      log.info("websocket open");
      this.startHeartbeat();
      this.emitLocal("ws.connected", {});
    };

    this.ws.onmessage = (event) => {
      const msg = parseInbound(String(event.data));
      if (!msg) return;
      this.emitLocal(msg.type, msg.payload ?? null);
    };

    this.ws.onerror = () => {
      log.warn("websocket error event");
    };

    this.ws.onclose = (ev) => {
      log.warn("websocket closed", { code: ev.code, reason: ev.reason });
      this._readyState = "closed";
      this.clearTimers();

      // 4001 = JWT rejected (missing, invalid, or expired).
      // Before clearing the session, try a cookie-based silent refresh.
      // If the refresh succeeds we get a new access token and can reconnect
      // without forcing the user to log in again.
      if (ev.code === 4001) {
        log.warn("ws rejected with 4001 — attempting silent token refresh");
        this.emitLocal("ws.reconnecting", { attempt: this.attempt, delayMs: 0 });
        fetch("/api/v1/auth/refresh/db", { method: "POST", credentials: "include" })
          .then((r) => r.json())
          .then((data: unknown) => {
            const d = data as Record<string, unknown>;
            if (d.ok && typeof d.accessToken === "string") {
              tokenVault.setAccessToken(d.accessToken);
              log.info("silent refresh succeeded — reconnecting ws");
              this.attempt = 0;
              this.openSocket();
            } else {
              log.error("silent refresh failed — clearing session");
              tokenVault.clearSession();
              this.emitLocal("ws.unauthorized", { code: ev.code });
            }
          })
          .catch(() => {
            log.error("silent refresh request failed — clearing session");
            tokenVault.clearSession();
            this.emitLocal("ws.unauthorized", { code: ev.code });
          });
        return;
      }

      if (this.shouldReconnect) {
        this.attempt++;
        this.scheduleReconnect(); // already emits ws.reconnecting — don't follow with ws.closed
      } else {
        this.emitLocal("ws.closed", { code: ev.code }); // permanent close (disconnect() was called)
      }
    };
  }

  connect(): void {
    this.shouldReconnect = true;
    if (this.ws?.readyState === WebSocket.OPEN)       return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;
    this.attempt = 0;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this._readyState     = "closing";
    this.clearTimers();
    this.ws?.close();
    this.ws = undefined;
  }

  /** Subscribe to a named event. Returns an unsubscribe function. */
  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
    return () => this.off(event, handler);
  }

  /** Unsubscribe from a named event. */
  off(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
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

/** Legacy surface used by stream facades — delegates to the shared manager. */
export const wsClient = {
  connect:    ()                                     => manager.connect(),
  disconnect: ()                                     => manager.disconnect(),
  on:         (event: string, handler: EventHandler) => manager.on(event, handler),
  off:        (event: string, handler: EventHandler) => manager.off(event, handler),
  send:       (type: string,  payload: unknown)      => manager.send(type, payload),
  get readyState() { return manager.readyState; },
};

export { manager as wsManager };
