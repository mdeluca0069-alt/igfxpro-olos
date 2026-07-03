import { useState, memo } from "react";
import { motion } from "framer-motion";
import { X, Trash2, AlertCircle, SlidersHorizontal } from "lucide-react";
import { getApiClient } from "../../api/httpClient";
import { useTradingStore, type Position } from "../../store/trading.store";

interface Props {
  selected:         Set<string>;
  positions:        Position[];
  onClearSelection: () => void;
  onDone:           () => void;
}

export const BulkActionBar = memo(function BulkActionBar({
  selected, positions, onClearSelection, onDone,
}: Props) {
  const [confirming,  setConfirming]  = useState(false);
  const [showSlInput, setShowSlInput] = useState(false);
  const [showTpInput, setShowTpInput] = useState(false);
  const [slValue,     setSlValue]     = useState("");
  const [tpValue,     setTpValue]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const fetchPositions = useTradingStore(s => s.fetchPositions);
  const selectedPositions = positions.filter(p => selected.has(p.id));
  const count = selected.size;

  async function handleCloseAll() {
    setSubmitting(true);
    setError(null);
    const failures: string[] = [];
    await Promise.allSettled(
      selectedPositions.map(async p => {
        try {
          await getApiClient().post(
            `/api/v1/trading/position/${encodeURIComponent(p.id)}/close`,
          );
        } catch {
          failures.push(p.symbol);
        }
      }),
    );
    await fetchPositions();
    setSubmitting(false);
    setConfirming(false);
    if (failures.length > 0) {
      setError(`Failed to close: ${failures.join(", ")}`);
    } else {
      onClearSelection();
      onDone();
    }
  }

  async function handleBulkModify(field: "stopLoss" | "takeProfit", raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val) || val <= 0) return;
    setSubmitting(true);
    setError(null);
    const failures: string[] = [];
    await Promise.allSettled(
      selectedPositions.map(async p => {
        try {
          await getApiClient().put(
            `/api/v1/trading/position/${encodeURIComponent(p.id)}`,
            { [field]: val },
          );
        } catch {
          failures.push(p.symbol);
        }
      }),
    );
    await fetchPositions();
    setSubmitting(false);
    if (failures.length > 0) {
      setError(`Modify failed: ${failures.join(", ")}`);
    } else {
      if (field === "stopLoss") { setSlValue(""); setShowSlInput(false); }
      else                      { setTpValue(""); setShowTpInput(false); }
      onClearSelection();
      onDone();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] px-4 py-3"
    >
      {/* Count badge */}
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-[11px] font-black text-slate-950">
          {count}
        </span>
        <span className="text-[12px] font-semibold text-slate-300">
          position{count !== 1 ? "s" : ""} selected
        </span>
      </div>

      <div className="h-4 w-px bg-white/[0.1]" />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5">
          <AlertCircle size={12} className="text-rose-400" />
          <span className="text-[12px] text-rose-400">{error}</span>
        </div>
      )}

      {/* Bulk SL */}
      <div className="flex items-center gap-2">
        {showSlInput ? (
          <>
            <input
              autoFocus
              type="number"
              value={slValue}
              onChange={e => setSlValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleBulkModify("stopLoss", slValue);
                if (e.key === "Escape") { setShowSlInput(false); setSlValue(""); }
              }}
              placeholder="SL price"
              className="w-28 rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 py-1.5 font-mono text-[12px] font-bold text-white outline-none focus:border-rose-400/60"
            />
            <button
              onClick={() => handleBulkModify("stopLoss", slValue)}
              disabled={submitting || !slValue}
              className="rounded-lg bg-rose-500/80 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-rose-500 disabled:opacity-40"
            >
              Set SL
            </button>
            <button
              onClick={() => { setShowSlInput(false); setSlValue(""); }}
              className="rounded-lg p-1.5 text-slate-500 hover:text-white"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <button
            onClick={() => { setShowSlInput(true); setShowTpInput(false); }}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-slate-300 transition hover:border-rose-400/30 hover:text-rose-300 disabled:opacity-40"
          >
            <SlidersHorizontal size={11} />
            Set SL
          </button>
        )}
      </div>

      {/* Bulk TP */}
      <div className="flex items-center gap-2">
        {showTpInput ? (
          <>
            <input
              autoFocus
              type="number"
              value={tpValue}
              onChange={e => setTpValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleBulkModify("takeProfit", tpValue);
                if (e.key === "Escape") { setShowTpInput(false); setTpValue(""); }
              }}
              placeholder="TP price"
              className="w-28 rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 py-1.5 font-mono text-[12px] font-bold text-white outline-none focus:border-emerald-400/60"
            />
            <button
              onClick={() => handleBulkModify("takeProfit", tpValue)}
              disabled={submitting || !tpValue}
              className="rounded-lg bg-emerald-500/80 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              Set TP
            </button>
            <button
              onClick={() => { setShowTpInput(false); setTpValue(""); }}
              className="rounded-lg p-1.5 text-slate-500 hover:text-white"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <button
            onClick={() => { setShowTpInput(true); setShowSlInput(false); }}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-slate-300 transition hover:border-emerald-400/30 hover:text-emerald-300 disabled:opacity-40"
          >
            <SlidersHorizontal size={11} />
            Set TP
          </button>
        )}
      </div>

      {/* Close all — with confirmation */}
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-amber-400">Close {count} positions?</span>
          <button
            onClick={handleCloseAll}
            disabled={submitting}
            className="rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-rose-400 disabled:opacity-40"
          >
            {submitting ? "Closing…" : "Confirm"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={submitting}
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/[0.07] px-3 py-1.5 text-[12px] font-semibold text-rose-400 transition hover:bg-rose-400/[0.14] disabled:opacity-40"
        >
          <Trash2 size={11} />
          Close all
        </button>
      )}

      <div className="ml-auto">
        <button
          onClick={() => { setConfirming(false); setError(null); onClearSelection(); }}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Clear selection"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
});
