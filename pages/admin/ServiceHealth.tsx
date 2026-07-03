/**
 * ServiceHealth — Service health table with auto-refresh every 30s
 */
import { useState, useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { dateTime } from "../../shared/utils/format";

type ServiceStatus = "HEALTHY" | "DEGRADED" | "DOWN";

type ServiceEntry = {
  id: string;
  name: string;
  status: ServiceStatus;
  version: string;
  lastCheck: string;
  uptimePct: number;
};

const STATUS_CLS: Record<ServiceStatus, string> = {
  HEALTHY:  "bg-emerald-400/10 text-emerald-400",
  DEGRADED: "bg-amber-400/10 text-amber-400",
  DOWN:     "bg-rose-400/10 text-rose-400",
};

const DOT_CLS: Record<ServiceStatus, string> = {
  HEALTHY:  "bg-emerald-400",
  DEGRADED: "bg-amber-400 animate-pulse",
  DOWN:     "bg-rose-400 animate-pulse",
};

function buildServices(): ServiceEntry[] {
  return [
    { id: "1", name: "trading-service",   status: "HEALTHY",  version: "4.2.1", lastCheck: new Date().toISOString(), uptimePct: 99.98 },
    { id: "2", name: "risk-engine",        status: "HEALTHY",  version: "3.1.0", lastCheck: new Date().toISOString(), uptimePct: 99.95 },
    { id: "3", name: "auth-service",       status: "HEALTHY",  version: "2.0.4", lastCheck: new Date().toISOString(), uptimePct: 99.99 },
    { id: "4", name: "notification-service", status: "DEGRADED", version: "1.8.2", lastCheck: new Date().toISOString(), uptimePct: 97.82 },
    { id: "5", name: "market-data",        status: "HEALTHY",  version: "5.0.0", lastCheck: new Date().toISOString(), uptimePct: 99.97 },
    { id: "6", name: "scheduler",          status: "HEALTHY",  version: "1.4.1", lastCheck: new Date().toISOString(), uptimePct: 99.90 },
  ];
}

export function ServiceHealth() {
  const [services, setServices] = useState<ServiceEntry[]>(buildServices);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing]   = useState(false);

  function refresh() {
    setRefreshing(true);
    setTimeout(() => {
      setServices(buildServices());
      setLastRefresh(new Date());
      setRefreshing(false);
    }, 500);
  }

  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  const healthCount   = services.filter((s) => s.status === "HEALTHY").length;
  const degradedCount = services.filter((s) => s.status === "DEGRADED").length;
  const downCount     = services.filter((s) => s.status === "DOWN").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-emerald-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Service Health</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600">
              Last check: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[12px] text-slate-400 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Healthy",  count: healthCount,   cls: "text-emerald-400" },
            { label: "Degraded", count: degradedCount, cls: "text-amber-400"   },
            { label: "Down",     count: downCount,     cls: "text-rose-400"    },
          ].map(({ label, count, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-extrabold ${cls}`}>{count}</p>
            </div>
          ))}
        </div>

        {/* Services table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["Service", "Status", "Version", "Uptime", "Last Check"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id} className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${DOT_CLS[svc.status]}`} />
                      <span className="font-mono font-semibold text-white">{svc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_CLS[svc.status]}`}>
                      {svc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">v{svc.version}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${svc.uptimePct > 99 ? "bg-emerald-500" : svc.uptimePct > 95 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${svc.uptimePct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-white">{svc.uptimePct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{dateTime(svc.lastCheck)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-[11px] text-slate-700">
          Auto-refreshes every 30 seconds.
        </p>
      </main>
    </div>
  );
}

export default ServiceHealth;
