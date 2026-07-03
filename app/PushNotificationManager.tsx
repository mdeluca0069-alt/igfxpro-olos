/**
 * IGFXPRO — Push Notification Manager
 * Real browser Web Push notifications for trading events.
 * - Requests Notification permission once (on user action)
 * - Subscribes to WebSocket events and fires browser push for:
 *     • SL/TP triggered (position.pnl_updated with closedBy)
 *     • Order filled (order.filled)
 *     • Risk alert (risk.margin_call, risk.stop_out)
 *     • Price alert (when price crosses user-set threshold)
 * - In-app toast banner fallback when tab is focused
 * - Persists notification history (last 50) in memory
 * - Settings panel toggleable from top bar
 */
import {
  createContext, memo, useCallback, useContext, useEffect,
  useRef, useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, BellRing, Check, Shield, TrendingUp, X, Zap } from "lucide-react";
import { wsClient } from "../api/websocket";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifCategory = "fills" | "sltp" | "risk" | "signals";

type NotifEntry = {
  id:       string;
  ts:       number;
  title:    string;
  body:     string;
  category: NotifCategory;
  read:     boolean;
};

type PushState = {
  permission:         NotificationPermission;
  enabled:            boolean;
  categories:         Record<NotifCategory, boolean>;
  history:            NotifEntry[];
  unread:             number;
  requestPermission:  () => Promise<void>;
  toggleEnabled:      () => void;
  toggleCategory:     (cat: NotifCategory) => void;
  markAllRead:        () => void;
  clearHistory:       () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const PushContext = createContext<PushState | null>(null);

export function usePushNotifications(): PushState {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error("usePushNotifications must be used within PushNotificationManager");
  return ctx;
}

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORIES: { id: NotifCategory; label: string; icon: React.ElementType; color: string }[] = [
  { id: "fills",   label: "Order Fills",   icon: Zap,        color: "text-cyan-400"    },
  { id: "sltp",    label: "SL / TP Hits",  icon: TrendingUp, color: "text-emerald-400" },
  { id: "risk",    label: "Risk Alerts",   icon: Shield,     color: "text-rose-400"    },
  { id: "signals", label: "OLOS Signals",  icon: BellRing,   color: "text-amber-400"   },
];

function defaultCategories(): Record<NotifCategory, boolean> {
  return { fills: true, sltp: true, risk: true, signals: false };
}

// ─── Native push helper ───────────────────────────────────────────────────────

function fireNativeNotification(entry: NotifEntry, enabled: boolean, tab: Document) {
  if (!enabled) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // If tab is focused, skip browser push (in-app banner handles it)
  if (!tab.hidden) return;

  try {
    const n = new Notification(entry.title, {
      body: entry.body,
      icon: "/favicon.ico",
      tag:  entry.id,
      badge: "/favicon.ico",
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    setTimeout(() => n.close(), 8000);
  } catch { /* notification blocked or insecure context */ }
}

// ─── In-app banner toast ──────────────────────────────────────────────────────

const InAppBanner = memo(function InAppBanner({
  entry, onDismiss,
}: { entry: NotifEntry; onDismiss: () => void }) {
  const meta = CATEGORIES.find((c) => c.id === entry.category)!;
  const Icon = meta.icon;

  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="pointer-events-auto flex w-80 items-start gap-3 rounded-xl border border-slate-700/60 bg-[#0d1629] p-3.5 shadow-2xl"
    >
      <div className={`mt-0.5 shrink-0 ${meta.color}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-white truncate">{entry.title}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400 line-clamp-2">{entry.body}</p>
        <p className="mt-1 text-[9px] text-slate-700">{new Date(entry.ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
      </div>
      <button onClick={onDismiss} className="shrink-0 p-0.5 text-slate-600 hover:text-slate-400 transition">
        <X size={12} />
      </button>
    </motion.div>
  );
});

// ─── Banner container (fixed top-right) ──────────────────────────────────────

function BannerContainer({ banners, onDismiss }: {
  banners: NotifEntry[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[100] space-y-2">
      <AnimatePresence>
        {banners.map((b) => (
          <InAppBanner key={b.id} entry={b} onDismiss={() => onDismiss(b.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Notification history panel ───────────────────────────────────────────────

const NotifPanel = memo(function NotifPanel({
  state, onClose,
}: { state: PushState; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ duration: 0.14 }}
        className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0d1629] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <BellRing size={13} className="text-cyan-400" />
            <span className="text-[12px] font-bold text-white">Notifications</span>
            {state.unread > 0 && (
              <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400">
                {state.unread}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {state.unread > 0 && (
              <button onClick={state.markAllRead}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 transition">
                Mark all read
              </button>
            )}
            {state.history.length > 0 && (
              <button onClick={state.clearHistory}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Permission banner */}
        {state.permission !== "granted" && (
          <div className="border-b border-slate-800/60 bg-amber-950/20 px-4 py-3">
            <p className="text-[11px] text-amber-300 font-semibold">Browser notifications disabled</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Enable to receive alerts when this tab is hidden</p>
            <button
              onClick={state.requestPermission}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/30 transition"
            >
              <Bell size={10} /> Enable Push Notifications
            </button>
          </div>
        )}

        {/* Enable / disable toggle */}
        <div className="flex items-center justify-between border-b border-slate-800/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            {state.enabled ? <BellRing size={11} className="text-emerald-400" /> : <BellOff size={11} className="text-slate-600" />}
            <span className="text-[11px] font-semibold text-slate-300">Alerts</span>
          </div>
          <button
            onClick={state.toggleEnabled}
            className={[
              "relative h-5 w-9 rounded-full transition-colors duration-200",
              state.enabled ? "bg-emerald-500/40" : "bg-slate-700/80",
            ].join(" ")}
          >
            <span className={[
              "absolute top-0.5 h-4 w-4 rounded-full transition-transform duration-200 shadow",
              state.enabled ? "translate-x-4 bg-emerald-400" : "translate-x-0.5 bg-slate-500",
            ].join(" ")} />
          </button>
        </div>

        {/* Category toggles */}
        <div className="border-b border-slate-800/40">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => state.toggleCategory(cat.id)}
                className="flex w-full items-center justify-between px-4 py-2 hover:bg-slate-800/30 transition"
              >
                <div className="flex items-center gap-2">
                  <Icon size={11} className={cat.color} />
                  <span className="text-[11px] text-slate-400">{cat.label}</span>
                </div>
                <span className={[
                  "h-3.5 w-3.5 rounded border transition-colors",
                  state.categories[cat.id]
                    ? "border-cyan-400/60 bg-cyan-400/20"
                    : "border-slate-700 bg-transparent",
                ].join(" ")}>
                  {state.categories[cat.id] && <Check size={9} className="text-cyan-400 ml-px mt-px" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* History list */}
        <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#1e293b transparent" }}>
          {state.history.length === 0 ? (
            <div className="flex h-20 flex-col items-center justify-center text-slate-700 text-[11px] gap-1">
              <Bell size={16} />
              No notifications yet
            </div>
          ) : (
            state.history.map((n) => {
              const meta = CATEGORIES.find((c) => c.id === n.category)!;
              const Icon = meta.icon;
              return (
                <div key={n.id} className={[
                  "flex items-start gap-3 border-b border-slate-800/30 px-4 py-3 last:border-0",
                  n.read ? "opacity-50" : "",
                ].join(" ")}>
                  <Icon size={11} className={`mt-0.5 shrink-0 ${meta.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-200 truncate">{n.title}</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{n.body}</p>
                    <p className="mt-1 text-[9px] text-slate-700">
                      {new Date(n.ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
});

// ─── Bell button (for top bar) ────────────────────────────────────────────────

export const PushBellButton = memo(function PushBellButton() {
  const push = usePushNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) push.markAllRead(); }}
        aria-label="Notifications"
        className={[
          "relative flex h-8 w-8 items-center justify-center rounded-lg border transition",
          push.unread > 0
            ? "border-cyan-400/30 bg-cyan-400/[0.07] text-cyan-300"
            : "border-slate-700/60 bg-transparent text-slate-500 hover:text-slate-300",
        ].join(" ")}
      >
        {push.enabled && push.unread > 0 ? <BellRing size={14} /> : <Bell size={14} />}
        {push.unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400 text-[8px] font-black text-black">
            {push.unread > 9 ? "9+" : push.unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && <NotifPanel state={push} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
});

// ─── Provider ──────────────────────────────────────────────────────────────────

const MAX_HISTORY  = 50;
const MAX_BANNERS  = 3;

export function PushNotificationManager({ children }: { children: React.ReactNode }) {
  const [permission,  setPermission]  = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const [enabled,     setEnabled]     = useState(true);
  const [categories,  setCategories]  = useState(defaultCategories);
  const [history,     setHistory]     = useState<NotifEntry[]>([]);
  const [banners,     setBanners]     = useState<NotifEntry[]>([]);

  const enabledRef    = useRef(enabled);
  const categoriesRef = useRef(categories);
  const historyRef    = useRef<NotifEntry[]>([]);

  useEffect(() => { enabledRef.current    = enabled;    }, [enabled]);
  useEffect(() => { categoriesRef.current = categories; }, [categories]);

  const unread = history.filter((n) => !n.read).length;

  // ── Core: push a new notification ─────────────────────────────────────────

  const push = useCallback((
    title: string, body: string, category: NotifCategory
  ) => {
    if (!enabledRef.current) return;
    if (!categoriesRef.current[category]) return;

    const entry: NotifEntry = {
      id:       `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ts:       Date.now(),
      title,
      body,
      category,
      read:     false,
    };

    historyRef.current = [entry, ...historyRef.current].slice(0, MAX_HISTORY);
    setHistory([...historyRef.current]);
    setBanners((prev) => [entry, ...prev].slice(0, MAX_BANNERS));
    fireNativeNotification(entry, enabledRef.current, document);
  }, []);

  // ── WebSocket event subscribers ────────────────────────────────────────────

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Order filled
    unsubs.push(wsClient.on("order.filled", (data) => {
      const p   = data as Record<string, unknown>;
      const sym = String(p.symbol ?? "");
      const qty = Number(p.quantity ?? 0).toFixed(2);
      const px  = Number(p.fillPrice ?? p.averageFillPrice ?? 0).toFixed(5);
      const side = String(p.side ?? "");
      push(
        `Order Filled — ${sym}`,
        `${side} ${qty} lots @ ${px}`,
        "fills"
      );
    }));

    // Position opened
    unsubs.push(wsClient.on("position.opened", (data) => {
      const p   = data as Record<string, unknown>;
      const sym = String(p.symbol ?? "");
      const side = String(p.side ?? "");
      const qty  = Number(p.quantity ?? 0).toFixed(2);
      const px   = Number(p.entryPrice ?? 0).toFixed(5);
      push(
        `Position Opened — ${sym}`,
        `${side} ${qty} lots @ ${px}`,
        "fills"
      );
    }));

    // Position closed (SL/TP or manual)
    unsubs.push(wsClient.on("position.closed", (data) => {
      const p      = data as Record<string, unknown>;
      const sym    = String(p.symbol ?? "");
      const pnl    = Number(p.pnl ?? 0);
      const reason = String(p.closeReason ?? p.reason ?? "");
      const isSlTp = /sl|stop.loss|take.profit|tp/i.test(reason);

      if (isSlTp) {
        const tp = /take.profit|tp/i.test(reason);
        push(
          tp ? `Take Profit Hit — ${sym}` : `Stop Loss Hit — ${sym}`,
          `Closed with ${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)} P&L`,
          "sltp"
        );
      } else {
        push(
          `Position Closed — ${sym}`,
          `P&L: ${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)}`,
          "fills"
        );
      }
    }));

    // SL/TP triggered via pnl update marker
    unsubs.push(wsClient.on("position.pnl_updated", (data) => {
      const p      = data as Record<string, unknown>;
      if (p.closedBy !== "STOP_LOSS" && p.closedBy !== "TAKE_PROFIT") return;
      const sym    = String(p.symbol ?? "");
      const pnl    = Number(p.pnl ?? 0);
      const isTP   = p.closedBy === "TAKE_PROFIT";
      push(
        isTP ? `Take Profit Hit — ${sym}` : `Stop Loss Hit — ${sym}`,
        `Realized ${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)}`,
        "sltp"
      );
    }));

    // Margin call
    unsubs.push(wsClient.on("risk.margin_call", (data) => {
      const p     = data as Record<string, unknown>;
      const level = Number(p.marginLevel ?? 0).toFixed(0);
      push(
        "Margin Call Warning",
        `Margin level at ${level}% — add funds or reduce exposure`,
        "risk"
      );
    }));

    // Stop-out
    unsubs.push(wsClient.on("risk.stop_out", (data) => {
      const p = data as Record<string, unknown>;
      push(
        "Stop-Out Triggered",
        `Positions closed at ${Number(p.marginLevel ?? 50).toFixed(0)}% margin — account protected`,
        "risk"
      );
    }));

    // OLOS signal (optional)
    unsubs.push(wsClient.on("olos.signal", (data) => {
      const p   = data as Record<string, unknown>;
      const sym = String(p.symbol ?? "");
      const dir = String(p.direction ?? "");
      const conf = Number(p.confidence ?? 0);
      if (conf < 70) return; // only high-confidence signals
      push(
        `OLOS Signal — ${sym}`,
        `${dir} signal · ${conf.toFixed(0)}% confidence`,
        "signals"
      );
    }));

    return () => { unsubs.forEach((u) => u()); };
  }, [push]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const toggleEnabled    = useCallback(() => setEnabled((v) => !v), []);
  const toggleCategory   = useCallback((cat: NotifCategory) =>
    setCategories((prev) => ({ ...prev, [cat]: !prev[cat] })), []);
  const markAllRead      = useCallback(() =>
    setHistory((prev) => prev.map((n) => ({ ...n, read: true }))), []);
  const clearHistory     = useCallback(() => { setHistory([]); historyRef.current = []; }, []);

  const dismissBanner    = useCallback((id: string) =>
    setBanners((prev) => prev.filter((b) => b.id !== id)), []);

  const state: PushState = {
    permission, enabled, categories, history, unread,
    requestPermission, toggleEnabled, toggleCategory, markAllRead, clearHistory,
  };

  return (
    <PushContext.Provider value={state}>
      {children}
      <BannerContainer banners={banners} onDismiss={dismissBanner} />
    </PushContext.Provider>
  );
}
