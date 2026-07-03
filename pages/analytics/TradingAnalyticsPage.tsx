/**
 * Trading Analytics Center — MyFxBook-quality performance analytics.
 * All metrics calculated server-side from real TradeAudit data.
 *
 * Tabs:  Overview · Trades · Behavior · Risk
 */
import { memo, useState }      from "react";
import { useQuery }           from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import {
  Activity, BarChart2, Brain, Download, ExternalLink, FileText, Zap,
} from "lucide-react";
import { apiGet }                          from "../../shared/lib/apiHelpers";
import { money2, number, toN }             from "../../shared/utils/format";
import { usePageTitle }                    from "../../hooks/usePageTitle";
import { downloadAnalyticsPDF, openAnalyticsPDF } from "../../shared/lib/pdfReport";

// ─── Types (mirrors backend TradingAnalyticsReport) ──────────────────────────

type EquityPoint    = { date: string; dailyPnl: number; cumPnl: number; drawdown: number };
type SymbolStat     = { symbol: string; trades: number; wins: number; losses: number; pnl: number; winRate: number; profitFactor: number; avgPnl: number; avgWin: number; avgLoss: number };
type HourStat       = { hour: number; trades: number; pnl: number; winRate: number };
type DowStat        = { dow: number; day: string; trades: number; pnl: number; winRate: number };
type MonthStat      = { month: string; label: string; pnl: number; trades: number; winRate: number };
type StreakStats     = { maxWinStreak: number; maxLossStreak: number; currentStreak: number; currentStreakType: string };
type PnlBucket      = { label: string; count: number; pnl: number; isPositive: boolean };
type AnalyticsTrade = { id: string; symbol: string; side: string; pnl: number; fees: number; durationMs: number; openedAt: string; closedAt: string; entryPrice: number; exitPrice: number };

type AnalyticsSummary = {
  totalTrades: number; winRate: number; lossRate: number;
  profitFactor: number; expectancy: number;
  totalPnl: number; totalFees: number;
  maxDrawdown: number; maxDrawdownUsd: number;
  sharpeRatio: number; sortinoRatio: number; calmarRatio: number;
  avgWin: number; avgLoss: number;
  bestTrade: number; worstTrade: number;
  avgHoldTimeMs: number; avgHoldTimeWinMs: number; avgHoldTimeLossMs: number;
  dailyPnl: number; weeklyPnl: number; monthlyPnl: number;
  annualizedReturn: number; annualizedVol: number; recoveryFactor: number;
  cagr: number;
};

type Report = {
  period:           { days: number; from: string; to: string };
  summary:          AnalyticsSummary;
  equityCurve:      EquityPoint[];
  trades:           AnalyticsTrade[];
  symbolBreakdown:  SymbolStat[];
  hourlyBreakdown:  HourStat[];
  dowBreakdown:     DowStat[];
  monthlyBreakdown: MonthStat[];
  streaks:          StreakStats;
  pnlDistribution:  PnlBucket[];
};

// ─── Design primitives ────────────────────────────────────────────────────────

const CYAN    = "#06b6d4";
const EMERALD = "#34d399";
const ROSE    = "#f43f5e";

