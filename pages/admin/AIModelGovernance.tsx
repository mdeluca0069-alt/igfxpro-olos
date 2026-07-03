/**
 * AIModelGovernance — AI model registry: status and retrain controls.
 * Accuracy metrics are sourced from production signal telemetry when available;
 * the accuracy column shows "—" until the telemetry API is connected.
 */
import { useState } from "react";
import { Bot, RefreshCw, Cpu, Info } from "lucide-react";
import { dateShort } from "../../shared/utils/format";

type ModelStatus = "Active" | "Training" | "Paused";

type AIModel = {
  id: string;
  name: string;
  version: string;
  status: ModelStatus;
  updatedAt: string;
  component: string;
};

const STATUS_CLS: Record<ModelStatus, string> = {
  Active:   "bg-emerald-400/10 text-emerald-400",
  Training: "bg-amber-400/10 text-amber-400",
  Paused:   "bg-slate-700 text-slate-400",
};

const REGISTERED_MODELS: AIModel[] = [
  { id: "1",  name: "Regime Detector",     version: "3.2.1", status: "Active",   updatedAt: "2026-05-28T10:00:00Z", component: "olos-signal-engine"     },
  { id: "2",  name: "Confidence Engine",   version: "2.8.0", status: "Active",   updatedAt: "2026-05-30T08:30:00Z", component: "olos-signal-engine"     },
  { id: "3",  name: "Sentiment Analyzer",  version: "1.9.4", status: "Training", updatedAt: "2026-06-01T14:00:00Z", component: "macro-sensor"           },
  { id: "4",  name: "Flow Predictor",      version: "4.0.2", status: "Active",   updatedAt: "2026-05-25T12:00:00Z", component: "olos-signal-engine"     },
  { id: "5",  name: "Risk Scorer",         version: "2.1.0", status: "Active",   updatedAt: "2026-06-01T06:00:00Z", component: "risk-service"           },
  { id: "6",  name: "Scenario Model",      version: "1.5.3", status: "Paused",   updatedAt: "2026-05-20T09:00:00Z", component: "var-engine"             },
  { id: "7",  name: "Autopilot Core",      version: "5.1.0", status: "Active",   updatedAt: "2026-06-01T22:00:00Z", component: "autopilot-service"      },
  { id: "8",  name: "Macro Sensor",        version: "3.0.1", status: "Active",   updatedAt: "2026-05-29T16:00:00Z", component: "macro-sensor"           },
  { id: "9",  name: "Volume Profiler",     version: "2.4.0", status: "Active",   updatedAt: "2026-05-31T11:00:00Z", component: "execution-service"      },
  { id: "10", name: "Momentum Engine",     version: "1.7.2", status: "Training", updatedAt: "2026-06-01T18:00:00Z", component: "olos-signal-engine"     },
  { id: "11", name: "Pattern Recognizer",  version: "3.3.0", status: "Active",   updatedAt: "2026-05-28T20:00:00Z", component: "olos-signal-engine"     },
  { id: "12", name: "Liquidity Probe",     version: "2.0.5", status: "Active",   updatedAt: "2026-05-30T07:00:00Z", component: "liquidity-engine"       },
];

export function AIModelGovernance() {
  const [models, setModels] = useState<AIModel[]>(REGISTERED_MODELS);
  const [retrainingId, setRetrainingId] = useState<string | null>(null);

  const activeCount   = models.filter((m) => m.status === "Active").length;
  const trainingCount = models.filter((m) => m.status === "Training").length;
  const pausedCount   = models.filter((m) => m.status === "Paused").length;

  function handleRetrain(id: string) {
    setRetrainingId(id);
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "Training" } : m))
    );
    setTimeout(() => {
      setModels((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: "Active", updatedAt: new Date().toISOString() }
            : m
        )
      );
      setRetrainingId(null);
    }, 3000);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Bot size={18} className="text-cyan-400" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
            <h1 className="text-xl font-extrabold text-white">AI Model Governance</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">

        {/* Telemetry notice */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Info size={14} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            <span className="font-bold text-amber-300">Accuracy metrics</span> are derived from production signal
            telemetry (win-rate calibration against closed trades). Connect
            <span className="font-mono text-amber-200"> GET /api/v1/admin/ai-telemetry</span> to populate live
            figures. The table currently shows model configuration only — no static accuracy values are displayed.
          </p>
        </div>

        {/* Stats header */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active Models",   value: `${activeCount} / ${models.length}`,  icon: Cpu,      cls: "text-emerald-400" },
            { label: "In Training",     value: String(trainingCount),                 icon: RefreshCw, cls: "text-amber-400"  },
            { label: "Paused",          value: String(pausedCount),                   icon: Bot,      cls: "text-slate-400"   },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <Icon size={14} className={cls} />
              </div>
              <p className={`mt-2 text-2xl font-extrabold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Models table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["Model", "Version", "Component", "Accuracy", "Status", "Last Updated", ""].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
                  <td className="px-4 py-3 font-semibold text-white">{m.name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">v{m.version}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{m.component}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-slate-600 italic">— telemetry pending</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[m.status]}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{dateShort(m.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleRetrain(m.id)}
                      disabled={retrainingId === m.id || m.status === "Training"}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
                    >
                      <RefreshCw size={10} className={retrainingId === m.id ? "animate-spin" : ""} />
                      {retrainingId === m.id ? "Training…" : "Retrain"}
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

export default AIModelGovernance;
