/**
 * Notification Center — slide-in panel with real-time alerts from WebSocket + outbox replay.
 * Driven entirely by useNotificationStore — no mock data.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Bell, BellOff, Bot, CheckCheck,
  CheckCircle2, ChevronRight, Clock, DollarSign,
  Radio, ShieldAlert, Trash2, TrendingUp, X,
} from "lucide-react";
import { useNotificationStore, type Notification, type NotifCategory } from "../../store/notification.store";

// ─── Category icon mapping ────────────────────────────────────────────────────

const CATEGORY_META: Record<NotifCategory, { icon: React.ElementType; cls: string }> = {
  fill:      { icon: TrendingUp,   cls: "text-emerald-400" },
  rejection: { icon: X,            cls: "text-rose-400"    },
  margin:    { icon: ShieldAlert,  cls: "text-rose-400"    },
  risk:      { icon: AlertTriangle,cls: "text-amber-400"   },
  signal:    { icon: Bot,          cls: "text-cyan-400"    },
  kyc:       { icon: CheckCircle2, cls: "text-violet-400"  },
  wallet:    { icon: DollarSign,   cls: "text-cyan-400"    },
  system:    { icon: Radio,        cls: "text-slate-400"   },
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-rose-500/20 bg-rose-500/5",
  warning:  "border-amber-500/15 bg-amber-500/5",
  success:  "border-emerald-500/15 bg-emerald-500/5",
  info:     "border-slate-800/60 bg-slate-900/30",
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Single notification card ─────────────────────────────────────────────────

function NotifCard({ notif }: { notif: Notification }) {
  const markRead  = useNotificationStore((s) => s.markRead);
  const remove    = useNotificationStore((s) => s.remove);
  const meta      = CATEGORY_META[notif.category];
  const Icon      = meta.icon;
  const border    = SEVERITY_BORDER[notif.severity] ?? SEVERITY_BORDER.info;

  return (
    <div
      className={`group relative rounded-xl border p-3.5 transition ${border} ${!notif.read ? "ring-1 ring-inset ring-white/5" : "opacity-70"}`}
      onClick={() => markRead(notif.id)}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800`}>
          <Icon size={14} className={meta.cls} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] font-bold text-white leading-tight">{notif.title}</p>
            <button
              onClick={(e) => { e.stopPropagation(); remove(notif.id); }}
              className="shrink-0 p-0.5 text-slate-700 opacity-0 transition group-hover:opacity-100 hover:text-slate-400"
            >
              <X size={11} />
            </button>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500 line-clamp-2">{notif.body}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Clock size={9} className="text-slate-700" />
            <span className="text-[9px] text-slate-700">{relativeTime(notif.timestamp)}</span>
            {notif.replayed && (
              <span className="rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-cyan-400">REPLAYED</span>
            )}
          </div>
        </div>
      </div>
      {notif.actionLabel && notif.actionPath && (
        <Link
          to={notif.actionPath}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
        >
          {notif.actionLabel} <ChevronRight size={9} />
        </Link>
      )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function NotificationCenter() {
  const notifications  = useNotificationStore((s) => s.notifications);
  const unreadCount    = useNotificationStore((s) => s.unreadCount);
  const panelOpen      = useNotificationStore((s) => s.panelOpen);
  const setPanelOpen   = useNotificationStore((s) => s.setPanelOpen);
  const markAllRead    = useNotificationStore((s) => s.markAllRead);
  const clearAll       = useNotificationStore((s) => s.clearAll);

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [panelOpen, setPanelOpen]);

  return (
    <>
      {/* Bell trigger button */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? <Bell size={16} /> : <BellOff size={16} />}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-in panel */}
      {panelOpen && (
        <div
          ref={panelRef}
          className="fixed right-4 top-16 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-800 bg-[#05070d] shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
          style={{ maxHeight: "calc(100vh - 80px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-slate-400" />
              <p className="text-[13px] font-bold text-white">Notifications</p>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  title="Mark all read"
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] text-slate-500 hover:bg-slate-800 hover:text-white">
                  <CheckCheck size={11} /> All read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll}
                  title="Clear all"
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-800 hover:text-slate-400">
                  <Trash2 size={11} />
                </button>
              )}
              <button onClick={() => setPanelOpen(false)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-800 hover:text-white">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bell size={24} className="mb-3 text-slate-700" />
                <p className="text-sm font-semibold text-slate-600">No notifications</p>
                <p className="mt-1 text-[11px] text-slate-700">
                  Order fills, risk alerts, and AI signals appear here
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 p-3">
                {notifications.map((n) => <NotifCard key={n.id} notif={n} />)}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-800 px-4 py-2.5">
              <p className="text-[10px] text-slate-700">
                Showing {notifications.length} notification{notifications.length !== 1 ? "s" : ""} ·
                Unread: {unreadCount}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default NotificationCenter;