function pnlColor(v: number) { return v >= 0 ? "text-emerald-400" : "text-rose-400"; }
function pnlSign(v: number)  { return v >= 0 ? "+" : ""; }

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] px-4 py-3.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <p className={`mt-1.5 font-mono text-xl font-bold tabular-nums ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/40 py-2">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`font-mono text-[12px] font-bold ${color ?? "text-white"}`}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{children}</h3>;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)   return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── Export utilities ─────────────────────────────────────────────────────────

function exportCSV(report: Report) {
  const headers = ["Date", "Symbol", "Side", "Entry", "Exit", "P&L", "Fees", "Duration (min)"];
  const rows = report.trades.map((t) => [
    formatDate(t.closedAt),
    t.symbol,
    t.side,
    toN(t.entryPrice) > 0 ? toN(t.entryPrice).toFixed(5) : "",
    toN(t.exitPrice)  > 0 ? toN(t.exitPrice).toFixed(5)  : "",
    toN(t.pnl).toFixed(2),
    toN(t.fees).toFixed(2),
    (t.durationMs / 60_000).toFixed(0),
  ]);
  const csv  = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `trades_${report.period.from.slice(0, 10)}_${report.period.to.slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportPDFDownload(report: Report, dateRangeLabel: string) {
  downloadAnalyticsPDF(report, dateRangeLabel);
}

function exportPDFOpen(report: Report, dateRangeLabel: string) {
  openAnalyticsPDF(report, dateRangeLabel);
}

// ─── Custom Recharts tooltips ─────────────────────────────────────────────────

function EquityTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const cumPnl   = payload.find((p) => p.name === "cumPnl")?.value   ?? 0;
  const dailyPnl = payload.find((p) => p.name === "dailyPnl")?.value ?? 0;
  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#050a0f] px-3 py-2 text-[11px] shadow-xl">
      <p className="mb-1 text-slate-400">{label}</p>
      <p className={`font-mono font-bold ${pnlColor(cumPnl)}`}>Equity: {pnlSign(cumPnl)}{money2(cumPnl)}</p>
      <p className="font-mono text-slate-400">Day: {pnlSign(dailyPnl)}{money2(dailyPnl)}</p>
    </div>
  );
}

function DrawdownTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const dd = payload.find((p) => p.name === "drawdown")?.value ?? 0;
  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#050a0f] px-3 py-2 text-[11px] shadow-xl">
      <p className="mb-1 text-slate-400">{label}</p>
      <p className="font-mono font-bold text-rose-400">{Math.abs(dd).toFixed(2)}%</p>
    </div>
  );
}

