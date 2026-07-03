/**
 * MarketFreezeControl — Per-symbol freeze toggles + global freeze with log
 */
import { useState } from "react";
import { AlertTriangle, Lock, Unlock } from "lucide-react";
import { dateTime } from "../../shared/utils/format";

const LS_KEY = "igfx_market_freeze";

type SymbolState = { frozen: boolean };
type FreezeLog   = { id: string; action: string; target: string; timestamp: string };

const SYMBOLS = [
  "EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD",
  "USDCHF","NZDUSD","EURGBP","EURJPY","XAUUSD","BTCUSD","ETHUSD",
];

function loadState(): Record<string, SymbolState> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, SymbolState>;
  } catch { /* ignore */ }
  return Object.fromEntries(SYMBOLS.map((s) => [s, { frozen: false }]));
}

function saveState(state: Record<string, SymbolState>) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function MarketFreezeControl() {
  const [symbolStates, setSymbolStates] = useState<Record<string, SymbolState>>(loadState);
  const [globalFrozen, setGlobalFrozen] = useState(false);
  const [log, setLog]   = useState<FreezeLog[]>([]);
  const [confirm, setConfirm] = useState<{ action: "global_freeze" | "global_unfreeze" | null }>({ action: null });

  const frozenCount = Object.values(symbolStates).filter((s) => s.frozen).length;

  function addLog(action: string, target: string) {
    const entry: FreezeLog = {
      id: String(Date.now()),
      action, target,
      timestamp: new Date().toISOString(),
    };
    setLog((prev) => [entry, ...prev].slice(0, 50));
  }

  function toggleSymbol(sym: string) {
    setSymbolStates((prev) => {
      const next = { ...prev, [sym]: { frozen: !prev[sym]?.frozen } };
      saveState(next);
      addLog(next[sym]?.frozen ? "FREEZE" : "UNFREEZE", sym);
      return next;
    });
  }

  function setGlobal(freeze: boolean) {
    const next = Object.fromEntries(SYMBOLS.map((s) => [s, { frozen: freeze }]));
    setSymbolStates(next);
    saveState(next);
    setGlobalFrozen(freeze);
    addLog(freeze ? "GLOBAL FREEZE" : "GLOBAL UNFREEZE", "ALL MARKETS");
    setConfirm({ action: null });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Market Freeze Control</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        {/* Global freeze warning */}
        {(globalFrozen || frozenCount > 0) && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-4">
            <AlertTriangle size={16} className="text-rose-400" />
            <p className="text-sm font-bold text-rose-300">
              {globalFrozen
                ? "ALL MARKETS FROZEN — trading is blocked for all symbols"
                : `${frozenCount} symbol${frozenCount !== 1 ? "s" : ""} currently frozen`}
            </p>
          </div>
        )}

        {/* Global controls */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setConfirm({ action: "global_freeze" })}
            disabled={globalFrozen}
            className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-[12px] font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
          >
            <Lock size={13} /> Freeze All Markets
          </button>
          <button
            type="button"
            onClick={() => setGlobal(false)}
            disabled={!globalFrozen && frozenCount === 0}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
          >
            <Unlock size={13} /> Unfreeze All Markets
          </button>
        </div>

        {/* Confirm dialog */}
        {confirm.action && (
          <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-400" />
              <p className="text-sm text-rose-300">
                Freeze all markets? This blocks trading globally. Confirm to proceed.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setGlobal(true)}
                className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-[12px] font-bold text-rose-300 hover:bg-rose-500/30">
                Confirm Freeze
              </button>
              <button type="button" onClick={() => setConfirm({ action: null })}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] font-bold text-slate-400 hover:bg-slate-700">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Symbol grid */}
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Symbols</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SYMBOLS.map((sym) => {
                const frozen = symbolStates[sym]?.frozen ?? false;
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleSymbol(sym)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      frozen
                        ? "border-rose-500/30 bg-rose-500/10"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <span className="font-bold text-white">{sym}</span>
                    {frozen
                      ? <Lock size={13} className="text-rose-400" />
                      : <Unlock size={13} className="text-slate-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Freeze log */}
          <div>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Recent Activity</h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              {log.length === 0 ? (
                <p className="text-[12px] text-slate-600">No freeze actions yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {log.slice(0, 12).map((entry) => (
                    <li key={entry.id} className="border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          entry.action.includes("FREEZE") ? "bg-rose-400/10 text-rose-400" : "bg-emerald-400/10 text-emerald-400"
                        }`}>
                          {entry.action}
                        </span>
                        <span className="font-bold text-white text-[11px]">{entry.target}</span>
                      </div>
                      <p className="text-[10px] text-slate-600">{dateTime(entry.timestamp)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MarketFreezeControl;
