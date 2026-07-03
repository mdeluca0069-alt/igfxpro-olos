import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import clsx from "clsx";

export interface AdminConfirmDialogProps {
  open:       boolean;
  title:      string;
  message:    string;
  /** If provided, user must type this exact word to enable the confirm button */
  keyword?:   string;
  variant?:   "danger" | "warning";
  submitting: boolean;
  onConfirm:  () => void;
  onCancel:   () => void;
}

export function AdminConfirmDialog({
  open, title, message, keyword, variant = "warning",
  submitting, onConfirm, onCancel,
}: AdminConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onCancel]);

  if (!open) return null;

  const canConfirm = !keyword || typed === keyword;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-confirm-title"
    >
      <div className={clsx(
        "w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl bg-[#0b1120]",
        variant === "danger" ? "border-rose-500/40" : "border-amber-500/40"
      )}>
        {/* Header */}
        <div className={clsx(
          "flex items-center gap-3 px-5 py-4",
          variant === "danger" ? "bg-rose-500/10" : "bg-amber-500/10"
        )}>
          <AlertTriangle
            size={20}
            className={variant === "danger" ? "text-rose-400" : "text-amber-400"}
            aria-hidden
          />
          <h2 id="admin-confirm-title" className="flex-1 text-base font-semibold text-white">
            {title}
          </h2>
          <button onClick={onCancel} className="rounded p-1 text-slate-400 hover:text-white" aria-label="Cancel">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm leading-relaxed text-slate-300">{message}</p>

          {keyword && (
            <div>
              <label className="text-xs text-slate-400">
                Type <span className={clsx("font-mono font-bold", variant === "danger" ? "text-rose-300" : "text-amber-300")}>
                  {keyword}
                </span> to confirm
              </label>
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={keyword}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none"
                aria-label={`Type ${keyword} to confirm`}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm || submitting}
              className={clsx(
                "flex-1 rounded-xl py-3 text-sm font-bold transition disabled:opacity-40",
                variant === "danger"
                  ? "bg-rose-500 text-white hover:bg-rose-400"
                  : "bg-amber-500 text-slate-950 hover:bg-amber-400"
              )}
            >
              {submitting ? "Processing…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminConfirmDialog;
