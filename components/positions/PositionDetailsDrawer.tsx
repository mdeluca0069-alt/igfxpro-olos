import { useState, useEffect, useCallback, memo } from "react";
import { motion } from "framer-motion";
import {
  X, TrendingUp, TrendingDown, Target, Crosshair,
  ArrowLeftRight, AlertCircle, Clock, DollarSign,
  BarChart2, Activity,
} from "lucide-react";
import { getApiClient } from "../../api/httpClient";
import { useTradingStore, type Position } from "../../store/trading.store";

const SD: Record<string, number> = {
  USDJPY: 3, BTCUSD: 0, ETHUSD: 2, US500: 1, US100: 1, XAUUSD: 2, WTI: 2,
};
const dp = (s: string) => SD[s] ?? 5;

function formatDuration(openedAt: string): string {
  const ms = Date.now() - new Date(openedAt).getTime();
  const s  = Math.floor(ms / 1000);
  const m  = Math.floor(s / 60);
  const h  = Math.floor(m / 60);
  const d  = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

interface Props {
  position:       Position;
  isHedged:       boolean;
  onClose:        () => void;
  onPartialClose: (p: Position) => void;
  onHedgeToggle:  (id: string) => void;
}

type ActionState = "idle" | "submitting" | "error";

export const PositionDetailsDrawer = memo(function PositionDetailsDrawer({
  position, isHedged, onClose, onPartialClose, onHedgeToggle,
}: Props) {
  const [slRaw,      setSlRaw]      = useState(position.stopLoss?.toFixed(dp(position.symbol))  ?? "");
  const [tpRaw,      setTpRaw]      = useState(position.takeProfit?.toFixed(dp(position.symbol)) ?? "");
  const [modState,   setModState]   = useState<ActionState>("idle");
  const [closeState, setCloseState] = useState<ActionState>("idle");
  const [revState,   setRevState]   = useState<ActionState>("idle");
  const [bbeState,   setBbeState]   = useState<ActionState>("idle");
  const [modError,   setModError]   = useState<string | null>(null);
  const [actError,   setActError]   = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  const { fetchPositions, placeOrder, closePosition } = useTradingStore(s => ({
    fetchPositions: s.fetchPositions,
    placeOrder:     s.placeOrder,
    closePosition:  s.closePosition,
  }));

  useEffect(() => {
    const id = setInterval(() => forceUpdate(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Sync SL/TP inputs when position updates
  useEffect(() => {
    setSlRaw(position.stopLoss?.toFixed(dp(position.symbol))  ?? "");
    setTpRaw(position.takeProfit?.toFixed(dp(position.symbol)) ?? "");
  }, [position.stopLoss, position.takeProfit, position.symbol]);

  const d       = dp(position.symbol);
  const isBuy   = position.side === "BUY";
  const pnlPos  = position.pnl >= 0;
  const notional = position.quantity * position.markPrice;

  const modifyPosition = useCallback(async (patch: { stopLoss?: number | null; takeProfit?: number | null }) => {
    setModState("submitting");
    setModError(null);
    try {
      await getApiClient().put(
        `/api/v1/trading/position/${encodeURIComponent(position.id)}`,
        patch,
      );
      await fetchPositions();
      setModState("idle");
    } catch (err: unknown) {
      setModError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Modify failed",
      );
      setModState("error");
    }
  }, [position.id, fetchPositions]);

  async function handleModifySubmit(e: React.FormEvent) {
    e.preventDefault();
    const sl = slRaw !== "" ? parseFloat(slRaw) : null;
    const tp = tpRaw !== "" ? parseFloat(tpRaw) : null;
    if ((sl !== null && isNaN(sl)) || (tp !== null && isNaN(tp))) return;
    await modifyPosition({ stopLoss: sl, takeProfit: tp });
  }

  async function handleBreakeven() {
    setBbeState("submitting");
    setActError(null);
    try {
      await getApiClient().put(
        `/api/v1/trading/position/${encodeURIComponent(position.id)}`,
        { stopLoss: position.entryPrice },
      );
      await fetchPositions();
      setBbeState("idle");
    } catch {
      setBbeState("error");
      setActError("Move to breakeven failed");
    }
  }

  async function handleClose() {
    setCloseState("submitting");
    setActError(null);
    const ok = await closePosition(position.id);
    if (ok) {
      onClose();
    } else {
      setCloseState("error");
      setActError("Close position failed");
    }
  }

  async function handleReverse() {
    setRevState("submitting");
    setActError(null);
    const closed = await closePosition(position.id);
    if (!closed) {
      setRevState("error");
      setActError("Failed to close position for reversal");
      return;
    }
    const order = await placeOrder({
      symbol:   position.symbol,
      side:     isBuy ? "SELL" : "BUY",
      type:     "MARKET",
      quantity: position.quantity,
      leverage: position.leverage,
    });
    if (!order) {
      setRevState("error");
      setActError("Position closed, but reverse order failed");
      return;
    }
    setRevState("idle");
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-white/[0.08] bg-[#080f1c] shadow-[-40px_0_80px_rgba(0,0,0,0.6)]"
        role="complementary"
        aria-label="Position details"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-black text-white">{position.symbol}</span>
              <span className={[
                "rounded-full px-2.5 py-0.5 text-[10px] font-black",
                isBuy
                  ? "bg-emerald-400/15 text-emerald-400"
                  : "bg-rose-400/15 text-rose-400",
              ].join(" ")}>
                {isBuy ? "▲" : "▼"} {position.side}
              </span>
              {isHedged && (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                  HEDGE
                </span>
              )}
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-slate-600">
              ID: {position.id.slice(0, 16)}…
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Live P&L banner */}
          <div className={[
            "border-b border-white/[0.04] px-5 py-4",
            pnlPos ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]",
          ].join(" ")}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] text-slate-500">Unrealized P&L</p>
                <p className={`mt-0.5 font-mono text-[28px] font-black tabular-nums ${pnlPos ? "text-emerald-400" : "text-rose-400"}`}>
                  {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500">P&L %</p>
                <p className={`font-mono text-[18px] font-bold tabular-nums ${pnlPos ? "text-emerald-400" : "text-rose-400"}`}>
                  {(position.pnlPercent ?? 0) >= 0 ? "+" : ""}{(position.pnlPercent ?? 0).toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600">
              <Clock size={10} />
              <span suppressHydrationWarning>Open {formatDuration(position.openedAt)}</span>
              <span className="mx-1">·</span>
              <span>Opened {formatTs(position.openedAt)}</span>
            </div>
          </div>

          {/* Position metrics */}
          <div className="border-b border-white/[0.04] px-5 py-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
              Position metrics
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: DollarSign, label: "Entry price",   val: position.entryPrice.toFixed(d) },
                { icon: Activity,   label: "Mark price",    val: position.markPrice.toFixed(d)  },
                { icon: BarChart2,  label: "Quantity",      val: `${position.quantity.toFixed(2)} lots` },
                { icon: BarChart2,  label: "Leverage",      val: `1:${position.leverage}` },
                { icon: DollarSign, label: "Margin used",   val: `$${position.marginUsed.toFixed(2)}` },
                { icon: DollarSign, label: "Notional",      val: `$${notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="rounded-xl bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Icon size={10} className="text-slate-700" />
                    <p className="text-[10px] text-slate-600">{label}</p>
                  </div>
                  <p className="mt-0.5 font-mono text-[13px] font-bold text-white">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SL/TP editor */}
          <div className="border-b border-white/[0.04] px-5 py-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
              Stop loss / Take profit
            </p>
            <form onSubmit={handleModifySubmit} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="drawer-sl" className="mb-1 block text-[11px] text-rose-400">
                    Stop Loss
                  </label>
                  <input
                    id="drawer-sl"
                    type="number"
                    value={slRaw}
                    onChange={e => setSlRaw(e.target.value)}
                    step="any"
                    placeholder="—"
                    className="w-full rounded-xl border border-rose-400/20 bg-rose-400/[0.04] px-3 py-2.5 font-mono text-[13px] font-bold text-white outline-none placeholder:text-slate-700 focus:border-rose-400/50"
                  />
                </div>
                <div>
                  <label htmlFor="drawer-tp" className="mb-1 block text-[11px] text-emerald-400">
                    Take Profit
                  </label>
                  <input
                    id="drawer-tp"
                    type="number"
                    value={tpRaw}
                    onChange={e => setTpRaw(e.target.value)}
                    step="any"
                    placeholder="—"
                    className="w-full rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-2.5 font-mono text-[13px] font-bold text-white outline-none placeholder:text-slate-700 focus:border-emerald-400/50"
                  />
                </div>
              </div>

              {modError && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
                  <AlertCircle size={11} />
                  <span>{modError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={modState === "submitting"}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] py-2.5 text-[12px] font-bold text-white transition hover:bg-white/[0.09] disabled:opacity-40"
              >
                {modState === "submitting" ? "Saving…" : "Save SL / TP"}
              </button>
            </form>
          </div>

          {/* Quick actions */}
          <div className="px-5 py-4 space-y-2">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">
              Actions
            </p>

            {actError && (
              <div className="flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2">
                <AlertCircle size={11} className="shrink-0 text-rose-400" />
                <p className="text-[11px] text-rose-400">{actError}</p>
              </div>
            )}

            {/* Breakeven */}
            <button
              onClick={handleBreakeven}
              disabled={bbeState === "submitting" || closeState === "submitting" || revState === "submitting"}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition hover:border-amber-400/25 hover:bg-amber-400/[0.04] disabled:opacity-40"
            >
              <Crosshair size={15} className="shrink-0 text-amber-400" />
              <div>
                <p className="text-[13px] font-bold text-white">Move to breakeven</p>
                <p className="text-[11px] text-slate-600">Set SL = entry {position.entryPrice.toFixed(d)}</p>
              </div>
            </button>

            {/* Partial close */}
            <button
              onClick={() => onPartialClose(position)}
              disabled={closeState === "submitting" || revState === "submitting"}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition hover:border-cyan-400/25 hover:bg-cyan-400/[0.04] disabled:opacity-40"
            >
              <Target size={15} className="shrink-0 text-cyan-400" />
              <div>
                <p className="text-[13px] font-bold text-white">Partial close</p>
                <p className="text-[11px] text-slate-600">Close a portion of this position</p>
              </div>
            </button>

            {/* Reverse */}
            <button
              onClick={handleReverse}
              disabled={revState === "submitting" || closeState === "submitting"}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left transition hover:border-violet-400/25 hover:bg-violet-400/[0.04] disabled:opacity-40"
            >
              <ArrowLeftRight size={15} className="shrink-0 text-violet-400" />
              <div>
                <p className="text-[13px] font-bold text-white">
                  {revState === "submitting" ? "Reversing…" : "Reverse position"}
                </p>
                <p className="text-[11px] text-slate-600">
                  Close + open {isBuy ? "SELL" : "BUY"} {position.quantity.toFixed(2)} lots
                </p>
              </div>
            </button>

            {/* Hedge flag */}
            <button
              onClick={() => onHedgeToggle(position.id)}
              className={[
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                isHedged
                  ? "border-amber-400/30 bg-amber-400/[0.07] hover:bg-amber-400/[0.1]"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-amber-400/20 hover:bg-amber-400/[0.04]",
              ].join(" ")}
            >
              <span className="text-amber-400 text-[15px]">⚑</span>
              <div>
                <p className="text-[13px] font-bold text-white">
                  {isHedged ? "Remove hedge flag" : "Flag as hedge"}
                </p>
                <p className="text-[11px] text-slate-600">Visual marker only — local session</p>
              </div>
            </button>

            {/* Full close */}
            <button
              onClick={handleClose}
              disabled={closeState === "submitting" || revState === "submitting"}
              className="flex w-full items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-left transition hover:bg-rose-400/[0.12] disabled:opacity-40"
            >
              {isBuy
                ? <TrendingDown size={15} className="shrink-0 text-rose-400" />
                : <TrendingUp   size={15} className="shrink-0 text-rose-400" />}
              <div>
                <p className="text-[13px] font-bold text-rose-300">
                  {closeState === "submitting" ? "Closing…" : "Close position"}
                </p>
                <p className="text-[11px] text-rose-500/70">Market order at current price</p>
              </div>
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
});
