/**
 * LatencyMonitor — Real latency sparklines from Prometheus metrics.
 * Polls GET /api/v1/admin/infra every 5s. History built from successive polls.
 * Zero Math.random().
 */
import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, Loader2 } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { number } from "../../shared/utils/format";

type InfraResponse = {
  db:        { pingMs: number; queryAvgMs: number; queryP99Ms: number };
  ws:        { broadcastAvgMs: number };
  execution: { lastExecMs: number; orderAvgMs: number; orderP99Ms: number };
  generatedAt: string;
};

type LatencySeries = {
  id:      string;
  name:    string;
  color:   string;
  current: number;
  avg:     number;
  p99:     number;
  history: { t: number; ms: number }[];
};

const SERIES_CONFIG = [
  { id: "order", name: "Order Execution",     color: "#22d3ee" },
  { id: "ws",    name: "WebSocket Broadcast", color: "#34d399" },
  { id: "api",   name: "DB Query Avg",        color: "#fbbf24" },
  { id: "db",    name: "DB Ping",             color: "#a78bfa" },
] as const;

function latencyCls(ms: number): string {
  if (ms < 20)  return "text-emerald-400";
  if (ms < 100) return "text-amber-400";
  return "text-rose-400";
}

function computeAvg(history: { ms: number }[]): number {
  if (!history.length) return 0;
  return Math.round((history.reduce((s, h) => s + h.ms, 0) / history.length) * 10) / 10;
}

function computeP99(history: { ms: number }[]): number {
  if (!history.length) return 0;
  const sorted = [...history].sort((a, b) => a.ms - b.ms);
  return sorted[Math.floor(sorted.length * 0.99)]?.ms ?? sorted[sorted.length - 1]?.ms ?? 0;
}

export function LatencyMonitor() {
  const [series,   setSeries]   = useState<LatencySeries[]>(() =>
    SERIES_CONFIG.map((c) => ({ ...c, current: 0, avg: 0, p99: 0, history: [] })),
  );
  const [tick, setTick]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(false);
  const seqRef                  = useRef(0);

  useEffect(() => {
    async function poll() {
      try {
        const d = await apiGet<InfraResponse>("/api/v1/admin/infra", "admin");
        setError(false);
        setLoading(false);

        const newValues: Record<string, number> = {
          order: d.execution.lastExecMs,
          ws:    d.ws.broadcastAvgMs,
          api:   d.db.queryAvgMs,
          db:    d.db.pingMs,
        };

        seqRef.current += 1;
        const seq = seqRef.current;

        setSeries((prev) =>
          prev.map((s) => {
            const val     = newValues[s.id] ?? 0;
            const history = [...s.history.slice(-19), { t: seq, ms: val }];
            return {
              ...s,
              current: val,
              avg:     computeAvg(history),
              p99:     computeP99(history),
              history,
            };
          }),
        );
        setTick((t) => t + 1);
      } catch {
        setError(true);
      }
    }

    poll();
    const id = setInterval(poll, 5_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Latency Monitor</h1>
            </div>
          </div>
          <span className="text-[11px] text-slate-500">
            {error ? (
              <span className="text-rose-400">Connection error — retrying…</span>
            ) : (
              `Live Prometheus metrics · sample #${tick}`
            )}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-6">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[12px]">Waiting for first metrics poll…</span>
          </div>
        )}

        {!loading && (
          <div className="grid gap-5 sm:grid-cols-2">
            {series.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-bold text-white">{m.name}</p>
                  <span className={`text-xl font-extrabold font-mono ${latencyCls(m.current)}`}>
                    {number(m.current, 1)}ms
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-950/60 px-3 py-2">
                    <p className="text-[10px] text-slate-500">Average</p>
                    <p className={`font-mono font-semibold ${latencyCls(m.avg)}`}>{number(m.avg, 1)}ms</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 px-3 py-2">
                    <p className="text-[10px] text-slate-500">P99</p>
                    <p className={`font-mono font-semibold ${latencyCls(m.p99)}`}>{number(m.p99, 1)}ms</p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={m.history}>
                    <defs>
                      <linearGradient id={`grad-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={m.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={m.color} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 10 }}
                      formatter={(v: number) => [`${v.toFixed(1)}ms`, m.name]}
                    />
                    <Area
                      type="monotone" dataKey="ms"
                      stroke={m.color} fill={`url(#grad-${m.id})`}
                      strokeWidth={1.5} dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {m.history.length < 3 && (
                  <p className="mt-2 text-center text-[10px] text-slate-600">
                    Building history… {m.history.length} / 20 samples
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default LatencyMonitor;
