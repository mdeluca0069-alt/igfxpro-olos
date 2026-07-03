import { create } from "zustand";
import { wsClient } from "../api/websocket";
import { NotificationsAPI } from "../api/endpoints/notifications";
import type { NotificationPreferences } from "../api/endpoints/notifications";

export type NotifCategory =
  | "fill" | "rejection" | "margin" | "risk" | "signal" | "kyc" | "wallet" | "system";

export type NotifSeverity = "info" | "success" | "warning" | "critical";

export type Notification = {
  id: string;
  category: NotifCategory;
  severity: NotifSeverity;
  title: string;
  body: string;
  read: boolean;
  replayed: boolean;
  timestamp: string;
  actionLabel?: string;
  actionPath?: string;
  meta?: Record<string, unknown>;
};

type NotificationState = {
  notifications:   Notification[];
  unreadCount:     number;
  panelOpen:       boolean;
  preferences:     NotificationPreferences | null;
  historyLoaded:   boolean;

  // Actions
  add:          (n: Omit<Notification, "id" | "read" | "timestamp">) => void;
  markRead:     (id: string) => void;
  markAllRead:  () => void;
  remove:       (id: string) => void;
  clearAll:     () => void;
  setPanelOpen: (open: boolean) => void;

  // API actions
  loadHistory:        () => Promise<void>;
  markReadApi:        (ids?: string[]) => Promise<void>;
  markAllReadApi:     () => Promise<void>;
  loadPreferences:    () => Promise<void>;
  updatePreferences:  (prefs: Partial<NotificationPreferences>) => Promise<void>;

  // WebSocket lifecycle
  subscribeWs: () => () => void;
};

let _seq = 0;
function nextId() { return `notif_${Date.now()}_${++_seq}`; }

function mapPriority(p: string): NotifSeverity {
  switch (p?.toUpperCase()) {
    case "CRITICAL": return "critical";
    case "HIGH":     return "warning";
    case "LOW":      return "info";
    default:         return "info";
  }
}

