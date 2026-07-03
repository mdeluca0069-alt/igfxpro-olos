/**
 * ServiceHealthChecker — real infrastructure telemetry from /api/v1/telemetry/health.
 *
 * Replaces the former Math.random() fake latency implementation.
 * Polls every 30 seconds. Only renders on /admin route.
 */
import { useEffect, useState } from "react";
import { useLocation }         from "react-router-dom";
import { getApiClient }        from "../api/httpClient";

type ServiceStatus = "operational" | "degraded" | "offline";

interface ServiceHealth {
  name:      string;
  status:    ServiceStatus;
  latencyMs: number;
  detail:    string;
}

interface TelemetryResponse {
  services:      ServiceHealth[];
  processUptime: number;
  wsConnections: number;
  httpTotal:     number;
  generatedAt:   string;
}

const STATUS_DOT: Record<ServiceStatus, string> = {
  operational: "bg-emerald-500",
  degraded:    "bg-amber-500",
  offline:     "bg-rose-500",
};

export const ServiceHealthChecker: React.FC = () => {
  const location  = useLocation();
  const [data, setData]       = useState<TelemetryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.pathname !== "/admin") return;

    let mounted = true;

    const poll = async () => {
      if (!mounted) return;
      setLoading(true);
      try {
        const client = getApiClient();
        const resp: TelemetryResponse = await client.get("/api/v1/telemetry/health");
        if (mounted) setData(resp);
      } catch {
        // Network error — keep previous state
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void poll();
    const interval = setInterval(poll, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [location.pathname]);

  if (location.pathname !== "/admin") return null;

  const globalStatus: ServiceStatus = !data ? "offline"
    : data.services.some((s) => s.status === "offline")    ? "offline"
    : data.services.some((s) => s.status === "degraded")   ? "degraded"
    : "operational";

  const uptime = data
    ? data.processUptime < 3600
      ? `${Math.round(data.processUptime / 60)}m uptime`
      : `${Math.round(data.processUptime / 3600)}h uptime`
    : "";

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[340px] rounded-2xl bg-[#0B1020] border border-[#1E293B] shadow-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold text-sm">Service Health</h2>
          <p className="text-[11px] text-slate-500">
            {loading ? "Refreshing…" : uptime || "Live telemetry"}
          </p>
        </div>
        <div className={`w-3 h-3 rounded-full ${STATUS_DOT[globalStatus]}`} />
      </div>

      {!data ? (
        <p className="text-[11px] text-slate-600 text-center py-4">Loading…</p>
      ) : (
        <div className="space-y-2.5">
          {data.services.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between">
              <div>
                <p className="text-[12px] text-white capitalize">{svc.name.replace(/-/g, " ")}</p>
                <p className="text-[10px] text-slate-600">{svc.detail}</p>
              </div>
              <div className="flex items-center gap-2 text-right">
                {svc.latencyMs > 0 && (
                  <span className="text-[10px] font-mono text-slate-500">{svc.latencyMs}ms</span>
                )}
                <div className={`w-2 h-2 rounded-full ${STATUS_DOT[svc.status]}`} />
              </div>
            </div>
          ))}

          <div className="mt-2 border-t border-slate-800/60 pt-2 grid grid-cols-2 gap-1">
            <div className="text-[10px] text-slate-600">
              WS connections: <span className="text-slate-400">{data.wsConnections}</span>
            </div>
            <div className="text-[10px] text-slate-600">
              HTTP total: <span className="text-slate-400">{data.httpTotal}</span>
            </div>
          </div>

          {data.generatedAt && (
            <p className="text-[9px] text-slate-700 text-right">
              As of {new Date(data.generatedAt).toLocaleTimeString("en-GB")}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceHealthChecker;
