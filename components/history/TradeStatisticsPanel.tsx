import { memo, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

export type TradeRecord = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  commission: number;
  swap: number;
  netPnl: number;
  openedAt: string;
  closedAt: string;
  durationMs: number;
  status: string;
};

interface Props {
  trades: TradeRecord[];
}

const EMERALD = "#34d399";
const ROSE    = "#f43f5e";
const CYAN    = "#06b6d4";

function StatCard({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${cls ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function buildPnlBuckets(trades: TradeRecord[]) {
  if (trades.length === 0) return [];
  const pnls   = trades.map((t) => t.netPnl);
  const minPnl = Math.min(...pnls);
  const maxPnl = Math.max(...pnls);
  const range  = maxPnl - minPnl || 1;
  const BUCKETS = 10;
  const step   = range / BUCKETS;

  const buckets: { label: string; count: number; isPositive: boolean }[] = Array.from({ length: BUCKETS }, (_, i) => ({
    label:      `${(minPnl + i * step).toFixed(0)}`,
    count:      0,
    isPositive: (minPnl + (i + 0.5) * step) >= 0,
  }));

  for (const pnl of pnls) {
    const idx = Math.min(Math.floor((pnl - minPnl) / step), BUCKETS - 1);
    buckets[idx].count++;
  }
  return buckets;
}

function buildDurationBuckets(trades: TradeRecord[]) {
  if (trades.length === 0) return [];
  const closed = trades.filter((t) => t.durationMs > 0);
  if (closed.length === 0) return [];

  const buckets = [
    { label: "< 5m",   min: 0,          max: 300_000,    count: 0 },
    { label: "5–30m",  min: 300_000,    max: 1_800_000,  count: 0 },
    { label: "30m–2h", min: 1_800_000,  max: 7_200_000,  count: 0 },
    { label: "2–8h",   min: 7_200_000,  max: 28_800_000, count: 0 },
    { label: "8–24h",  min: 28_800_000, max: 86_400_000, count: 0 },
    { label: "> 1d",   min: 86_400_000, max: Infinity,   count: 0 },
  ];

  for (const t of closed) {
    const b = buckets.find((b) => t.durationMs >= b.min && t.durationMs < b.max);
    if (b) b.count++;
  }
  return buckets.filter((b) => b.count > 0);
}

const PnlTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#050a0f] px-3 py-2 text-[11px]">
      <p className="text-slate-400">{label}</p>
      <p className="font-mono font-bold text-white">{payload[0]?.value} trades</p>
    </div>
  );
};

export const TradeStatisticsPanel = memo(function TradeStatisticsPanel({ trades }: Props) {
  const closed = useMemo(() => trades.filter((t) => t.status === "FILLED" || t.closedAt), [trades]);

  const stats = useMemo(() => {
    if (closed.length === 0) return null;
    const wins    = closed.filter((t) => t.netPnl > 0);
    const losses  = closed.filter((t) => t.netPnl < 0);
    const totalPnl = closed.reduce((s, t) => s + t.netPnl, 0);
    const winAmt  = wins.reduce((s, t) => s + t.netPnl, 0);
    const lossAmt = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));
    const avgWin  = wins.length   > 0 ? winAmt / wins.length   : 0;
    const avgLoss = losses.length > 0 ? lossAmt / losses.length : 0;
    const pf      = lossAmt > 0 ? winAmt / lossAmt : winAmt > 0 ? Infinity : 0;
    const avgDur  = closed.filter((t) => t.durationMs > 0).reduce((s, t) => s + t.durationMs, 0) / (closed.filter((t) => t.durationMs > 0).length || 1);
    return { wins: wins.length, losses: losses.length, totalPnl, avgWin, avgLoss, pf, avgDur };
  }, [closed]);

  const pnlBuckets      = useMemo(() => buildPnlBuckets(closed), [closed]);
  const durationBuckets = useMemo(() => buildDurationBuckets(closed), [closed]);

  if (closed.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-[12px] text-slate-600">
        No closed trades to analyse.
      </div>
    );
  }

  const winRate = stats ? (stats.wins / closed.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Trades"       value={closed.length.toString()} />
        <StatCard label="Win rate"     value={`${winRate.toFixed(1)}%`} cls={winRate >= 50 ? "text-emerald-400" : "text-rose-400"} />
        <StatCard label="Profit factor" value={stats ? (stats.pf === Infinity ? "∞" : stats.pf.toFixed(2)) : "—"}
          cls={stats && stats.pf >= 1 ? "text-emerald-400" : "text-rose-400"} />
        <StatCard label="Avg win"      value={stats ? `+$${stats.avgWin.toFixed(2)}` : "—"} cls="text-emerald-400" />
        <StatCard label="Avg loss"     value={stats ? `-$${stats.avgLoss.toFixed(2)}` : "—"} cls="text-rose-400" />
        <StatCard label="Net P&L"      value={stats ? `${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(2)}` : "—"}
          cls={stats && stats.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"} />
      </div>

      {/* Win/loss bar */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Win / Loss Distribution</p>
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="text-emerald-400 font-bold">{stats?.wins ?? 0} wins ({winRate.toFixed(0)}%)</span>
          <span className="text-rose-400 font-bold">{stats?.losses ?? 0} losses ({(100 - winRate).toFixed(0)}%)</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-rose-400/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${winRate}%` }}
          />
        </div>
      </div>

      {/* P&L histogram */}
      {pnlBuckets.length > 0 && (
        <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">P&amp;L Distribution</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={pnlBuckets} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
              <Tooltip content={<PnlTooltip />} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {pnlBuckets.map((b, i) => (
                  <Cell key={i} fill={b.isPositive ? EMERALD : ROSE} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Duration histogram */}
      {durationBuckets.length > 0 && (
        <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Trade Duration</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={durationBuckets} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
              <Tooltip content={<PnlTooltip />} />
              <Bar dataKey="count" fill={CYAN} opacity={0.8} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});
