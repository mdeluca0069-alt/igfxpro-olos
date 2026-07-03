import { useState, useRef, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { X, AlertCircle } from "lucide-react";
import { getApiClient } from "../../api/httpClient";
import { useTradingStore, type Position } from "../../store/trading.store";

const SD: Record<string, number> = {
  USDJPY: 3, BTCUSD: 0, ETHUSD: 2, US500: 1, US100: 1, XAUUSD: 2, WTI: 2,
};
const dp = (s: string) => SD[s] ?? 5;

const QUICK_PCT = [25, 50, 75, 100] as const;

interface Props {
  position: Position;
  onClose:   () => void;
  onSuccess: () => void;
}

export const PartialCloseDialog = memo(function PartialCloseDialog({
  position, onClose, onSuccess,
}: Props) {
  const [rawQty,     setRawQty]     = useState(position.quantity.toFixed(2));
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const fetchPositions = useTradingStore(s => s.fetchPositions);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const parsed      = parseFloat(rawQty);
  const isValid     = !isNaN(parsed) && parsed > 0 && parsed <= position.quantity;
  const pctClose    = isValid ? (parsed / position.quantity) * 100 : 0;
  const estPnl      = isValid ? (position.pnl / position.quantity) * parsed : 0;
  const remaining   = isValid ? position.quantity - parsed : position.quantity;
  const isBuy       = position.side === "BUY";
  const d           = dp(position.symbol);

  function applyPct(pct: number) {
    setRawQty(((position.quantity * pct) / 100).toFixed(2));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await getApiClient().post(
        `/api/v1/trading/position/${encodeURIComponent(position.id)}/close`,
        { quantity: parsed },
      );
      await fetchPositions();
      onSuccess();
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Close failed — please retry.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-1/2 z-50 mx-auto w-full max-w-[420px] -translate-y-1/2 px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pcd-title"
      >
        <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b1221] shadow-[0_40px_120px_rgba(0,0,0,0.8)]">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 id="pcd-title" className="text-[15px] font-bold text-white">
                Partial Close
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                {position.symbol} ·{" "}
                <span className={isBuy ? "text-emerald-400" : "text-rose-400"}>
                  {position.side}
                </span>
                {" "}· {position.quantity.toFixed(2)} lots
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4 p-5">

            {/* Position snapshot */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Entry",    val: position.entryPrice.toFixed(d),                            cls: "text-white"                                                  },
                { label: "Mark",     val: position.markPrice.toFixed(d),                             cls: "text-white"                                                  },
                { label: "Open P&L", val: `${position.pnl >= 0 ? "+" : ""}$${position.pnl.toFixed(2)}`, cls: position.pnl >= 0 ? "text-emerald-400" : "text-rose-400" },
                { label: "Leverage", val: `1:${position.leverage}`,                                   cls: "text-white"                                                  },
              ].map(({ label, val, cls }) => (
                <div key={label} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[10px] text-slate-600">{label}</p>
                  <p className={`mt-0.5 font-mono text-[13px] font-bold tabular-nums ${cls}`}>{val}</p>
                </div>
              ))}
            </div>

            {/* Quick % buttons */}
            <div>
              <p className="mb-2 text-[11px] font-semibold text-slate-500">Close percentage</p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_PCT.map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyPct(pct)}
                    className={[
                      "rounded-xl border py-2.5 text-[12px] font-bold transition",
                      Math.abs(pctClose - pct) < 0.5
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-400"
                        : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/[0.16] hover:text-white",
                    ].join(" ")}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity input */}
            <div>
              <label
                htmlFor="pcd-qty"
                className="mb-1.5 block text-[11px] font-semibold text-slate-500"
              >
                Lots to close
                <span className="ml-1 text-slate-700">(max {position.quantity.toFixed(2)})</span>
              </label>
              <input
                id="pcd-qty"
                ref={inputRef}
                type="number"
                value={rawQty}
                onChange={e => setRawQty(e.target.value)}
                min="0.01"
                max={position.quantity}
                step="0.01"
                className={[
                  "w-full rounded-xl border bg-white/[0.04] px-4 py-3 font-mono text-[15px] font-bold text-white outline-none tabular-nums transition",
                  isValid || rawQty === ""
                    ? "border-white/[0.1] focus:border-cyan-400/50"
                    : "border-rose-400/40 focus:border-rose-400",
                ].join(" ")}
              />
            </div>

            {/* Preview */}
            {isValid && (
              <div className="space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                {[
                  { label: "Closing",         val: `${parsed.toFixed(2)} lots (${pctClose.toFixed(0)}%)`,       cls: "text-white"       },
                  { label: "Remaining",        val: `${remaining.toFixed(2)} lots`,                              cls: "text-slate-300"   },
                  { label: "Est. P&L realized",val: `${estPnl >= 0 ? "+" : ""}$${estPnl.toFixed(2)}`,           cls: estPnl >= 0 ? "text-emerald-400" : "text-rose-400" },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-500">{label}</span>
                    <span className={`font-bold tabular-nums ${cls}`}>{val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3">
                <AlertCircle size={13} className="shrink-0 text-rose-400" />
                <p className="text-[12px] text-rose-300">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] py-3 text-[13px] font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || submitting}
                className={[
                  "flex-1 rounded-xl py-3 text-[13px] font-bold transition disabled:opacity-40",
                  isBuy
                    ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:bg-rose-400"
                    : "bg-emerald-500 text-white shadow-[0_0_20px_rgba(52,211,153,0.25)] hover:bg-emerald-400",
                ].join(" ")}
              >
                {submitting
                  ? "Closing…"
                  : `Close ${isValid ? parsed.toFixed(2) : "—"} lots`}
              </button>
            </div>

          </form>
        </div>
      </motion.div>
    </>
  );
});