// ─── Monthly Return Heatmap ───────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function MonthlyHeatmap({ data }: { data: MonthStat[] }) {
  if (data.length === 0) return <EmptyState text="No monthly data" />;

  const yearMap = new Map<string, Map<number, MonthStat>>();
  for (const m of data) {
    const [year, mon] = m.month.split("-");
    if (!yearMap.has(year!)) yearMap.set(year!, new Map());
    yearMap.get(year!)!.set(Number(mon) - 1, m);
  }
  const years      = [...yearMap.keys()].sort();
  const maxAbsPnl  = Math.max(...data.map((m) => Math.abs(m.pnl)), 1);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Header row */}
        <div className="mb-1.5 grid grid-cols-[48px_repeat(12,1fr)] gap-[3px]">
          <div />
          {MONTH_NAMES.map((name) => (
            <div key={name} className="text-center text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{name}</div>
          ))}
        </div>

        {/* Year rows */}
        {years.map((year) => (
          <div key={year} className="mb-[3px] grid grid-cols-[48px_repeat(12,1fr)] gap-[3px]">
            <div className="flex items-center text-[10px] font-bold text-slate-500">{year}</div>
            {Array.from({ length: 12 }, (_, mi) => {
              const stat = yearMap.get(year)?.get(mi);
              if (!stat) {
                return <div key={mi} className="h-11 rounded-sm bg-slate-800/20" />;
              }
              const intensity = Math.min(Math.abs(stat.pnl) / maxAbsPnl, 1);
              const alpha     = 0.12 + intensity * 0.78;
              const bg        = stat.pnl >= 0
                ? `rgba(52,211,153,${alpha})`
                : `rgba(244,63,94,${alpha})`;
              const shortPnl  = Math.abs(stat.pnl) >= 1000
                ? `${stat.pnl >= 0 ? "+" : "-"}${(Math.abs(stat.pnl) / 1000).toFixed(1)}k`
                : `${stat.pnl >= 0 ? "+" : ""}${stat.pnl.toFixed(0)}`;
              return (
                <div
                  key={mi}
                  title={`${stat.label} — ${stat.pnl >= 0 ? "+" : ""}$${stat.pnl.toFixed(2)} · ${stat.trades} trades · ${stat.winRate.toFixed(0)}% WR`}
                  style={{ backgroundColor: bg }}
                  className="flex h-11 cursor-default flex-col items-center justify-center gap-0.5 rounded-sm transition-opacity hover:opacity-75"
                >
                  <span className={`font-mono text-[9px] font-bold leading-none ${stat.pnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{shortPnl}</span>
                  <span className="text-[7px] leading-none text-white/50">{stat.winRate.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-[8px] uppercase tracking-wider text-slate-700">P&L scale</span>
          {[
            { label: "Large loss",  bg: "rgba(244,63,94,0.90)"  },
            { label: "Small loss",  bg: "rgba(244,63,94,0.20)"  },
            { label: "No trades",   bg: "rgba(51,65,85,0.20)"   },
            { label: "Small gain",  bg: "rgba(52,211,153,0.20)" },
            { label: "Large gain",  bg: "rgba(52,211,153,0.90)" },
          ].map(({ label, bg }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="h-2.5 w-5 rounded-sm" style={{ background: bg }} />
              <span className="text-[8px] text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Period selector ──────────────────────────────────────────────────────────

const PERIODS = [
  { label: "30D",  days: 30  },
  { label: "90D",  days: 90  },
  { label: "180D", days: 180 },
  { label: "1Y",   days: 365 },
  { label: "All",  days: 730 },
];

// ─── Tab: Overview ────────────────────────────────────────────────────────────

const OverviewTab = memo(function OverviewTab({ report }: { report: Report }) {
  const { summary, equityCurve, monthlyBreakdown } = report;
  const hasData = equityCurve.length > 0;

  const step      = Math.max(1, Math.floor(equityCurve.length / 200));
  const chartData = equityCurve.filter((_, i) => i % step === 0 || i === equityCurve.length - 1);

  const cagrValue = summary.cagr !== 0
    ? `${pnlSign(summary.cagr)}${number(summary.cagr, 1)}%`
    : "N/A";

  return (
    <div className="space-y-5">
      {/* Core KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatCard label="Total P&L"    value={`${pnlSign(summary.totalPnl)}${money2(summary.totalPnl)}`} color={pnlColor(summary.totalPnl)} />
        <StatCard label="Win Rate"     value={`${number(summary.winRate, 1)}%`} sub={`${summary.totalTrades} trades`} color={summary.winRate >= 50 ? "text-emerald-400" : "text-rose-400"} />
        <StatCard label="Profit Factor" value={number(summary.profitFactor, 2)} color={summary.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400"} />
        <StatCard label="Expectancy"   value={`${pnlSign(summary.expectancy)}${money2(summary.expectancy)}`} color={pnlColor(summary.expectancy)} />
        <StatCard label="Max Drawdown" value={`${number(summary.maxDrawdown, 2)}%`} color={summary.maxDrawdown > 20 ? "text-rose-400" : "text-amber-400"} sub={`$${number(summary.maxDrawdownUsd, 0)} USD`} />
        <StatCard label="Best Trade"   value={`+${money2(summary.bestTrade)}`} color="text-emerald-400" />
        <StatCard label="Worst Trade"  value={money2(summary.worstTrade)} color="text-rose-400" />
        <StatCard label="CAGR"         value={cagrValue} color={summary.cagr >= 0 ? "text-emerald-400" : "text-rose-400"} sub="compound annual" />
      </div>

      {/* Risk-adjusted ratios */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Sharpe Ratio"    value={number(summary.sharpeRatio, 2)}
          color={summary.sharpeRatio >= 1 ? "text-emerald-400" : summary.sharpeRatio >= 0 ? "text-amber-400" : "text-rose-400"}
          sub="252-annualised" />
        <StatCard label="Sortino Ratio"   value={summary.sortinoRatio >= 999 ? "∞" : number(summary.sortinoRatio, 2)}
          color={summary.sortinoRatio >= 1 ? "text-emerald-400" : "text-amber-400"}
          sub="downside deviation" />
        <StatCard label="Calmar Ratio"    value={number(summary.calmarRatio, 2)}
          color={summary.calmarRatio >= 1 ? "text-emerald-400" : "text-amber-400"}
          sub="ann. ret ÷ max DD" />
        <StatCard label="Recovery Factor" value={number(summary.recoveryFactor, 2)}
          color={summary.recoveryFactor >= 1 ? "text-emerald-400" : "text-rose-400"}
          sub="P&L ÷ max DD $" />
        <StatCard label="Annualised Vol." value={money2(summary.annualizedVol)}
          color="text-amber-400"
          sub="daily σ × √252" />
      </div>

      {/* Equity curve */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <SectionTitle>Equity Curve</SectionTitle>
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CYAN} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0.0}  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 0 ? "+" : ""}${v.toFixed(0)}`} width={72} />
              <Tooltip content={<EquityTooltip />} />
              <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="cumPnl"   name="cumPnl"   stroke={CYAN}        fill="url(#eqGrad)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="dailyPnl" name="dailyPnl" stroke="transparent" fill="transparent"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="No closed trades in this period" />
        )}
      </div>

      {/* Drawdown chart */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Drawdown</SectionTitle>
          <div className="flex gap-4 text-[10px]">
            <span className="text-slate-600">Max: <span className="font-mono font-bold text-rose-400">{number(report.summary.maxDrawdown, 2)}%</span></span>
            <span className="text-slate-600">USD: <span className="font-mono font-bold text-rose-400">${number(report.summary.maxDrawdownUsd, 0)}</span></span>
            <span className="text-slate-600">Recovery: <span className={`font-mono font-bold ${report.summary.recoveryFactor >= 1 ? "text-emerald-400" : "text-amber-400"}`}>{number(report.summary.recoveryFactor, 2)}×</span></span>
          </div>
        </div>
        {hasData ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ROSE} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={ROSE} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.abs(v).toFixed(1)}%`} width={50} />
              <Tooltip content={<DrawdownTooltip />} />
              <ReferenceLine y={0} stroke="#334155" />
              <Area type="monotone" dataKey="drawdown" name="drawdown" stroke={ROSE} fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="No data" />
        )}
      </div>

      {/* Monthly return heatmap */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <SectionTitle>Monthly Return Heatmap</SectionTitle>
        <MonthlyHeatmap data={monthlyBreakdown} />
      </div>
    </div>
  );
});

// ─── Tab: Trades ──────────────────────────────────────────────────────────────

const TradesTab = memo(function TradesTab({ report }: { report: Report }) {
  const { trades, symbolBreakdown, pnlDistribution } = report;
  const [sortBy, setSortBy] = useState<"pnl" | "date" | "dur">("date");

  const sorted = [...trades].sort((a, b) => {
    if (sortBy === "pnl")  return b.pnl - a.pnl;
    if (sortBy === "dur")  return b.durationMs - a.durationMs;
    return new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime();
  });

  return (
    <div className="space-y-5">
      {/* PnL distribution histogram */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <SectionTitle>P&L Distribution</SectionTitle>
        {pnlDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={pnlDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as PnlBucket;
                  return (
                    <div className="rounded-lg border border-slate-700/80 bg-[#050a0f] px-3 py-2 text-[11px]">
                      <p className="text-slate-400">{d.label}</p>
                      <p className="font-bold text-white">{d.count} trades</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {pnlDistribution.map((b, i) => (
                  <Cell key={i} fill={b.isPositive ? EMERALD : ROSE} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="No trade data" />
        )}
      </div>

      {/* Symbol breakdown */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <SectionTitle>Symbol Breakdown</SectionTitle>
        {symbolBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {["Symbol","Trades","Win %","P&L","Avg P&L","PF","Avg Win","Avg Loss"].map((h) => (
                    <th key={h} className="py-2 pr-4 text-left font-semibold uppercase tracking-[0.12em] text-slate-600 first:pl-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbolBreakdown.map((s) => (
                  <tr key={s.symbol} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                    <td className="py-2 pr-4 font-mono font-bold text-cyan-400">{s.symbol}</td>
                    <td className="py-2 pr-4 text-slate-300">{s.trades}</td>
                    <td className={`py-2 pr-4 font-mono font-bold ${s.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>{number(s.winRate, 1)}%</td>
                    <td className={`py-2 pr-4 font-mono font-bold ${pnlColor(s.pnl)}`}>{pnlSign(s.pnl)}{money2(s.pnl)}</td>
                    <td className={`py-2 pr-4 font-mono ${pnlColor(s.avgPnl)}`}>{pnlSign(s.avgPnl)}{money2(s.avgPnl)}</td>
                    <td className={`py-2 pr-4 font-mono font-bold ${s.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400"}`}>{number(s.profitFactor, 2)}</td>
                    <td className="py-2 pr-4 font-mono text-emerald-400">+{money2(s.avgWin)}</td>
                    <td className="py-2 pr-4 font-mono text-rose-400">-{money2(s.avgLoss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No symbol data" />
        )}
      </div>

      {/* Trade list */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Trade History (last {trades.length})</SectionTitle>
          <div className="flex gap-1">
            {(["date", "pnl", "dur"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`rounded px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  sortBy === key ? "bg-cyan-500/20 text-cyan-400" : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {key === "date" ? "Date" : key === "pnl" ? "P&L" : "Duration"}
              </button>
            ))}
          </div>
        </div>
        {sorted.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#080f1a]">
                <tr className="border-b border-slate-800/60">
                  {["Symbol","Side","Entry","Exit","P&L","Fees","Duration","Closed"].map((h) => (
                    <th key={h} className="py-2 pr-4 text-left font-semibold uppercase tracking-[0.12em] text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                    <td className="py-1.5 pr-4 font-mono font-bold text-cyan-400">{t.symbol}</td>
                    <td className={`py-1.5 pr-4 font-bold ${t.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>{t.side}</td>
                    <td className="py-1.5 pr-4 font-mono text-slate-300">{toN(t.entryPrice) > 0 ? toN(t.entryPrice).toFixed(5) : "—"}</td>
                    <td className="py-1.5 pr-4 font-mono text-slate-300">{toN(t.exitPrice)  > 0 ? toN(t.exitPrice).toFixed(5)  : "—"}</td>
                    <td className={`py-1.5 pr-4 font-mono font-bold ${pnlColor(t.pnl)}`}>{pnlSign(t.pnl)}{money2(t.pnl)}</td>
                    <td className="py-1.5 pr-4 font-mono text-slate-500">{money2(t.fees)}</td>
                    <td className="py-1.5 pr-4 text-slate-400">{formatDuration(t.durationMs)}</td>
                    <td className="py-1.5 pr-4 text-slate-500">{formatDate(t.closedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No trades in this period" />
        )}
      </div>
    </div>
  );
});

// ─── Tab: Behavior ────────────────────────────────────────────────────────────

const BehaviorTab = memo(function BehaviorTab({ report }: { report: Report }) {
  const { hourlyBreakdown, dowBreakdown, streaks, summary } = report;
  const maxHourTrades = Math.max(...hourlyBreakdown.map((h) => h.trades), 1);

  return (
    <div className="space-y-5">
      {/* Streak counter */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Max Win Streak"  value={String(streaks.maxWinStreak)}  color="text-emerald-400" sub="consecutive wins" />
        <StatCard label="Max Loss Streak" value={String(streaks.maxLossStreak)} color="text-rose-400"    sub="consecutive losses" />
        <StatCard label="Current Streak"  value={String(streaks.currentStreak)}
          color={streaks.currentStreakType === "WIN" ? "text-emerald-400" : streaks.currentStreakType === "LOSS" ? "text-rose-400" : "text-slate-400"}
          sub={streaks.currentStreakType === "WIN" ? "winning" : streaks.currentStreakType === "LOSS" ? "losing" : "no data"} />
        <StatCard label="Recovery Factor" value={number(summary.recoveryFactor, 2)} color={summary.recoveryFactor >= 1 ? "text-emerald-400" : "text-rose-400"} sub="PnL ÷ max drawdown" />
      </div>

      {/* Hourly heatmap (bar chart) */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <SectionTitle>P&L by Hour (UTC)</SectionTitle>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={hourlyBreakdown} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(h) => `${h}h`} />
            <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={56} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as HourStat;
                return (
                  <div className="rounded-lg border border-slate-700/80 bg-[#050a0f] px-3 py-2 text-[11px]">
                    <p className="text-slate-400">{d.hour}:00 UTC</p>
                    <p className={`font-mono font-bold ${pnlColor(d.pnl)}`}>{pnlSign(d.pnl)}{money2(d.pnl)}</p>
                    <p className="text-slate-500">{d.trades} trades · {number(d.winRate, 0)}% WR</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#334155" />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
              {hourlyBreakdown.map((h, i) => (
                <Cell key={i} fill={h.pnl >= 0 ? EMERALD : ROSE} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Activity heatmap (trades by hour) */}
        <div className="mt-4">
          <p className="mb-2 text-[9px] uppercase tracking-[0.18em] text-slate-600">Trade Volume by Hour</p>
          <div className="flex gap-0.5">
            {hourlyBreakdown.map((h) => {
              const intensity = h.trades / maxHourTrades;
              const opacity   = intensity === 0 ? 0.05 : 0.1 + intensity * 0.9;
              return (
                <div
                  key={h.hour}
                  title={`${h.hour}:00 — ${h.trades} trades`}
                  style={{ backgroundColor: `rgba(6,182,212,${opacity})` }}
                  className="h-6 flex-1 rounded-sm transition-opacity hover:opacity-75"
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[8px] text-slate-700">
            <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </div>
      </div>

      {/* Day-of-week */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <SectionTitle>P&L by Day of Week</SectionTitle>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={dowBreakdown.filter((d) => d.trades > 0)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={60} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as DowStat;
                return (
                  <div className="rounded-lg border border-slate-700/80 bg-[#050a0f] px-3 py-2 text-[11px]">
                    <p className="text-slate-400">{d.day}</p>
                    <p className={`font-mono font-bold ${pnlColor(d.pnl)}`}>{pnlSign(d.pnl)}{money2(d.pnl)}</p>
                    <p className="text-slate-500">{d.trades} trades · {number(d.winRate, 0)}% WR</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#334155" />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
              {dowBreakdown.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? EMERALD : ROSE} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hold time analysis */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Avg Hold Time"      value={formatDuration(summary.avgHoldTimeMs)}     sub="all trades" />
        <StatCard label="Avg Hold (Winners)" value={formatDuration(summary.avgHoldTimeWinMs)}  color="text-emerald-400" sub="winning trades" />
        <StatCard label="Avg Hold (Losers)"  value={formatDuration(summary.avgHoldTimeLossMs)} color="text-rose-400"    sub="losing trades" />
      </div>
    </div>
  );
});

// ─── Tab: Risk ────────────────────────────────────────────────────────────────

const RiskTab = memo(function RiskTab({ report }: { report: Report }) {
  const { summary } = report;
  const cagrValue = summary.cagr !== 0
    ? `${pnlSign(summary.cagr)}${number(summary.cagr, 1)}%`
    : "N/A";

  return (
    <div className="space-y-5">
      {/* Risk ratios */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Sharpe Ratio"    value={number(summary.sharpeRatio, 2)}
          color={summary.sharpeRatio >= 1 ? "text-emerald-400" : summary.sharpeRatio >= 0 ? "text-amber-400" : "text-rose-400"}
          sub="252-annualised" />
        <StatCard label="Sortino Ratio"   value={summary.sortinoRatio >= 999 ? "∞" : number(summary.sortinoRatio, 2)}
          color={summary.sortinoRatio >= 1 ? "text-emerald-400" : "text-amber-400"}
          sub="downside deviation" />
        <StatCard label="Calmar Ratio"    value={number(summary.calmarRatio, 2)}
          color={summary.calmarRatio >= 1 ? "text-emerald-400" : "text-amber-400"}
          sub="annualised ÷ drawdown" />
        <StatCard label="Recovery Factor" value={number(summary.recoveryFactor, 2)}
          color={summary.recoveryFactor >= 1 ? "text-emerald-400" : "text-rose-400"}
          sub="P&L ÷ max drawdown $" />
        <StatCard label="CAGR"            value={cagrValue}
          color={summary.cagr >= 0 ? "text-emerald-400" : "text-rose-400"}
          sub="compound annual" />
        <StatCard label="Annualised Ret." value={`${pnlSign(summary.annualizedReturn)}${money2(summary.annualizedReturn)}`}
          color={pnlColor(summary.annualizedReturn)} />
        <StatCard label="Annualised Vol." value={money2(summary.annualizedVol)}
          color="text-amber-400"
          sub="daily σ × √252" />
      </div>

      {/* Drawdown analysis */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <SectionTitle>Drawdown Analysis</SectionTitle>
        <MetricRow label="Max Drawdown (%)"   value={`${number(summary.maxDrawdown, 2)}%`}  color="text-rose-400" />
        <MetricRow label="Max Drawdown (USD)" value={money2(summary.maxDrawdownUsd)}          color="text-rose-400" />
        <MetricRow label="Recovery Factor"    value={number(summary.recoveryFactor, 2)}       color={summary.recoveryFactor >= 1 ? "text-emerald-400" : "text-amber-400"} />
        <MetricRow label="Calmar Ratio"       value={number(summary.calmarRatio, 2)}           color={summary.calmarRatio >= 1 ? "text-emerald-400" : "text-amber-400"} />
      </div>

      {/* Win/Loss analysis */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
          <SectionTitle>Win Analysis</SectionTitle>
          <MetricRow label="Win Rate"      value={`${number(summary.winRate, 2)}%`}   color="text-emerald-400" />
          <MetricRow label="Avg Win"       value={`+${money2(summary.avgWin)}`}        color="text-emerald-400" />
          <MetricRow label="Best Trade"    value={`+${money2(summary.bestTrade)}`}     color="text-emerald-400" />
          <MetricRow label="Profit Factor" value={summary.profitFactor >= 999 ? "∞" : number(summary.profitFactor, 2)} color={summary.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400"} />
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
          <SectionTitle>Loss Analysis</SectionTitle>
          <MetricRow label="Loss Rate"  value={`${number(summary.lossRate, 2)}%`}   color="text-rose-400" />
          <MetricRow label="Avg Loss"   value={`-${money2(summary.avgLoss)}`}        color="text-rose-400" />
          <MetricRow label="Worst Trade" value={money2(summary.worstTrade)}           color="text-rose-400" />
          <MetricRow label="Expectancy" value={`${pnlSign(summary.expectancy)}${money2(summary.expectancy)}`} color={pnlColor(summary.expectancy)} />
        </div>
      </div>

      {/* Fee impact */}
      <div className="rounded-xl border border-slate-800/60 bg-[#080f1a] p-4">
        <SectionTitle>Cost Analysis</SectionTitle>
        <MetricRow label="Total Fees" value={money2(summary.totalFees)}  color="text-amber-400" />
        <MetricRow label="Gross P&L"  value={`${pnlSign(summary.totalPnl + summary.totalFees)}${money2(summary.totalPnl + summary.totalFees)}`} color={pnlColor(summary.totalPnl + summary.totalFees)} />
        <MetricRow label="Net P&L"    value={`${pnlSign(summary.totalPnl)}${money2(summary.totalPnl)}`} color={pnlColor(summary.totalPnl)} />
        <MetricRow label="Fee/Trade"  value={summary.totalTrades > 0 ? money2(summary.totalFees / summary.totalTrades) : "—"} color="text-amber-400" />
      </div>
    </div>
  );
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center">
      <p className="text-[12px] text-slate-600">{text}</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-800/50" />)}
      </div>
      <div className="grid grid-cols-5 gap-3">
        {[1,2,3,4,5].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-800/50" />)}
      </div>
      <div className="h-64 rounded-xl bg-slate-800/50" />
      <div className="h-40 rounded-xl bg-slate-800/50" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",  label: "Overview",  icon: Activity  },
  { id: "trades",    label: "Trades",    icon: BarChart2  },
  { id: "behavior",  label: "Behavior",  icon: Brain      },
  { id: "risk",      label: "Risk",      icon: Zap        },
] as const;

type TabId = typeof TABS[number]["id"];

export default function TradingAnalyticsPage() {
  usePageTitle("Trading Analytics");

  const [tab,        setTab]        = useState<TabId>("overview");
  const [period,     setPeriod]     = useState(90);
  const [useCustom,  setUseCustom]  = useState(false);
  const [customFrom, setCustomFrom] = useState(() => daysAgoStr(90));
  const [customTo,   setCustomTo]   = useState(() => todayStr());

  const queryKey = useCustom
    ? ["trading-analytics-report", "custom", customFrom, customTo]
    : ["trading-analytics-report", period];

  const queryFn = useCustom
    ? () => apiGet<Report>(`/api/v1/analytics/trading/report?from=${customFrom}&to=${customTo}`)
    : () => apiGet<Report>(`/api/v1/analytics/trading/report?days=${period}`);

  const { data: report, isLoading, isError } = useQuery<Report>({
    queryKey,
    queryFn,
    staleTime: 120_000,
    retry:     1,
    enabled:   !useCustom || customFrom <= customTo,
  });

  const dateRangeLabel = useCustom
    ? `${customFrom} → ${customTo}`
    : `${report?.period.days ?? period}d window`;

  return (
    <div className="min-h-screen bg-[#050a0f] px-4 py-6 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white">Trading Analytics</h1>
          <p className="text-[11px] text-slate-500">
            {report ? `${report.summary.totalTrades} closed trades · ${dateRangeLabel}` : "Performance breakdown from closed trades"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period tabs */}
          <div className="flex overflow-hidden rounded-lg border border-slate-700/70 bg-[#080f1a]">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => { setPeriod(p.days); setUseCustom(false); }}
                className={`border-r border-slate-700/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors last:border-r-0 ${
                  !useCustom && period === p.days ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                useCustom ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom date inputs */}
          {useCustom && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded border border-slate-700/60 bg-[#080f1a] px-2 py-1 text-[11px] text-slate-300 [color-scheme:dark]"
              />
              <span className="text-[10px] text-slate-600">→</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={todayStr()}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded border border-slate-700/60 bg-[#080f1a] px-2 py-1 text-[11px] text-slate-300 [color-scheme:dark]"
              />
            </div>
          )}

          {/* Export buttons */}
          {report && (
            <div className="flex gap-1.5">
              <button
                onClick={() => exportCSV(report)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-[#080f1a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
              >
                <FileText className="h-3 w-3" />
                CSV
              </button>
              <button
                onClick={() => exportPDFDownload(report, dateRangeLabel)}
                title="Download PDF — opens print dialog, save as PDF"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-[#080f1a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
              >
                <Download className="h-3 w-3" />
                PDF
              </button>
              <button
                onClick={() => exportPDFOpen(report, dateRangeLabel)}
                title="Open report in a new tab for review"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-[#080f1a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary strip (always visible) ── */}
      {report && (
        <div className="mb-5 flex flex-wrap gap-5 rounded-xl border border-slate-800/60 bg-[#080f1a] px-5 py-3">
          {[
            { label: "Net P&L",       value: `${pnlSign(report.summary.totalPnl)}${money2(report.summary.totalPnl)}`,                             color: pnlColor(report.summary.totalPnl) },
            { label: "Win Rate",      value: `${number(report.summary.winRate, 1)}%`,                                                              color: report.summary.winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
            { label: "Profit Factor", value: number(report.summary.profitFactor, 2),                                                               color: report.summary.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400" },
            { label: "Max Drawdown",  value: `${number(report.summary.maxDrawdown, 2)}%`,                                                          color: "text-rose-400" },
            { label: "Sharpe",        value: number(report.summary.sharpeRatio, 2),                                                                color: report.summary.sharpeRatio >= 1 ? "text-emerald-400" : "text-amber-400" },
            { label: "Sortino",       value: report.summary.sortinoRatio >= 999 ? "∞" : number(report.summary.sortinoRatio, 2),                    color: report.summary.sortinoRatio >= 1 ? "text-emerald-400" : "text-amber-400" },
            { label: "Calmar",        value: number(report.summary.calmarRatio, 2),                                                                color: report.summary.calmarRatio >= 1 ? "text-emerald-400" : "text-amber-400" },
            { label: "CAGR",          value: report.summary.cagr !== 0 ? `${pnlSign(report.summary.cagr)}${number(report.summary.cagr, 1)}%` : "N/A", color: report.summary.cagr >= 0 ? "text-emerald-400" : "text-rose-400" },
            { label: "Trades",        value: String(report.summary.totalTrades),                                                                   color: "text-white" },
          ].map((kpi) => (
            <div key={kpi.label} className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">{kpi.label}</span>
              <span className={`font-mono text-sm font-bold tabular-nums ${kpi.color}`}>{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="mb-5 flex gap-1 border-b border-slate-800/60">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
              tab === id
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-600 hover:text-slate-400"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading && <Skeleton />}
      {isError && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-rose-800/40 bg-rose-950/20">
          <p className="text-[12px] text-rose-400">Failed to load analytics. Make sure the backend is running.</p>
        </div>
      )}
      {report && !isLoading && (
        <>
          {tab === "overview"  && <OverviewTab  report={report} />}
          {tab === "trades"    && <TradesTab    report={report} />}
          {tab === "behavior"  && <BehaviorTab  report={report} />}
          {tab === "risk"      && <RiskTab      report={report} />}
        </>
      )}
    </div>
  );
}
