/**
 * EventRiskShield — Economic event risk management with shield toggle
 */
import { useState } from "react";
import { Shield, AlertTriangle } from "lucide-react";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

type EconomicEvent = {
  id: string;
  name: string;
  currency: string;
  datetime: string;
  riskLevel: RiskLevel;
  shielded: boolean;
};

const RISK_CLS: Record<RiskLevel, string> = {
  LOW:     "bg-emerald-400/10 text-emerald-400",
  MEDIUM:  "bg-amber-400/10 text-amber-400",
  HIGH:    "bg-rose-400/10 text-rose-400",
  EXTREME: "bg-violet-400/10 text-violet-400",
};

const INITIAL_EVENTS: EconomicEvent[] = [
  { id: "1", name: "FOMC Rate Decision",          currency: "USD", datetime: "2026-06-12T18:00:00Z", riskLevel: "EXTREME", shielded: true  },
  { id: "2", name: "US Non-Farm Payrolls",         currency: "USD", datetime: "2026-06-07T12:30:00Z", riskLevel: "HIGH",    shielded: true  },
  { id: "3", name: "US CPI YoY",                   currency: "USD", datetime: "2026-06-10T12:30:00Z", riskLevel: "HIGH",    shielded: true  },
  { id: "4", name: "ECB Rate Decision",            currency: "EUR", datetime: "2026-06-06T11:45:00Z", riskLevel: "EXTREME", shielded: true  },
  { id: "5", name: "UK GDP MoM",                   currency: "GBP", datetime: "2026-06-13T06:00:00Z", riskLevel: "MEDIUM",  shielded: false },
  { id: "6", name: "Germany ZEW Economic Sentiment", currency: "EUR", datetime: "2026-06-09T09:00:00Z", riskLevel: "MEDIUM",  shielded: false },
  { id: "7", name: "BOJ Policy Rate",              currency: "JPY", datetime: "2026-06-14T04:00:00Z", riskLevel: "HIGH",    shielded: true  },
  { id: "8", name: "US Retail Sales",              currency: "USD", datetime: "2026-06-16T12:30:00Z", riskLevel: "LOW",     shielded: false },
];

export function EventRiskShield() {
  const [shieldActive, setShieldActive] = useState(true);
  const [preMinutes,   setPreMinutes]   = useState(30);
  const [postMinutes,  setPostMinutes]  = useState(15);
  const [events, setEvents] = useState<EconomicEvent[]>(INITIAL_EVENTS);

  function toggleShielded(id: string) {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, shielded: !e.shielded } : e))
    );
  }

  const shieldedHighRisk = events.filter(
    (e) => e.shielded && (e.riskLevel === "HIGH" || e.riskLevel === "EXTREME")
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-cyan-400" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
            <h1 className="text-xl font-extrabold text-white">Event Risk Shield</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        {/* Shield master toggle */}
        <div className={`rounded-xl border p-5 ${
          shieldActive
            ? "border-cyan-500/40 bg-cyan-500/5"
            : "border-slate-800 bg-slate-900"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className={shieldActive ? "text-cyan-400" : "text-slate-500"} />
              <div>
                <p className="font-bold text-white">Shield Active</p>
                <p className="text-[11px] text-slate-500">
                  Block trading during high-risk events. Currently protecting {shieldedHighRisk} events.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShieldActive((p) => !p)}
              className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
                shieldActive ? "bg-cyan-500" : "bg-slate-700"
              }`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
                shieldActive ? "left-6" : "left-1"
              }`} />
            </button>
          </div>

          {shieldActive && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex justify-between text-[12px]">
                  <span className="text-slate-400">Block before event</span>
                  <span className="font-bold text-cyan-400">{preMinutes} min</span>
                </div>
                <input
                  type="range" min={5} max={120} step={5} value={preMinutes}
                  onChange={(e) => setPreMinutes(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <div className="mb-2 flex justify-between text-[12px]">
                  <span className="text-slate-400">Block after event</span>
                  <span className="font-bold text-cyan-400">{postMinutes} min</span>
                </div>
                <input
                  type="range" min={0} max={60} step={5} value={postMinutes}
                  onChange={(e) => setPostMinutes(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Events list */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Upcoming Economic Events
          </h2>
          <ul className="space-y-2">
            {events.map((ev) => (
              <li
                key={ev.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  ev.shielded && shieldActive
                    ? "border-cyan-500/20 bg-cyan-500/5"
                    : "border-slate-800 bg-slate-950/50"
                }`}
              >
                <AlertTriangle
                  size={14}
                  className={
                    ev.riskLevel === "EXTREME" || ev.riskLevel === "HIGH"
                      ? "text-rose-400"
                      : "text-amber-400"
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-[13px]">{ev.name}</span>
                    <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                      {ev.currency}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_CLS[ev.riskLevel]}`}>
                      {ev.riskLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {new Date(ev.datetime).toLocaleString("en-US", {
                      month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleShielded(ev.id)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                    ev.shielded
                      ? "bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30"
                      : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                  }`}
                >
                  {ev.shielded ? "Shielded" : "Shield"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

export default EventRiskShield;
