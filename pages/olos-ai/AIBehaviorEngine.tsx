/**
 * AI Behavior Engine — Configure OLOS AI behavior and trading parameters
 */
import { useState, useEffect } from "react";
import { Settings, Save, Check, ToggleLeft, ToggleRight, Sliders } from "lucide-react";

type BehaviorConfig = {
  autoTrading: boolean;
  riskFiltering: boolean;
  signalConfirmation: boolean;
  confidenceThreshold: number;
  riskAppetite: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  timeframePreference: "INTRADAY" | "SWING" | "POSITION" | "ALL";
  maxPositions: number;
  signalExpiry: number;
};

const DEFAULT_CONFIG: BehaviorConfig = {
  autoTrading: false,
  riskFiltering: true,
  signalConfirmation: true,
  confidenceThreshold: 65,
  riskAppetite: "MODERATE",
  timeframePreference: "ALL",
  maxPositions: 5,
  signalExpiry: 60,
};

const STORAGE_KEY = "olos_behavior_config";

function Toggle({ enabled, onChange, label, description }: { enabled: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-800/30">
      <div className="flex-1 mr-4">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
      </div>
      <button onClick={() => onChange(!enabled)} className="flex-shrink-0">
        {enabled
          ? <ToggleRight size={32} className="text-cyan-400" />
          : <ToggleLeft size={32} className="text-slate-600" />}
      </button>
    </div>
  );
}

export default function AIBehaviorEngine() {
  const [config, setConfig] = useState<BehaviorConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setConfig(JSON.parse(stored) as BehaviorConfig);
    } catch { /* ignore */ }
  }, []);

  const update = <K extends keyof BehaviorConfig>(key: K, value: BehaviorConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const reset = () => {
    setConfig(DEFAULT_CONFIG);
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings className="text-cyan-400" size={20} />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">OLOS AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Behavior Engine</h1>
          <p className="text-slate-400 mt-1">Configura il comportamento e le preferenze dell'AI</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="rounded-xl border border-slate-700 px-4 py-2 text-[12px] text-slate-400 hover:bg-slate-800 transition">
            Reset
          </button>
          <button onClick={save} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition ${saved ? "bg-emerald-400 text-slate-950" : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"}`}>
            {saved ? <><Check size={14} /> Salvato</> : <><Save size={14} /> Salva</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Toggles */}
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ToggleRight size={16} className="text-cyan-400" /> Funzionalità
            </h2>
            <div className="space-y-3">
              <Toggle
                enabled={config.autoTrading}
                onChange={(v) => update("autoTrading", v)}
                label="Auto-Trading"
                description="OLOS esegue automaticamente gli ordini quando il confidence supera la soglia"
              />
              <Toggle
                enabled={config.riskFiltering}
                onChange={(v) => update("riskFiltering", v)}
                label="Risk Filtering"
                description="Filtra i segnali che superano i limiti di rischio del portafoglio"
              />
              <Toggle
                enabled={config.signalConfirmation}
                onChange={(v) => update("signalConfirmation", v)}
                label="Signal Confirmation"
                description="Richiede conferma multi-timeframe prima di generare un segnale"
              />
            </div>

            {config.autoTrading && (
              <div className="mt-3 p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
                <p className="text-[11px] text-amber-400">Auto-trading attivo: OLOS eseguirà ordini in autonomia. Assicurati che i parametri di rischio siano corretti.</p>
              </div>
            )}
          </div>

          {/* Sliders */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Sliders size={16} className="text-cyan-400" /> Parametri
            </h2>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Confidence Threshold</label>
                  <span className={`text-sm font-bold ${config.confidenceThreshold >= 70 ? "text-emerald-400" : config.confidenceThreshold >= 50 ? "text-amber-400" : "text-rose-400"}`}>{config.confidenceThreshold}%</span>
                </div>
                <input type="range" min={20} max={95} step={5} value={config.confidenceThreshold}
                  onChange={(e) => update("confidenceThreshold", Number(e.target.value))}
                  className="w-full accent-cyan-400" />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>20% (Low)</span><span>95% (High)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Max Posizioni Aperte</label>
                  <span className="text-sm font-bold text-white">{config.maxPositions}</span>
                </div>
                <input type="range" min={1} max={20} step={1} value={config.maxPositions}
                  onChange={(e) => update("maxPositions", Number(e.target.value))}
                  className="w-full accent-cyan-400" />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>1</span><span>20</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Scadenza Segnale (min)</label>
                  <span className="text-sm font-bold text-white">{config.signalExpiry}m</span>
                </div>
                <input type="range" min={15} max={240} step={15} value={config.signalExpiry}
                  onChange={(e) => update("signalExpiry", Number(e.target.value))}
                  className="w-full accent-cyan-400" />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>15m</span><span>4h</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selects */}
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4">Profilo di Trading</h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">Risk Appetite</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"] as const).map((r) => (
                    <button key={r} onClick={() => update("riskAppetite", r)}
                      className={`rounded-lg py-2.5 text-[11px] font-bold transition ${config.riskAppetite === r
                        ? r === "CONSERVATIVE" ? "bg-emerald-400/20 border border-emerald-400/40 text-emerald-400"
                          : r === "MODERATE" ? "bg-amber-400/20 border border-amber-400/40 text-amber-400"
                          : "bg-rose-400/20 border border-rose-400/40 text-rose-400"
                        : "border border-slate-700 text-slate-500 hover:border-slate-600"}`}>
                      {r === "CONSERVATIVE" ? "Conservativo" : r === "MODERATE" ? "Moderato" : "Aggressivo"}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {config.riskAppetite === "CONSERVATIVE" && "Priorità alla protezione del capitale. Stop loss stretti, dimensioni ridotte."}
                  {config.riskAppetite === "MODERATE" && "Equilibrio tra rischio e rendimento. Impostazioni standard raccomandate."}
                  {config.riskAppetite === "AGGRESSIVE" && "Massimizzazione del rendimento. Posizioni più grandi, maggiore tolleranza al drawdown."}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">Preferenza Timeframe</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["INTRADAY", "SWING", "POSITION", "ALL"] as const).map((t) => (
                    <button key={t} onClick={() => update("timeframePreference", t)}
                      className={`rounded-lg py-2.5 text-[11px] font-bold transition ${config.timeframePreference === t ? "bg-cyan-400/20 border border-cyan-400/40 text-cyan-400" : "border border-slate-700 text-slate-500 hover:border-slate-600"}`}>
                      {t === "ALL" ? "Tutti" : t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Config summary */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-4">Riepilogo Configurazione</h2>
            <div className="space-y-2.5">
              {[
                { label: "Auto-Trading", value: config.autoTrading ? "Attivo" : "Disattivo", ok: !config.autoTrading },
                { label: "Risk Filtering", value: config.riskFiltering ? "Attivo" : "Disattivo", ok: config.riskFiltering },
                { label: "Confidence Min", value: `${config.confidenceThreshold}%`, ok: config.confidenceThreshold >= 60 },
                { label: "Risk Appetite", value: config.riskAppetite, ok: config.riskAppetite !== "AGGRESSIVE" },
                { label: "Timeframe", value: config.timeframePreference, ok: true },
                { label: "Max Posizioni", value: config.maxPositions, ok: config.maxPositions <= 10 },
              ].map(({ label, value, ok }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0">
                  <span className="text-[11px] text-slate-400">{label}</span>
                  <span className={`text-[12px] font-bold ${ok ? "text-white" : "text-amber-400"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AIBehaviorEngine };
