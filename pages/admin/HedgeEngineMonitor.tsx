/**
 * HedgeEngineMonitor — Real hedge data from GET /api/v1/admin/hedge/stats.
 * Efficiency sparkline built from successive 5s polls. Zero Math.random().
 */
import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Activity, Pause, Play, Loader2 } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { number, money } from "../../shared/utils/format";

type HedgeResponse = {
  engineActive:          boolean;
  hedgeRatio:            number;
  hedgedPositions:       number;
  unhedgedPositions:     number;
  totalPositions:        number;
  hedgePnl:              number;
  currentEfficiency:     number;
  ordersPlaced:          number;
  ordersFilled:          number;
  killSwitchActivations: number;
  generatedAt:           string;
};

type EfficiencyPoint = { t: string; efficiency: number };

export function HedgeEngineMonitor() {
  const [data,    setData]    = useState<HedgeResponse | null>(null);
  const [history, setHistory] = useState<EfficiencyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [paused,  setPaused]  = useState(false);
  const pausedRef             = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    async function poll() {
      if (pausedRef.current) return;
      try {
        const d = await apiGet<HedgeResponse>("/api/v1/admin/hedge/stats", "admin");
        setError(false);
        setLoading(false);
        setData(d);
        setHistory((prev) => {
          const pt: EfficiencyPoint = {
            t:          new Date().getUTCHours() + "h",
            efficiency: d.currentEfficiency,
          };
          return [...prev.slice(-23), pt];
        });
      } catch {
        setError(true);
        setLoading(false);
      }
    }

    poll();
    const id = setInterval(poll, 5_000);
    return () => clearInterval(id);
  }, []);

  const currentEfficiency = history[history.length - 1]?.efficiency ?? (data?.currentEfficiency ?? 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Hedge Engine Monitor</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[12px] font-bold transition ${
              !paused
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            {!paused ? <Pause size={13} /> : <Play size={13} />}
            {!paused ? "Pause Polling" : "Resume Polling"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[12px]">Loading hedge engine stats…</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-[12px] text-rose-400">
            Failed to load hedge stats. Retrying…
          </div>
        )}

        {data && (
          <>
            {/* Status banner */}
            <div className={`flex items-center gap-3 rounded-xl border p-4 ${
              data.engineActive
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-amber-500/30 bg-amber-500/5"
            }`}>
              <span className={`h-3 w-3 rounded-full ${data.engineActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="font-bold text-white">
                Hedge Engine: {data.engineActive ? "ACTIVE" : "PAUSED"}
              </span>
              {data.killSwitchActivations > 0 && (
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
                  Kill switch: {data.killSwitchActivations}x
                </span>
              )}
              <span className={`ml-auto text-[11px] font-semibold ${data.engineActive ? "text-emerald-400" : "text-amber-400"}`}>
                Efficiency: {number(currentEfficiency, 1)}%
              </span>
            </div>

            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Hedge Ratio",        value: `${number(data.hedgeRatio * 100, 1)}%`,  cls: "text-cyan-400" },
                { label: "Hedged Positions",   value: String(data.hedgedPositions),             cls: "text-emerald-400" },
                { label: "Unhedged Positions", value: String(data.unhedgedPositions),           cls: data.unhedgedPositions > 5 ? "text-rose-400" : "text-amber-400" },
                { label: "Hedge P&L",          value: money(data.hedgePnl),                    cls: data.hedgePnl >= 0 ? "text-emerald-400" : "text-rose-400" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className={`mt-2 text-2xl font-extrabold ${cls}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Efficiency sparkline */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Settlement Efficiency — Live (5s samples)
              </h2>
              {history.length < 2 ? (
                <div className="flex items-center justify-center py-12 text-[12px] text-slate-600">
                  Building history… {history.length} sample{history.length !== 1 ? "s" : ""} collected
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="hedgeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} interval={3} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [`${v.toFixed(1)}%`, "Efficiency"]}
                    />
                    <Area type="monotone" dataKey="efficiency" stroke="#22d3ee" fill="url(#hedgeGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Execution summary */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Execution Metrics
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Orders Placed",  value: number(data.ordersPlaced, 0),  cls: "text-slate-300" },
                  { label: "Orders Filled",  value: number(data.ordersFilled, 0),  cls: "text-emerald-400" },
                  { label: "Total Positions", value: number(data.totalPositions, 0), cls: "text-cyan-400" },
                  { label: "Fill Rate",      value: `${data.ordersPlaced > 0 ? number((data.ordersFilled / data.ordersPlaced) * 100, 1) : "100"}%`, cls: "text-cyan-400" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="rounded-lg bg-slate-950/60 px-3 py-2">
                    <p className="text-[10px] text-slate-500">{label}</p>
                    <p className={`mt-1 font-mono font-semibold ${cls}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default HedgeEngineMonitor;
