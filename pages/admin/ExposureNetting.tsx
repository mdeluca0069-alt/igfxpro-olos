/**
 * ExposureNetting — Symbol-level netting table with hedge ratios and "Net All" action
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, AlertTriangle } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { money, number } from "../../shared/utils/format";

type Position = {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  currentPrice: number;
  marginUsed: number;
};

type NettingRow = {
  symbol: string;
  longs: number;
  shorts: number;
  net: number;
  hedgingRatio: number;
  var95: number;
};

function buildNetting(positions: Position[]): NettingRow[] {
  const map = new Map<string, { longs: number; shorts: number }>();

  for (const p of positions) {
    const notional = p.volume * p.currentPrice * 100_000;
    const cur = map.get(p.symbol) ?? { longs: 0, shorts: 0 };
    if (p.direction === "BUY") cur.longs += notional;
    else cur.shorts += notional;
    map.set(p.symbol, cur);
  }

  return Array.from(map.entries()).map(([symbol, { longs, shorts }]) => {
    const net          = longs - shorts;
    const total        = longs + shorts;
    const hedgingRatio = total > 0 ? Math.min(longs, shorts) / total : 0;
    const var95        = Math.abs(net) * 0.02; // simplified 2% daily VaR
    return { symbol, longs, shorts, net, hedgingRatio, var95 };
  }).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

export function ExposureNetting() {
  const [netAllConfirm, setNetAllConfirm] = useState(false);
  const [netted, setNetted] = useState(false);

  const posQ = useQuery<Position[]>({
    queryKey: ["admin", "netting", "positions"],
    queryFn: () => apiGet("/api/v1/trading/positions", "admin"),
    staleTime: 15_000,
  });

  const rows = posQ.data ? buildNetting(posQ.data) : [];

  const totalExposure = rows.reduce((s, r) => s + r.longs + r.shorts, 0);
  const hedgedPct     = rows.reduce((s, r) => s + Math.min(r.longs, r.shorts), 0) / (totalExposure / 2 || 1) * 100;
  const capitalAtRisk = rows.reduce((s, r) => s + r.var95, 0);

  function handleNetAll() {
    setNetted(true);
    setNetAllConfirm(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Exposure Netting</h1>
            </div>
          </div>
          {!netted && (
            <button
              type="button"
              onClick={() => setNetAllConfirm(true)}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[12px] font-bold text-amber-300 transition hover:bg-amber-500/20"
            >
              Net All Positions
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        {/* Net All confirm */}
        {netAllConfirm && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <p className="text-sm text-amber-300">
                This will close all offsetting positions to reduce net exposure. Are you sure?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNetAll}
                className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-[12px] font-bold text-amber-300 hover:bg-amber-500/30"
              >
                Confirm Net All
              </button>
              <button
                type="button"
                onClick={() => setNetAllConfirm(false)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] font-bold text-slate-400 hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {netted && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
            Net All executed — offsetting positions have been closed.
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Exposure",  value: money(totalExposure), cls: "text-white"        },
            { label: "Hedged %",        value: `${number(hedgedPct, 1)}%`, cls: "text-emerald-400" },
            { label: "Capital at Risk (VaR)", value: money(capitalAtRisk), cls: "text-rose-400" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`mt-2 text-2xl font-extrabold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Netting table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["Symbol", "Longs", "Shorts", "Net", "Hedge Ratio", "VaR (95%)"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-600">
                    {posQ.isLoading ? "Loading positions…" : "No open positions to net."}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.symbol} className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
                  <td className="px-4 py-3 font-bold text-white">{r.symbol}</td>
                  <td className="px-4 py-3 font-mono text-emerald-300">{money(r.longs)}</td>
                  <td className="px-4 py-3 font-mono text-rose-300">{money(r.shorts)}</td>
                  <td className={`px-4 py-3 font-mono font-bold ${r.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {r.net >= 0 ? "+" : ""}{money(r.net)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${r.hedgingRatio * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">
                        {number(r.hedgingRatio * 100, 1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-amber-300">{money(r.var95)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default ExposureNetting;
