/**
 * AIBehaviorControl — Toggle switches and sliders for AI autopilot behavior
 */
import { useState, useEffect } from "react";
import { Bot, Save, RotateCcw } from "lucide-react";

const LS_KEY = "igfx_ai_behavior";

type AIBehaviorConfig = {
  autopilotEnabled: boolean;
  riskFilterEnabled: boolean;
  signalConfirmRequired: boolean;
  maxDailyTrades: number;
  minConfidence: number;
  inactivityTimeoutMin: number;
};

const DEFAULTS: AIBehaviorConfig = {
  autopilotEnabled:      true,
  riskFilterEnabled:     true,
  signalConfirmRequired: false,
  maxDailyTrades:        20,
  minConfidence:         75,
  inactivityTimeoutMin:  60,
};

function loadConfig(): AIBehaviorConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AIBehaviorConfig>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function Toggle({
  enabled, onChange, label, sub,
}: { enabled: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
          enabled ? "bg-cyan-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function SliderRow({
  label, sub, value, min, max, step, unit, onChange,
}: {
  label: string; sub?: string; value: number;
  min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
        </div>
        <span className="rounded-full bg-cyan-400/10 px-3 py-0.5 text-sm font-bold text-cyan-400">
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-700">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export function AIBehaviorControl() {
  const [cfg, setCfg]   = useState<AIBehaviorConfig>(loadConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSaved(false); }, [cfg]);

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function reset() {
    setCfg(DEFAULTS);
    localStorage.removeItem(LS_KEY);
  }

  function set<K extends keyof AIBehaviorConfig>(key: K, val: AIBehaviorConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">AI Behavior Control</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[12px] text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              <RotateCcw size={12} /> Reset defaults
            </button>
            <button
              type="button"
              onClick={save}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold transition ${
                saved
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-cyan-400/15 text-cyan-300 hover:bg-cyan-400/25"
              }`}
            >
              <Save size={12} /> {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] space-y-6 p-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-[11px] text-slate-500">
            Settings are stored locally in this browser. Changes take effect on the next AI cycle.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Core Toggles</h2>
          <Toggle
            label="Autopilot Enabled"
            sub="Allow OLOS AI to execute trades automatically"
            enabled={cfg.autopilotEnabled}
            onChange={(v) => set("autopilotEnabled", v)}
          />
          <Toggle
            label="Risk Filter"
            sub="Block trades that exceed configured risk parameters"
            enabled={cfg.riskFilterEnabled}
            onChange={(v) => set("riskFilterEnabled", v)}
          />
          <Toggle
            label="Signal Confirmation Required"
            sub="Require manual confirmation before executing AI signals"
            enabled={cfg.signalConfirmRequired}
            onChange={(v) => set("signalConfirmRequired", v)}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Limits & Thresholds</h2>
          <SliderRow
            label="Max Daily Trades"
            sub="Maximum number of AI-executed trades per day"
            value={cfg.maxDailyTrades}
            min={1} max={50} step={1} unit=""
            onChange={(v) => set("maxDailyTrades", v)}
          />
          <SliderRow
            label="Minimum Confidence"
            sub="Signals below this threshold will be filtered out"
            value={cfg.minConfidence}
            min={0} max={100} step={1} unit="%"
            onChange={(v) => set("minConfidence", v)}
          />
          <SliderRow
            label="Inactivity Timeout"
            sub="Auto-pause autopilot after N minutes of client inactivity"
            value={cfg.inactivityTimeoutMin}
            min={5} max={240} step={5} unit=" min"
            onChange={(v) => set("inactivityTimeoutMin", v)}
          />
        </section>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Configuration Summary</h2>
          <ul className="space-y-2 text-[12px]">
            {(
              [
                ["Autopilot",           cfg.autopilotEnabled      ? "Enabled"       : "Disabled"],
                ["Risk Filter",         cfg.riskFilterEnabled     ? "Enabled"       : "Disabled"],
                ["Signal Confirmation", cfg.signalConfirmRequired ? "Required"      : "Not Required"],
                ["Max Daily Trades",    String(cfg.maxDailyTrades)],
                ["Min Confidence",      `${cfg.minConfidence}%`],
                ["Inactivity Timeout",  `${cfg.inactivityTimeoutMin} min`],
              ] as [string, string][]
            ).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-500">{k}</span>
                <span className="font-bold text-white">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

export default AIBehaviorControl;
