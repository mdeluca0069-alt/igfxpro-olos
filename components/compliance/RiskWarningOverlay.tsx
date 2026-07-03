import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface RiskWarningOverlayProps {
  open: boolean;
  onAcknowledge: () => void;
  onDecline: () => void;
}

export function RiskWarningOverlay({ open, onAcknowledge, onDecline }: RiskWarningOverlayProps) {
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 p-5">
          <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
          <div>
            <h2 className="font-semibold text-white">ESMA CFD Risk Disclosure</h2>
            <p className="text-xs text-slate-400">Mandatory regulatory warning — MiFID II</p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5 text-sm text-slate-300">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
            <p className="font-semibold">High risk investment warning</p>
            <p className="mt-1 text-xs leading-6">
              CFDs are complex instruments and come with a high risk of losing money rapidly due to
              leverage. Between 74% and 89% of retail investor accounts lose money when trading CFDs.
              You should consider whether you understand how CFDs work and whether you can afford to
              take the high risk of losing your money.
            </p>
          </div>

          <ul className="space-y-2 text-xs text-slate-400">
            <li>• Leverage amplifies both profits and losses</li>
            <li>• You can lose more than your initial deposit</li>
            <li>• Past performance is not a reliable indicator of future results</li>
            <li>• Negative balance protection is applied to retail accounts per ESMA rules</li>
          </ul>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-cyan-400"
            />
            <span className="text-xs leading-5 text-slate-300">
              I confirm that I have read, understood and accept the risk disclosure above and wish to
              proceed with the onboarding process.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-800 p-5">
          <button
            onClick={onDecline}
            className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Decline
          </button>
          <button
            onClick={onAcknowledge}
            disabled={!checked}
            className="flex-1 rounded-xl bg-cyan-400 py-2.5 text-sm font-bold text-slate-950 transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-300"
          >
            Acknowledge &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}
