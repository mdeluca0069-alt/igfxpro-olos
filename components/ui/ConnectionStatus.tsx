import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { wsManager } from "../../api/websocket";

type Status = "connected" | "reconnecting" | "offline";

// Only show the banner after the connection has been down for this long.
// This hides the initial-load flicker and brief network blips from clients.
const GRACE_MS = 7_000;

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function ConnectionStatus() {
  const [status, setStatus]             = useState<Status>("reconnecting");
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [now, setNow]                   = useState(Date.now());
  const [visible, setVisible]           = useState(false);
  const graceTimer                      = useRef<ReturnType<typeof setTimeout>>();

  const showAfterGrace = () => {
    clearTimeout(graceTimer.current);
    graceTimer.current = setTimeout(() => setVisible(true), GRACE_MS);
  };

  useEffect(() => {
    const onConnected = () => {
      clearTimeout(graceTimer.current);
      setStatus("connected");
      setOfflineSince(null);
      setVisible(false);
    };
    const onReconnecting = () => {
      setStatus("reconnecting");
      setOfflineSince((p) => p ?? Date.now());
      showAfterGrace();
    };
    const onClosed = () => {
      setStatus("offline");
      setOfflineSince((p) => p ?? Date.now());
      showAfterGrace();
    };

    const unsub = [
      wsManager.on("ws.connected",    onConnected),
      wsManager.on("ws.reconnecting", onReconnecting),
      wsManager.on("ws.closed",       onClosed),
      wsManager.on("system.connected", onConnected),
    ];

    if (wsManager.readyState === "open") {
      setStatus("connected");
    } else if (wsManager.readyState === "connecting") {
      setStatus("reconnecting");
      showAfterGrace();
    } else {
      setStatus("offline");
      setOfflineSince((p) => p ?? Date.now());
      showAfterGrace();
    }

    return () => {
      unsub.forEach((fn) => fn());
      clearTimeout(graceTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update "offline since" duration every second
  useEffect(() => {
    if (status === "connected") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  if (status === "connected" || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
        "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-xl backdrop-blur-sm",
        status === "reconnecting"
          ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
          : "border-rose-500/40  bg-rose-500/15  text-rose-200"
      )}
    >
      {status === "reconnecting" ? (
        <>
          <RotateCcw size={13} className="animate-spin" aria-hidden />
          Reconnecting to market data…
        </>
      ) : (
        <>
          <WifiOff size={13} aria-hidden />
          Market data offline
          {offlineSince && ` · ${formatDuration(now - offlineSince)}`}
        </>
      )}
    </div>
  );
}

/** Compact WS status badge for the header */
export function WsStatusBadge() {
  const [status, setStatus] = useState<Status>("offline");

  useEffect(() => {
    const on = wsManager.on("ws.connected",    () => setStatus("connected"));
    const rc = wsManager.on("ws.reconnecting", () => setStatus("reconnecting"));
    const cl = wsManager.on("ws.closed",       () => setStatus("offline"));
    const sc = wsManager.on("system.connected", () => setStatus("connected"));

    if (wsManager.readyState === "open") setStatus("connected");

    return () => { on(); rc(); cl(); sc(); };
  }, []);

  return (
    <div
      aria-label={`Market data: ${status}`}
      title={`Market data: ${status}`}
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
        status === "connected"    && "bg-emerald-400/10 text-emerald-300",
        status === "reconnecting" && "bg-amber-400/10   text-amber-300",
        status === "offline"      && "bg-slate-800       text-slate-500"
      )}
    >
      {status === "connected" ? (
        <><Wifi size={10} aria-hidden /> Live</>
      ) : status === "reconnecting" ? (
        <><RotateCcw size={10} className="animate-spin" aria-hidden /> Syncing</>
      ) : (
        <><WifiOff size={10} aria-hidden /> Offline</>
      )}
    </div>
  );
}

export default ConnectionStatus;
