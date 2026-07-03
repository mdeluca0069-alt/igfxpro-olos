/**
 * FeatureFlags — Backend-backed feature flag management
 * GET /api/v1/admin/feature-flags  · POST /api/v1/admin/feature-flags
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Save, RefreshCw } from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { useToast } from "../../components/ui/Toast";

type FlagScope = "ALL" | "VIP" | "ENTERPRISE";

type FeatureFlag = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: FlagScope;
  lastChanged: string;
};

const SCOPE_CLS: Record<FlagScope, string> = {
  ALL:        "bg-slate-700 text-slate-300",
  VIP:        "bg-violet-400/10 text-violet-400",
  ENTERPRISE: "bg-emerald-400/10 text-emerald-400",
};

// Canonical flag definitions — backend returns enabled/disabled state
const FLAG_DEFS: Omit<FeatureFlag, "enabled" | "lastChanged">[] = [
  { id: "aiTrading",                name: "olos-ai-trading",         description: "OLOS AI autopilot execution",                     scope: "ALL"        },
  { id: "smartSignals",             name: "smart-signals",           description: "AI signal generation and broadcasting",           scope: "ALL"        },
  { id: "brokerControlCenter",      name: "broker-control-center",   description: "Admin broker control center panel",               scope: "ALL"        },
  { id: "hedgeAutomation",          name: "hedge-automation",        description: "Automated hedging via correlation engine",         scope: "ENTERPRISE" },
  { id: "institutionalCharts",      name: "institutional-charts",    description: "Advanced charting with institutional overlays",    scope: "ALL"        },
  { id: "olosAi",                   name: "olos-ai",                 description: "OLOS AI suite (signals, backtesting, strategy)",   scope: "ALL"        },
  { id: "sandboxExecution",         name: "sandbox-execution",       description: "Sandbox/demo order execution mode",               scope: "ALL"        },
  { id: "liveTrading",              name: "live-trading",            description: "Real-money order execution",                      scope: "ALL"        },
  { id: "negativeBalanceProtection",name: "negative-balance-prot",   description: "ESMA negative balance protection",                scope: "ALL"        },
  { id: "esmaRetailLeverage",       name: "esma-retail-leverage",    description: "ESMA retail leverage caps enforcement",           scope: "ALL"        },
  { id: "kycRequiredBeforeLive",    name: "kyc-required-live",       description: "KYC verification required before live trading",   scope: "ALL"        },
];

export function FeatureFlags() {
  const qc    = useQueryClient();
  const toast = useToast();

  const { data: serverFlags, isFetching, refetch } = useQuery<Record<string, boolean>>({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => apiGet("/api/v1/admin/feature-flags", "admin"),
    staleTime: 30_000,
  });

  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (serverFlags && Object.keys(local).length === 0) {
      setLocal(serverFlags);
    }
  }, [serverFlags]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMut = useMutation({
    mutationFn: (flags: Record<string, boolean>) =>
      apiPost("/api/v1/admin/feature-flags", flags, "admin"),
    onSuccess: () => {
      toast.success("Feature flags saved", "Changes persisted to backend");
      void qc.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
      setDirty(false);
    },
    onError: (e) => toast.error("Save failed", e instanceof Error ? e.message : "Error"),
  });

  function toggle(id: string) {
    setLocal((prev) => ({ ...prev, [id]: !prev[id] }));
    setDirty(true);
  }

  const flags: FeatureFlag[] = FLAG_DEFS.map((def) => ({
    ...def,
    enabled:     local[def.id] ?? serverFlags?.[def.id] ?? false,
    lastChanged: new Date().toISOString(),
  }));

  const enabled  = flags.filter((f) => f.enabled).length;
  const disabled = flags.length - enabled;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Feature Flags</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span><span className="font-bold text-emerald-400">{enabled}</span> enabled</span>
              <span><span className="font-bold text-slate-400">{disabled}</span> disabled</span>
            </div>
            <button type="button" onClick={() => void refetch()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-400 transition hover:text-white">
              <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
            </button>
            <button type="button" disabled={!dirty || saveMut.isPending}
              onClick={() => saveMut.mutate(local)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                dirty
                  ? "bg-cyan-400/15 text-cyan-300 hover:bg-cyan-400/25"
                  : "bg-slate-800 text-slate-500"
              }`}>
              <Save size={12} /> {saveMut.isPending ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] p-6">
        {dirty && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-300">
            You have unsaved changes — click "Save changes" to persist to backend.
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["Flag", "Description", "Scope", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.id} className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] font-semibold text-white">{f.name}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-400">{f.description}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SCOPE_CLS[f.scope]}`}>
                      {f.scope}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggle(f.id)}
                      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                        f.enabled ? "bg-emerald-500" : "bg-slate-700"
                      }`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
                        f.enabled ? "left-5" : "left-0.5"
                      }`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default FeatureFlags;