function mapCategory(c: string): NotifCategory {
  const map: Record<string, NotifCategory> = {
    fill:      "fill",
    rejection: "rejection",
    margin:    "margin",
    risk:      "risk",
    signal:    "signal",
    kyc:       "kyc",
    wallet:    "wallet",
    system:    "system",
  };
  return map[c?.toLowerCase()] ?? "system";
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount:   0,
  panelOpen:     false,
  preferences:   null,
  historyLoaded: false,

  add: (n) => {
    const notif: Notification = {
      ...n,
      id:        nextId(),
      read:      false,
      timestamp: new Date().toISOString(),
    };
    set((state) => {
      const notifications = [notif, ...state.notifications].slice(0, 200);
      return { notifications, unreadCount: notifications.filter((x) => !x.read).length };
    });
  },

  markRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) => n.id === id ? { ...n, read: true } : n);
      return { notifications, unreadCount: notifications.filter((x) => !x.read).length };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount:   0,
    })),

  remove: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      return { notifications, unreadCount: notifications.filter((x) => !x.read).length };
    }),

  clearAll:     () => set({ notifications: [], unreadCount: 0 }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),

  // ── API actions ────────────────────────────────────────────────────────────────

  loadHistory: async () => {
    if (get().historyLoaded) return;
    try {
      const items = await NotificationsAPI.list(100);
      const mapped: Notification[] = items.map((item) => ({
        id:        item.id,
        category:  mapCategory(item.category),
        severity:  mapPriority(item.priority),
        title:     item.title,
        body:      item.body,
        read:      item.sent,
        replayed:  false,
        timestamp: item.createdAt,
        meta:      item.payload ?? undefined,
      }));

      set((state) => {
        // Merge: history items go at the bottom; real-time notifs (with local IDs) stay on top
        const localIds = new Set(state.notifications.filter((n) => n.id.startsWith("notif_")).map((n) => n.id));
        const realtime = state.notifications.filter((n) => localIds.has(n.id));
        const historyFiltered = mapped.filter(
          (m) => !state.notifications.some((n) => n.id === m.id)
        );
        const merged = [...realtime, ...historyFiltered].slice(0, 200);
        return {
          notifications: merged,
          unreadCount:   merged.filter((x) => !x.read).length,
          historyLoaded: true,
        };
      });
    } catch {
      // Non-fatal — real-time still works
    }
  },

  markReadApi: async (ids) => {
    try {
      await NotificationsAPI.markRead(ids);
      if (ids) {
        for (const id of ids) get().markRead(id);
      } else {
        get().markAllRead();
      }
    } catch {
      // Optimistic local update anyway
      if (ids) for (const id of ids) get().markRead(id);
      else get().markAllRead();
    }
  },

  markAllReadApi: async () => {
    try {
      await NotificationsAPI.markAllRead();
    } finally {
      get().markAllRead();
    }
  },

  loadPreferences: async () => {
    try {
      const prefs = await NotificationsAPI.getPreferences();
      set({ preferences: prefs });
    } catch { /* non-fatal */ }
  },

  updatePreferences: async (prefs) => {
    try {
      const updated = await NotificationsAPI.updatePreferences(prefs);
      set({ preferences: updated });
    } catch { /* non-fatal */ }
  },

  // ── WebSocket subscription ─────────────────────────────────────────────────────

  subscribeWs: () => {
    const { add } = get();

    const unsubFilled = wsClient.on("order.filled", (payload) => {
      const p = payload as Record<string, unknown>;
      add({
        category: "fill",
        severity: "success",
        title:    `Order filled — ${String(p.symbol ?? "")}`,
        body:     `${String(p.side ?? "")} ${String(p.quantity ?? "")} @ ${Number(p.fillPrice ?? p.averageFillPrice ?? 0).toFixed(5)}`,
        replayed: Boolean(p.replayed),
        actionLabel: "View positions",
        actionPath:  "/trading",
        meta: p,
      });
    });

    const unsubExecution = wsClient.on("execution", (payload) => {
      const p = payload as Record<string, unknown>;
      if (p.status === "FILLED") {
        add({
          category: "fill",
          severity: "success",
          title:    `Order filled — ${String(p.symbol ?? "")}`,
          body:     `${String(p.side ?? "")} filled`,
          replayed: Boolean(p.replayed),
          actionLabel: "View positions",
          actionPath:  "/trading",
          meta: p,
        });
      } else if (p.status === "REJECTED") {
        add({
          category: "rejection",
          severity: "warning",
          title:    `Order rejected — ${String(p.symbol ?? "")}`,
          body:     String(p.reason ?? p.rejectionReason ?? "Rejected by risk engine"),
          replayed: Boolean(p.replayed),
          actionPath: "/trading",
          meta: p,
        });
      }
    });

    const unsubRisk = wsClient.on("risk.warning", (payload) => {
      const p   = payload as { warning?: Record<string, unknown> };
      const w   = p?.warning ?? (payload as Record<string, unknown>);
      const sev = String(w.severity ?? "warning").toLowerCase() as NotifSeverity;
      add({
        category: "risk",
        severity: sev,
        title:    "Risk alert",
        body:     String(w.message ?? w.regulatoryText ?? "Risk threshold breached"),
        replayed: false,
        actionLabel: "View risk",
        actionPath:  "/risk",
        meta: w,
      });
    });

    const unsubMargin = wsClient.on("margin.warning", (payload) => {
      const p = payload as Record<string, unknown>;
      add({
        category:    "margin",
        severity:    "critical",
        title:       "Margin warning",
        body:        String(p.message ?? "Margin level critical"),
        replayed:    Boolean(p.replayed),
        actionLabel: "View risk",
        actionPath:  "/risk",
        meta: p,
      });
    });

    const unsubSignal = wsClient.on("signal.generated", (payload) => {
      const p    = payload as Record<string, unknown>;
      const conf = Number(p.confidence ?? 0);
      if (conf < 65) return;
      add({
        category:    "signal",
        severity:    "info",
        title:       `OLOS signal — ${String(p.symbol ?? "")}`,
        body:        `${String(p.signalType ?? p.direction ?? "Signal")} · ${conf.toFixed(0)}% confidence`,
        replayed:    Boolean(p.replayed),
        actionLabel: "Trade",
        actionPath:  `/trading?symbol=${String(p.symbol ?? "")}`,
        meta: p,
      });
    });

    const unsubWallet = wsClient.on("wallet.updated", (payload) => {
      const p    = payload as Record<string, unknown>;
      const type = String(p.type ?? "");
      if (!type || type === "MARGIN_LOCK") return;
      add({
        category:    "wallet",
        severity:    "info",
        title:       "Wallet updated",
        body:        `${type.replace(/_/g, " ")} — ${String(p.reference ?? "")}`,
        replayed:    Boolean(p.replayed),
        actionLabel: "View wallet",
        actionPath:  "/wallet",
        meta: p,
      });
    });

    const unsubClosed = wsClient.on("position.closed", (payload) => {
      const p   = payload as Record<string, unknown>;
      const pnl = Number(p.realizedPnl ?? 0);
      add({
        category:    "fill",
        severity:    pnl >= 0 ? "success" : "warning",
        title:       `Position closed — ${String(p.symbol ?? "")}`,
        body:        `Realized P&L: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} USD`,
        replayed:    Boolean(p.replayed),
        actionLabel: "View history",
        actionPath:  "/portfolio",
        meta: p,
      });
    });

    const unsubKyc = wsClient.on("kyc.updated", (payload) => {
      const p = payload as Record<string, unknown>;
      add({
        category:    "kyc",
        severity:    p.status === "approved" ? "success" : "warning",
        title:       "KYC status updated",
        body:        `KYC is now ${String(p.status ?? "updated")}`,
        replayed:    false,
        actionLabel: "View profile",
        actionPath:  "/profile",
        meta: p,
      });
    });

    const unsubConnected = wsClient.on("ws.connected", () => {
      void get().loadHistory();
    });

    return () => {
      unsubFilled();
      unsubExecution();
      unsubRisk();
      unsubMargin();
      unsubSignal();
      unsubWallet();
      unsubClosed();
      unsubKyc();
      unsubConnected();
    };
  },
}));
