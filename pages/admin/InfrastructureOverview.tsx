/**
 * InfrastructureOverview — Real infrastructure metrics from Prometheus + Redis + Postgres.
 * Polls GET /api/v1/admin/infra every 5s. Zero Math.random().
 */
import { useQuery } from "@tanstack/react-query";
import { Server, Database, Wifi, Zap, RefreshCw, Loader2 } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { number } from "../../shared/utils/format";

type InfraResponse = {
  db: { pingMs: number; queryAvgMs: number; queryP99Ms: number };
  ws: { activeClients: number; messagesSent: number; broadcastAvgMs: number; outboxDepth: number };
  eventBus: { queueDepth: number; deliveredTotal: number; ticksTotal: number; staleSymbols: number };
  redis: { connected: boolean; opsPerSec: number; memoryBytes: number; keyCount: number };
  execution: {
    completed: number; lastExecMs: number; overflowCount: number; lockContention: number;
    ordersPlaced: number; ordersFilled: number; ordersRejected: number;
    orderAvgMs: number; orderP99Ms: number;
  };
  generatedAt: string;
};

type MetricRow = { label: string; value: number | string; unit?: string };

type ServiceCard = {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  metrics: MetricRow[];
};

function buildCards(d: InfraResponse): ServiceCard[] {
  return [
    {
      id: "db", name: "Database", icon: Database, color: "text-cyan-400",
      metrics: [
        { label: "Ping",       value: d.db.pingMs,      unit: "ms" },
        { label: "Query Avg",  value: d.db.queryAvgMs,  unit: "ms" },
        { label: "Query P99",  value: d.db.queryP99Ms,  unit: "ms" },
        { label: "Orders",     value: d.execution.ordersPlaced, unit: " placed" },
      ],
    },
    {
      id: "ws", name: "WebSocket", icon: Wifi, color: "text-emerald-400",
      metrics: [
        { label: "Active Clients", value: d.ws.activeClients,  unit: "" },
        { label: "Msgs Sent",      value: d.ws.messagesSent,   unit: " total" },
        { label: "Broadcast Avg",  value: d.ws.broadcastAvgMs, unit: "ms" },
        { label: "Outbox Depth",   value: d.ws.outboxDepth,    unit: " msg" },
      ],
    },
    {
      id: "bus", name: "Event Bus", icon: Zap, color: "text-amber-400",
      metrics: [
        { label: "Queue Depth",   value: d.eventBus.queueDepth,    unit: " msg" },
        { label: "Delivered",     value: d.eventBus.deliveredTotal, unit: " total" },
        { label: "Ticks",         value: d.eventBus.ticksTotal,     unit: " total" },
        { label: "Stale Symbols", value: d.eventBus.staleSymbols,  unit: "" },
      ],
    },
    {
      id: "redis", name: "Redis Cache", icon: Server, color: "text-violet-400",
      metrics: [
        { label: "Status",  value: d.redis.connected ? "Online" : "Offline" },
        { label: "Ops/s",   value: d.redis.opsPerSec,                              unit: "/s" },
        { label: "Memory",  value: +(d.redis.memoryBytes / 1e9).toFixed(2),        unit: " GB" },
        { label: "Keys",    value: d.redis.keyCount,                               unit: "" },
      ],
    },
  ];
}

export function InfrastructureOverview() {
  const { data, isFetching, dataUpdatedAt, error } = useQuery<InfraResponse>({
    queryKey: ["admin", "infra"],
    queryFn:  () => apiGet<InfraResponse>("/api/v1/admin/infra", "admin"),
    refetchInterval: 5_000,
    staleTime:       4_000,
  });

  const cards = data ? buildCards(data) : [];
  const tick  = dataUpdatedAt ? Math.floor(dataUpdatedAt / 5_000) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Infrastructure Overview</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {isFetching
              ? <RefreshCw size={11} className="animate-spin" />
              : <span className="h-2 w-2 rounded-full bg-emerald-400" />}
            Auto-refreshing every 5s — update #{tick}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-[12px] text-rose-400">
            Failed to load infrastructure metrics. Retrying…
          </div>
        )}

        {!data && !error && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[12px]">Loading real metrics…</span>
          </div>
        )}

        {data && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((svc) => {
              const Icon = svc.icon;
              return (
                <div key={svc.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                      <Icon size={16} className={svc.color} />
                    </div>
                    <p className="font-bold text-white">{svc.name}</p>
                    <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <ul className="space-y-2.5">
                    {svc.metrics.map((m) => (
                      <li key={m.label} className="flex items-center justify-between text-[12px]">
                        <span className="text-slate-500">{m.label}</span>
                        <span className={`font-mono font-bold ${svc.color}`}>
                          {typeof m.value === "number" && m.value > 999
                            ? number(m.value, 0)
                            : m.value}
                          {m.unit ?? ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {data && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Execution Engine
            </h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {[
                { label: "Completed",    value: number(data.execution.completed, 0) },
                { label: "Last Exec",    value: `${data.execution.lastExecMs}ms` },
                { label: "Order Avg",    value: `${data.execution.orderAvgMs}ms` },
                { label: "Order P99",    value: `${data.execution.orderP99Ms}ms` },
                { label: "Overflow",     value: String(data.execution.overflowCount) },
                { label: "Lock Contn.",  value: String(data.execution.lockContention) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-slate-950/60 px-3 py-2">
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className="font-mono text-[13px] font-semibold text-cyan-400">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default InfrastructureOverview;
