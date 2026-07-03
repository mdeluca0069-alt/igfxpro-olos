/**
 * ClientExposureMap — Exposure breakdown per symbol from live positions
 */
import { useQuery } from "@tanstack/react-query";
import { BarChart2, RefreshCw } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { money, number } from "../../shared/utils/format";

type Position = {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  marginUsed: number;
};

type SymbolExposure = {
  symbol: string;
  longExposure: number;
  shortExposure: number;
  netExposure: number;
  positionCount: number;
};

function buildExposureMap(positions: Position[]): SymbolExposure[] {
  const map = new Map<string, SymbolExposure>();

  for (const p of positions) {
    const notional = p.volume * p.currentPrice * 100_000;
    const existing = map.get(p.symbol) ?? {
      symbol: p.symbol, longExposure: 0, shortExposure: 0, netExposure: 0, positionCount: 0,
    };

    if (p.direction === "BUY") {
      existing.longExposure += notional;
    } else {
      existing.shortExposure += notional;
    }
    existing.netExposure  = existing.longExposure - existing.shortExposure;
    existing.positionCount += 1;
    map.set(p.symbol, existing);
  }

  return Array.from(map.values()).sort((a, b) =>
    Math.abs(b.netExposure) - Math.abs(a.netExposure)
  );
}

export function ClientExposureMap() {
  const posQ = useQuery<Position[]>({
    queryKey: ["admin", "exposure", "positions"],
    queryFn: () => apiGet("/api/v1/trading/positions", "admin"),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const positions = posQ.data ?? [];
  const exposure  = buildExposureMap(positions);

  const totalLong  = exposure.reduce((s, e) => s + e.longExposure, 0);
  const totalShort = exposure.reduce((s, e) => s + e.shortExposure, 0);
  const totalNet   = totalLong - totalShort;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Client Exposure Map</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => posQ.refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[12px] text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            <RefreshCw size={12} className={posQ.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        {posQ.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        ) : posQ.isError ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-300">
            Failed to load positions. Backend may be unavailable.
          </div>
        ) : exposure.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
            No open positions — exposure map is empty.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {["Symbol", "Long Exposure", "Short Exposure", "Net Exposure", "Positions"].map((h) => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exposure.map((e) => (
                    <tr key={e.symbol} className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-bold text-white">{e.symbol}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-300">{money(e.longExposure)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-rose-300">{money(e.shortExposure)}</td>
                      <td className="px-4 py-3 font-mono font-bold" style={{ color: e.netExposure >= 0 ? "#34d399" : "#fb7185" }}>
                        {e.netExposure >= 0 ? "+" : ""}{money(e.netExposure)}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-400">{number(e.positionCount, 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-700 bg-slate-900/80 text-[11px] font-bold">
                    <td className="px-4 py-3 uppercase tracking-wider text-slate-400">Total</td>
                    <td className="px-4 py-3 font-mono text-emerald-300">{money(totalLong)}</td>
                    <td className="px-4 py-3 font-mono text-rose-300">{money(totalShort)}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: totalNet >= 0 ? "#34d399" : "#fb7185" }}>
                      {totalNet >= 0 ? "+" : ""}{money(totalNet)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{number(positions.length, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default ClientExposureMap;
