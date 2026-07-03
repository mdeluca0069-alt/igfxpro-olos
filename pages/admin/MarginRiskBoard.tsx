/**
 * MarginRiskBoard — Per-position margin and risk table, highlights danger rows
 */
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, TrendingDown } from "lucide-react";
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
  openedAt: string;
};

type MarginRow = Position & {
  equity: number;
  marginLevel: number;
  stopOutDistance: number;
  riskScore: number;
  user: string;
};

function enrichPosition(p: Position, idx: number): MarginRow {
  const equity          = p.marginUsed + p.unrealizedPnl;
  const marginLevel     = p.marginUsed > 0 ? (equity / p.marginUsed) * 100 : 200;
  const stopOutDistance = marginLevel - 50;
  const riskScore       = Math.min(100, Math.max(0, Math.round((1 - Math.min(marginLevel, 500) / 500) * 100)));
  return { ...p, equity, marginLevel, stopOutDistance, riskScore, user: `Position #${idx + 1}` };
}

export function MarginRiskBoard() {
  const posQ = useQuery<Position[]>({
    queryKey: ["admin", "margin", "positions"],
    queryFn: () => apiGet("/api/v1/trading/positions", "admin"),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const rows: MarginRow[] = (posQ.data ?? []).map(enrichPosition);

  const dangerCount = rows.filter((r) => r.marginLevel < 200).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingDown size={18} className="text-rose-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Margin Risk Board</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dangerCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-400/10 px-3 py-1 text-[11px] font-bold text-rose-400">
                <AlertTriangle size={11} /> {dangerCount} at risk
              </span>
            )}
            <button
              type="button"
              onClick={() => posQ.refetch()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[12px] text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              <RefreshCw size={12} className={posQ.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1300px] p-6">
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["User", "Symbol", "Dir", "Margin Used", "Equity", "Margin Level", "Stop-out Dist.", "Risk Score"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-600">
                    {posQ.isLoading ? "Loading positions…" : "No open positions across all accounts."}
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const danger = r.marginLevel < 200;
                const warn   = r.marginLevel < 300;
                return (
                  <tr
                    key={r.id}
                    className={`border-t transition ${
                      danger
                        ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
                        : warn
                        ? "border-amber-500/20 bg-amber-500/3 hover:bg-amber-500/8"
                        : "border-slate-800/60 hover:bg-slate-900/30"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-white">{r.user}</td>
                    <td className="px-4 py-3 font-bold text-white">{r.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.direction === "BUY" ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
                      }`}>
                        {r.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-white">{money(r.marginUsed)}</td>
                    <td className="px-4 py-3 font-mono text-cyan-300">{money(r.equity)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold ${
                        danger ? "text-rose-400" : warn ? "text-amber-400" : "text-emerald-400"
                      }`}>
                        {number(r.marginLevel, 1)}%
                        {danger && <AlertTriangle size={11} className="ml-1 inline" />}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono text-[12px] ${danger ? "text-rose-400" : "text-slate-400"}`}>
                      {number(r.stopOutDistance, 1)}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${r.riskScore > 70 ? "bg-rose-500" : r.riskScore > 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${r.riskScore}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500">{r.riskScore}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default MarginRiskBoard;
