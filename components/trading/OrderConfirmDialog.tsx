import { useEffect, useRef } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, X } from "lucide-react";
import clsx from "clsx";

export type OrderSide   = "BUY" | "SELL";
export type OrderType   = "MARKET" | "LIMIT" | "STOP" | "OCO" | "STOP_LIMIT";

export interface OrderDraft {
  symbol:         string;
  side:           OrderSide;
  type:           OrderType;
  quantity:       number;
  price?:         number;
  leverage:       number;
  stopLoss?:      number;
  takeProfit?:    number;
  notional?:      number;
  marginRequired?: number;
}

export interface OrderConfirmDialogProps {
  order:       OrderDraft;
  currentBid:  number;
  currentAsk:  number;
  open:        boolean;
  submitting:  boolean;
  onConfirm:   () => void;
  onCancel:    () => void;
}

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const fmtPrice = (v: number, digits = 5) =>
  v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtMoney = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

function Row({ label, value, accent }: { label: string; value: string; accent?: "green" | "red" | "cyan" }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={clsx("font-semibold", {
        "text-emerald-300": accent === "green",
        "text-rose-300":    accent === "red",
        "text-cyan-300":    accent === "cyan",
        "text-white":       !accent,
      })}>
        {value}
      </span>
    </div>
  );
}

export function OrderConfirmDialog({
  order,
  currentBid,
  currentAsk,
  open,
  submitting,
  onConfirm,
  onCancel,
}: OrderConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm on open; Escape closes
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => confirmRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && !submitting) onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); cancelAnimationFrame(frame); };
  }, [open, submitting, onConfirm, onCancel]);

  if (!open) return null;

  const executionPrice = order.type === "MARKET"
    ? (order.side === "BUY" ? currentAsk : currentBid)
    : (order.price ?? (order.side === "BUY" ? currentAsk : currentBid));

  const notional       = order.notional       ?? executionPrice * order.quantity;
  const marginRequired = order.marginRequired ?? notional / order.leverage;

  const midPrice   = (currentBid + currentAsk) / 2;
  const slippagePct = midPrice > 0
    ? Math.abs(executionPrice - midPrice) / midPrice * 100
    : 0;
  const highSlippage = slippagePct > 0.1;

  const riskReward = order.stopLoss && order.takeProfit
    ? Math.abs(executionPrice - order.takeProfit) / Math.abs(executionPrice - order.stopLoss)
    : null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-confirm-title"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-t-2xl border border-slate-700 bg-[#0b1120] shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className={clsx(
          "flex items-center justify-between px-5 py-4",
          order.side === "BUY" ? "bg-emerald-400/10" : "bg-rose-400/10"
        )}>
          <div className="flex items-center gap-3">
            {order.side === "BUY"
              ? <TrendingUp size={20} className="text-emerald-300" aria-hidden />
              : <TrendingDown size={20} className="text-rose-300" aria-hidden />
            }
            <div>
              <p id="order-confirm-title" className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                Confirm order
              </p>
              <p className={clsx(
                "text-xl font-bold",
                order.side === "BUY" ? "text-emerald-300" : "text-rose-300"
              )}>
                {order.side} {order.symbol}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Cancel order"
          >
            <X size={18} />
          </button>
        </div>

        {/* Order details */}
        <div className="divide-y divide-slate-800 px-5">
          <Row label="Order type"    value={order.type} />
          <Row label="Quantity"      value={fmt.format(order.quantity)} />
          <Row label="Leverage"      value={`${order.leverage}×`} />
          <Row
            label="Est. exec. price"
            value={fmtPrice(executionPrice)}
            accent="cyan"
          />
          <Row label="Notional"      value={fmtMoney(notional)} />
          <Row label="Margin req."   value={fmtMoney(marginRequired)} accent="green" />
          {order.stopLoss   && <Row label="Stop loss"   value={fmtPrice(order.stopLoss)}   accent="red" />}
          {order.takeProfit && <Row label="Take profit" value={fmtPrice(order.takeProfit)} accent="green" />}
          {riskReward !== null && (
            <Row
              label="Risk / Reward"
              value={`1 : ${riskReward.toFixed(2)}`}
              accent={riskReward >= 1.5 ? "green" : "red"}
            />
          )}
        </div>

        {/* Warnings */}
        {highSlippage && (
          <div className="mx-5 mb-2 mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Market conditions may cause up to {slippagePct.toFixed(2)}% slippage from mid-price.
            </span>
          </div>
        )}

        {/* ESMA disclaimer */}
        <p className="mx-5 mb-3 mt-2 text-[11px] leading-relaxed text-slate-500">
          CFD trading involves significant risk of loss. ESMA retail leverage cap applies.
          Losses may exceed your deposit. Negative balance protection active.
        </p>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-800 p-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={clsx(
              "flex-1 rounded-xl py-3 text-sm font-bold text-slate-950 transition disabled:opacity-60",
              order.side === "BUY"
                ? "bg-emerald-400 hover:bg-emerald-300"
                : "bg-rose-400 hover:bg-rose-300"
            )}
            aria-live="polite"
          >
            {submitting ? "Routing…" : `Confirm ${order.side}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmDialog;
