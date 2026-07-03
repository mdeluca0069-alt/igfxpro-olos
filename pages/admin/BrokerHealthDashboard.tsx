/**
 * BrokerHealthDashboard — real service telemetry from /api/v1/telemetry/health
 * Replaces Math.random() + addJitter() fake latency generation.
 */
import { useQuery }            from "@tanstack/react-query";
import { Activity, RefreshCw } from "lucide-react";
import { apiGet }              from "../../shared/lib/apiHelpers";

type TelemetrySvc = {
  name:      string;
  status:    "operational" | "degraded" | "offline";
  latencyMs: number;
  detail:    string;
};

type TelemetryResponse = {
  services:      TelemetrySvc[];
  processUptime: number;
  memoryRss:     number;
  memoryHeap:    number;
  httpTotal:     number;
  httpErrors:    number;
  wsConnections: number;
  ordersPlaced:  number;
  ordersFilled:  number;
  positionsOpen: number;
  generatedAt:   string;
};

const STATUS_MAP = {
  operational: { dot: "bg-emerald-400",             badge: "bg-emerald-400/10 text-emerald-400", label: "HEALTHY"  },
  degraded:    { dot: "bg-amber-400 animate-pulse",  badge: "bg-amber-400/10 text-amber-400",     label: "DEGRADED" },
  offline:     { dot: "bg-rose-400 animate-pulse",   badge: "bg-rose-400/10 text-rose-400",       label: "DOWN"     },
};

export function BrokerHealthDashboard() {
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<TelemetryResponse>({
    queryKey:        ["broker-health"],
    queryFn:         () => apiGet("/api/v1/telemetry/health"),
    staleTime:       25_000,
    refetchInterval: 30_000,
  });

  const services = data?.services ?? [];
  const healthy  = services.filter((s) => s.status === "operational").length;
  const degraded = services.filter((s) => s.status === "degraded").length;
  const down     = services.filter((s) => s.status === "offline").length;

  const uptimeSec = data?.processUptime ?? 0;
  const uptimeStr = uptimeSec < 3600
    ? `${Math.round(uptimeSec / 60)}m`
    : uptimeSec < 86400
    ? `${Math.round(uptimeSec / 3600)}h`
    : `${Math.round(uptimeSec / 86400)}d`;

  const lastCheck = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-emerald-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin · Live Telemetry</p>
              <h1 className="text-xl font-extrabold text-white">Broker Health Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600">Last check: {lastCheck}</span>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[12px] text-slate-400 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">

        {/* Summary KPIs */}
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Healthy",     count: healthy,                  cls: "text-emerald-400" },
            { label: "Degraded",    count: degraded,                 cls: "text-amber-400"   },
            { label: "Down",        count: down,                     cls: "text-rose-400"    },
            { label: "Uptime",      count: uptimeStr,                cls: "text-slate-200"   },
            { label: "WS Conns",    count: data?.wsConnections ?? 0, cls: "text-cyan-400"    },
            { label: "Open Pos",    count: data?.positionsOpen ?? 0, cls: "text-slate-200"   },
          ].map(({ label, count, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`mt-2 text-2xl font-extrabold ${cls}`}>{count}</p>
            </div>
          ))}
        </div>

        {/* Service grid */}
        {isLoading ? (
          <p className="text-center text-[11px] text-slate-600">Loading real telemetry…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((s) => {
              const m      = STATUS_MAP[s.status] ?? STATUS_MAP.offline;
              const latCls = s.latencyMs > 0
                ? (s.latencyMs < 50 ? "text-emerald-300" : s.latencyMs < 200 ? "text-amber-300" : "text-rose-300")
                : "text-slate-600";
              return (
                <div key={s.name} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} />
                      <p className="text-[13px] font-semibold capitalize text-white">
                        {s.name.replace(/-/g, " ")}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.badge}`}>
                      {m.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {s.latencyMs > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Latency</span>
                        <span className={`font-mono font-bold ${latCls}`}>{s.latencyMs}ms</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Detail</span>
                      <span className="text-slate-400 text-right max-w-[120px] truncate">{s.detail}</span>
                    </div>
                  </div>

                  {s.latencyMs > 0 && (
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          s.latencyMs < 50 ? "bg-emerald-500" : s.latencyMs < 200 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, (s.latencyMs / 500) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Process stats */}
        {data && (
          <div className="grid gap-3 sm:grid-cols-4 text-[11px]">
            {[
              { label: "Memory RSS",   value: `${Math.round(data.memoryRss / 1_048_576)} MB`  },
              { label: "Heap Used",    value: `${Math.round(data.memoryHeap / 1_048_576)} MB` },
              { label: "HTTP Total",   value: `${data.httpTotal} requests`                    },
              { label: "HTTP Errors",  value: `${data.httpErrors} (5xx)`                      },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                <p className="text-slate-600">{label}</p>
                <p className="mt-0.5 font-mono font-bold text-slate-300">{value}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-slate-700">
          Live telemetry from MetricsRegistry + DB ping. Auto-refreshes every 30s.
        </p>
      </main>
    </div>
  );
}

export default BrokerHealthDashboard;
