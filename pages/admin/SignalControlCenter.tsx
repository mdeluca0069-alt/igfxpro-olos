/**
 * SignalControlCenter — Active OLOS signals with expire action and stats
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio, XCircle, RefreshCw } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { number, dateTime } from "../../shared/utils/format";

type Signal = {
  id: string;
  symbol: string;
  type: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  horizon: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
};


const TYPE_CLS: Record<string, string> = {
  BUY:     "bg-emerald-400/10 text-emerald-400",
  SELL:    "bg-rose-400/10 text-rose-400",
  NEUTRAL: "bg-slate-700 text-slate-400",
};

function confColor(c: number): string {
  if (c >= 80) return "text-emerald-400";
  if (c >= 65) return "text-amber-400";
  return "text-rose-400";
}

type RawSignal = {
  id: string; symbol: string; type: string; confidence: number;
  horizon: string; createdAt: string; expiresAt: string; active: boolean;
};

export function SignalControlCenter() {
  const [expired, setExpired] = useState<Set<string>>(new Set());

  const signalsQ = useQuery<RawSignal[]>({
    queryKey: ["admin", "signals", "active"],
    queryFn: () => apiGet("/api/v1/signals/active", "admin"),
    staleTime: 30_000,
  });

  const raw: Signal[] = (signalsQ.data ?? []).map((s) => ({
    ...s,
    type: (s.type as "BUY" | "SELL" | "NEUTRAL"),
    active: s.active ?? true,
  }));

  const signals = raw.filter((s) => !expired.has(s.id));

  function expireSignal(id: string) {
    setExpired((prev) => new Set([...prev, id]));
  }

  const activeCount  = signals.filter((s) => s.active).length;
  const expiredToday = expired.size;
  const avgConf      = signals.length > 0
    ? signals.reduce((s, sig) => s + sig.confidence, 0) / signals.length
    : 0;
  const topSymbol    = signals.reduce<Record<string, number>>((acc, s) => {
    acc[s.symbol] = (acc[s.symbol] ?? 0) + 1;
    return acc;
  }, {});
  const topSym = Object.entries(topSymbol).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-violet-400 animate-pulse" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Signal Control Center</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signalsQ.refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[12px] text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            <RefreshCw size={12} className={signalsQ.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Active Signals",  value: String(activeCount),      cls: "text-violet-400"  },
            { label: "Expired Today",   value: String(expiredToday),     cls: "text-slate-400"   },
            { label: "Avg Confidence",  value: `${number(avgConf, 1)}%`, cls: confColor(avgConf) },
            { label: "Top Symbol",      value: topSym,                   cls: "text-cyan-400"    },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`mt-2 text-2xl font-extrabold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Signal table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["Symbol", "Type", "Confidence", "Horizon", "Created", "Expires", ""].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">
                    No active signals.
                  </td>
                </tr>
              ) : (
                signals.map((sig) => (
                  <tr key={sig.id} className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
                    <td className="px-4 py-3 font-bold text-white">{sig.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TYPE_CLS[sig.type]}`}>
                        {sig.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${sig.confidence >= 80 ? "bg-emerald-500" : sig.confidence >= 65 ? "bg-amber-500" : "bg-rose-500"}`}
                            style={{ width: `${sig.confidence}%` }}
                          />
                        </div>
                        <span className={`font-mono font-bold ${confColor(sig.confidence)}`}>{sig.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-400">{sig.horizon}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{dateTime(sig.createdAt)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{dateTime(sig.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => expireSignal(sig.id)}
                        className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/20"
                      >
                        <XCircle size={10} /> Expire
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default SignalControlCenter;
