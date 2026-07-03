/**
 * FailoverPanel — Primary/secondary failover controls with event log
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, RefreshCw, AlertTriangle, ShieldOff, CheckCircle2 } from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { dateTime } from "../../shared/utils/format";
import { useToast } from "../../components/ui/Toast";

type NodeStatus = "PRIMARY" | "SECONDARY" | "FAILED";

type FailoverComponent = {
  id: string;
  name: string;
  active: "primary" | "secondary";
  primary: { host: string; status: NodeStatus };
  secondary: { host: string; status: NodeStatus };
};

type FailoverEvent = {
  id: string;
  component: string;
  from: string;
  to: string;
  timestamp: string;
  reason: string;
};


const STATUS_CLS: Record<NodeStatus, string> = {
  PRIMARY:   "bg-emerald-400/10 text-emerald-400",
  SECONDARY: "bg-slate-700 text-slate-400",
  FAILED:    "bg-rose-400/10 text-rose-400",
};

type ServiceHealth = { service: string; status: string; latencyMs: number | null; region?: string; checkedAt: string };
type RiskSnap      = { killSwitchEnabled: boolean; stopOutLevelPct: number };

export function FailoverPanel() {
  const qc    = useQueryClient();
  const toast = useToast();
  const [log,           setLog]           = useState<FailoverEvent[]>([]);
  const [killConfirm,   setKillConfirm]   = useState(false);
  const [resumeConfirm, setResumeConfirm] = useState(false);

  // Real service health from backend
  const healthQ = useQuery<ServiceHealth[]>({
    queryKey: ["admin", "service-health"],
    queryFn: () => apiGet("/api/v1/admin/service-health", "admin"),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const riskQ = useQuery<RiskSnap>({
    queryKey: ["admin", "failover-risk"],
    queryFn: () => apiGet("/api/v1/risk/snapshot", "admin"),
    staleTime: 8_000,
    refetchInterval: 10_000,
  });

  const killActive = riskQ.data?.killSwitchEnabled ?? false;

  const killMut = useMutation({
    mutationFn: ({ enabled, reason }: { enabled: boolean; reason: string }) =>
      apiPost("/api/v1/admin/trading/kill-switch", { enabled, reason }, "admin"),
    onSuccess: (_, vars) => {
      toast.success(vars.enabled ? "Kill switch ACTIVATED" : "Trading RESUMED", vars.reason);
      void qc.invalidateQueries({ queryKey: ["admin", "failover-risk"] });
      const event: FailoverEvent = {
        id: String(Date.now()),
        component: "Trading Engine",
        from: vars.enabled ? "LIVE" : "HALTED",
        to:   vars.enabled ? "HALTED" : "LIVE",
        timestamp: new Date().toISOString(),
        reason: vars.reason,
      };
      setLog((prev) => [event, ...prev]);
      setKillConfirm(false);
      setResumeConfirm(false);
    },
    onError: (e) => toast.error("Kill switch failed", e instanceof Error ? e.message : "Error"),
  });

  // Map real service health to component view
  const components: FailoverComponent[] = (healthQ.data ?? []).map((s: any, i: number) => ({
    id: String(i + 1),
    name: (s.service ?? s.name ?? "Service").replace("-", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    active: "primary" as const,
    primary:   { host: `${s.region ?? "eu-west"}-1.igfx.prod`, status: (s.status === "operational" ? "PRIMARY" : "FAILED") as NodeStatus },
    secondary: { host: `${s.region ?? "eu-west"}-2.igfx.prod`, status: "SECONDARY" as NodeStatus },
    latencyMs: s.latencyMs,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Failover &amp; Kill Switch</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { void healthQ.refetch(); void riskQ.refetch(); }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] text-slate-400 transition hover:text-white">
              <RefreshCw size={11} className={healthQ.isFetching ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Kill switch banner */}
      {killActive && (
        <div className="border-b border-rose-500/40 bg-rose-500/10 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldOff size={14} className="text-rose-400" />
            <span className="text-[13px] font-black text-rose-300">KILL SWITCH ACTIVE — All trading halted</span>
          </div>
          <button type="button" onClick={() => setResumeConfirm(true)}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25">
            Resume Trading
          </button>
        </div>
      )}

      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        {/* Kill switch confirm */}
        {killConfirm && (
          <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-400" />
              <p className="text-sm text-rose-300">Activate KILL SWITCH? All trading will be halted immediately.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={killMut.isPending}
                onClick={() => killMut.mutate({ enabled: true, reason: "Manual kill switch — admin panel" })}
                className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-[12px] font-bold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50">
                {killMut.isPending ? "Activating…" : "HALT TRADING"}
              </button>
              <button type="button" onClick={() => setKillConfirm(false)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] font-bold text-slate-400">Cancel</button>
            </div>
          </div>
        )}
        {resumeConfirm && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
            <p className="text-sm text-emerald-300">Resume all trading? Kill switch will be deactivated.</p>
            <div className="flex gap-2">
              <button type="button" disabled={killMut.isPending}
                onClick={() => killMut.mutate({ enabled: false, reason: "Manual resume — admin panel" })}
                className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50">
                {killMut.isPending ? "Resuming…" : "Resume Trading"}
              </button>
              <button type="button" onClick={() => setResumeConfirm(false)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] font-bold text-slate-400">Cancel</button>
            </div>
          </div>
        )}

        {/* Kill Switch control card */}
        <div className={`rounded-xl border p-5 ${killActive ? "border-rose-500/40 bg-rose-500/[0.05]" : "border-slate-800 bg-slate-900"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {killActive ? <ShieldOff size={18} className="text-rose-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
              <div>
                <p className="font-bold text-white">Global Kill Switch</p>
                <p className="text-[11px] text-slate-500">Immediately halts all order execution platform-wide</p>
              </div>
            </div>
            <button type="button"
              onClick={() => killActive ? setResumeConfirm(true) : setKillConfirm(true)}
              className={`rounded-xl px-4 py-2 text-[12px] font-black transition ${
                killActive
                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
              }`}>
              {killActive ? "Resume Trading" : "Activate Kill Switch"}
            </button>
          </div>
        </div>

        {/* Components */}
        <div className="space-y-3">
          {components.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-bold text-white">{c.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {(["primary", "secondary"] as const).map((node) => {
                      const info    = c[node];
                      const isActive = c.active === node;
                      return (
                        <div key={node} className={`rounded-lg border px-3 py-2 ${
                          isActive ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800 bg-slate-950/50"
                        }`}>
                          <p className="text-[10px] font-bold uppercase text-slate-500">{node}</p>
                          <p className="text-[11px] font-mono text-slate-400">{info.host}</p>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[info.status]}`}>
                            {isActive ? "ACTIVE" : info.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => toast.error("Manual failover", "No failover API available — contact infrastructure team.")}
                    className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20"
                  >
                    <RefreshCw size={11} /> Switch
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.error("Health test", "Health checks run automatically — see service status above.")}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-400 transition hover:border-slate-500"
                  >
                    Test
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Event log */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Failover Event Log</h2>
          {log.length === 0 ? (
            <p className="text-[12px] text-slate-600">No failover events recorded.</p>
          ) : (
            <ul className="space-y-2">
              {log.map((ev) => (
                <li key={ev.id} className="border-b border-slate-800/40 pb-2 last:border-0 last:pb-0 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{ev.component}</span>
                    <span className="text-slate-600">{dateTime(ev.timestamp)}</span>
                  </div>
                  <p className="text-slate-500">
                    {ev.from} <span className="text-cyan-400">→</span> {ev.to}
                  </p>
                  <p className="text-slate-600 italic">{ev.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

export default FailoverPanel;
