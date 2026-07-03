/**
 * IGFXPRO — Portfolio
 * Institutional portfolio: positions, analytics, exposure, equity curve, risk ratios.
 */
import { Link }            from "react-router-dom";
import { useQuery }        from "@tanstack/react-query";
import { useShallow }      from "zustand/react/shallow";
import {
  Activity, BarChart2, ChevronRight, CircleDollarSign, GitCompare, LineChart,
  TrendingDown, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTradingStore }  from "../../store/trading.store";
import { useWalletStore }   from "../../store/wallet.store";
import { apiGet }           from "../../shared/lib/apiHelpers";
import { money, number, priceDigits } from "../../shared/utils/format";
import { usePageTitle }     from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type EquityPoint  = { date: string; equity: number; dailyPnl: number };
type AssetClass   = { class: string; notional: number; pct: number; netLong: number };
type SymbolExposure = { symbol: string; notional: number; pct: number; pnl: number; side: string };

type PortfolioAnalytics = {
  sharpeRatio:      number;
  sortinoRatio:     number;
  calmarRatio:      number;
  maxDrawdown:      number;
  maxDrawdownUsd:   number;
  annualizedReturn: number;
  annualizedVol:    number;
  winRate:          number;
  profitFactor:     number;
  expectancy:       number;
  bestDay:          number;
  worstDay:         number;
  totalRealizedPnl: number;
  totalFees:        number;
  dataPoints:       number;
  monthlyBreakdown: { month: string; pnl: number }[];
};

type EquityCurveResponse = {
  curve:       EquityPoint[];
  sharpe:      number;
  sortino:     number;
  maxDrawdown: number;
  dataPoints:  number;
};

type ExposureResponse = {
  byAssetClass:        AssetClass[];
  bySymbol:            SymbolExposure[];
  grossExposure:       number;
  netExposure:         number;
  longShortRatio:      number;
  concentrationRisk:   number;
  openPositionCount:   number;
};

// ─── Primitive components ─────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, cls = "text-white",
}: {
  label: string; value: string; sub?: string; cls?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-[#07111e] px-4 py-3.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</p>
      <p className={`mt-1.5 text-xl font-extrabold tabular-nums ${cls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-600">{sub}</p>}
    </div>
  );
}

function MetricRow({ label, value, cls = "text-white" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`font-mono text-[12px] font-bold ${cls}`}>{value}</span>
    </div>
  );
}

// ─── Portfolio Page ───────────────────────────────────────────────────────────

export default function PortfolioPage() {
  usePageTitle("Portfolio");

  const positions = useTradingStore(useShallow((s) => s.positions));
  const balance   = useWalletStore((s) => s.balance);

  const equity      = balance?.equity ?? 0;
  const totalPnL    = positions.reduce((s, p) => s + (p.pnl ?? 0), 0);
  const totalMargin = positions.reduce((s, p) => s + (p.marginUsed ?? 0), 0);
  const pnlPos      = totalPnL >= 0;

  // DB-backed analytics
  const { data: analytics } = useQuery<PortfolioAnalytics>({
    queryKey: ["portfolio-analytics"],
    queryFn:  () => apiGet("/api/v1/portfolio/analytics?days=365"),
    staleTime: 120_000,
  });

  const { data: curve } = useQuery<EquityCurveResponse>({
    queryKey: ["equity-curve"],
    queryFn:  () => apiGet("/api/v1/portfolio/equity-curve?days=365"),
    staleTime: 120_000,
  });

  const { data: exposure } = useQuery<ExposureResponse>({
    queryKey: ["portfolio-exposure"],
    queryFn:  () => apiGet("/api/v1/portfolio/exposure"),
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1200px] space-y-5 p-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600">IGFXPRO</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-white">Portfolio</h1>
          </div>
          <Link to="/trading"
            className="flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/8 px-4 py-2.5 text-[12px] font-bold text-cyan-300 transition hover:bg-cyan-400/14">
            <LineChart size={13} /> Trading Terminal
          </Link>
        </div>

        {/* Account KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="Open Positions"
            value={`${positions.length}`}
            sub={exposure ? `${exposure.openPositionCount} DB-confirmed` : undefined}
          />
          <KpiCard
            label="Total P&L"
            value={`${pnlPos ? "+" : ""}${money(totalPnL)}`}
            cls={pnlPos ? "text-emerald-300" : "text-rose-300"}
            sub="Unrealized"
          />
          <KpiCard label="Margin Used" value={money(totalMargin)} cls="text-slate-300" sub="Locked" />
          <KpiCard
            label="Exposure / Equity"
            value={equity > 0 ? `${number((totalMargin / equity) * 100, 1)}%` : "—"}
            cls={totalMargin / Math.max(equity, 1) > 0.5 ? "text-amber-300" : "text-slate-300"}
            sub="Utilization"
          />
        </div>

        {/* Performance Ratios */}
        {analytics && analytics.dataPoints > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Sharpe Ratio"
              value={number(analytics.sharpeRatio, 2)}
              cls={analytics.sharpeRatio > 1 ? "text-emerald-300" : analytics.sharpeRatio > 0 ? "text-amber-300" : "text-rose-300"}
              sub="Risk-adjusted return"
            />
            <KpiCard
              label="Sortino Ratio"
              value={number(analytics.sortinoRatio, 2)}
              cls={analytics.sortinoRatio > 1 ? "text-emerald-300" : "text-amber-300"}
              sub="Downside deviation"
            />
            <KpiCard
              label="Max Drawdown"
              value={`-${number(analytics.maxDrawdown, 2)}%`}
              sub={`-${money(analytics.maxDrawdownUsd)} peak-to-trough`}
              cls={analytics.maxDrawdown > 20 ? "text-rose-300" : analytics.maxDrawdown > 10 ? "text-amber-300" : "text-emerald-300"}
            />
            <KpiCard
              label="Ann. Return"
              value={`${analytics.annualizedReturn >= 0 ? "+" : ""}${number(analytics.annualizedReturn, 1)}%`}
              cls={analytics.annualizedReturn > 0 ? "text-emerald-300" : "text-rose-300"}
              sub={`Vol ${number(analytics.annualizedVol, 1)}%`}
            />
          </div>
        )}

        {/* Equity Curve */}
        {curve && curve.curve.length > 1 && (
          <div className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-white">Equity Curve</h2>
              <div className="flex gap-4 text-[10px] text-slate-500">
                <span>Sharpe <span className="font-mono text-slate-300">{number(curve.sharpe, 2)}</span></span>
                <span>Sortino <span className="font-mono text-slate-300">{number(curve.sortino, 2)}</span></span>
                <span>MDD <span className="font-mono text-rose-400">-{number(curve.maxDrawdown, 1)}%</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={curve.curve} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false}
                  interval={Math.max(0, Math.floor(curve.curve.length / 8))} />
                <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={42} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number) => [money(v), "Equity"]}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area type="monotone" dataKey="equity" stroke="#22d3ee" strokeWidth={1.5}
                  fill="url(#eq-grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Two-column: positions table + analytics */}
        <div className="grid gap-4 xl:grid-cols-[1fr_300px]">

          {/* Positions Table */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#07111e]">
            <div className="flex items-center justify-between border-b border-slate-800/50 px-5 py-3.5">
              <h2 className="text-[13px] font-bold text-white">
                Open Positions <span className="ml-2 text-[11px] text-slate-600">{positions.length}</span>
              </h2>
              {totalPnL !== 0 && (
                <span className={`text-[12px] font-bold ${pnlPos ? "text-emerald-300" : "text-rose-300"}`}>
                  {pnlPos ? <TrendingUp size={11} className="mr-1 inline" /> : <TrendingDown size={11} className="mr-1 inline" />}
                  {pnlPos ? "+" : ""}{money(totalPnL)} total
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              {positions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <BarChart2 size={28} className="mb-3 text-slate-700" />
                  <p className="text-sm text-slate-600">No open positions</p>
                  <Link to="/trading" className="mt-3 flex items-center gap-1.5 text-[12px] text-cyan-400 hover:text-cyan-300">
                    <LineChart size={12} /> Open Trading Terminal
                  </Link>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                      {["Symbol", "Side", "Qty", "Entry", "Mark", "P&L", "Margin", "Lev"].map((h) => (
                        <th key={h} className="px-5 pb-3 pt-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => {
                      const pd = priceDigits(pos.symbol);
                      return (
                        <tr key={pos.id} className="border-t border-slate-800/40 transition hover:bg-slate-900/20">
                          <td className="px-5 py-3.5 font-bold text-white">{pos.symbol}</td>
                          <td className="px-5 py-3.5">
                            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                              pos.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                            }`}>{pos.side}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-300">{number(pos.quantity, 0)}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">{number(pos.entryPrice, pd)}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-300">{number(pos.markPrice ?? pos.entryPrice, pd)}</td>
                          <td className={`px-5 py-3.5 font-mono font-bold ${pos.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {pos.pnl >= 0 ? "+" : ""}{money(pos.pnl)}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-500">{money(pos.marginUsed)}</td>
                          <td className="px-5 py-3.5 text-slate-500">{pos.leverage ?? "—"}×</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right column: Analytics + Exposure */}
          <div className="space-y-4">

            {/* Trade Statistics */}
            {analytics && analytics.dataPoints > 0 && (
              <div className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-4">
                <h3 className="mb-3 text-[12px] font-bold text-slate-300">Trade Statistics</h3>
                <MetricRow label="Win Rate"       value={`${number(analytics.winRate, 1)}%`}
                  cls={analytics.winRate > 50 ? "text-emerald-400" : "text-rose-400"} />
                <MetricRow label="Profit Factor"  value={number(analytics.profitFactor, 2)}
                  cls={analytics.profitFactor > 1 ? "text-emerald-400" : "text-rose-400"} />
                <MetricRow label="Expectancy"     value={`${analytics.expectancy >= 0 ? "+" : ""}${money(analytics.expectancy)}`}
                  cls={analytics.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"} />
                <MetricRow label="Best Day"       value={`+${money(analytics.bestDay)}`}   cls="text-emerald-400" />
                <MetricRow label="Worst Day"      value={money(analytics.worstDay)}         cls="text-rose-400"    />
                <MetricRow label="Total Fees"     value={money(analytics.totalFees)}        cls="text-slate-400"   />
                <MetricRow label="Realized PnL"   value={`${analytics.totalRealizedPnl >= 0 ? "+" : ""}${money(analytics.totalRealizedPnl)}`}
                  cls={analytics.totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"} />
                <p className="mt-2 text-[9px] text-slate-700">{analytics.dataPoints} daily snapshots</p>
              </div>
            )}

            {/* Exposure by Asset Class (DB-backed) */}
            {exposure && exposure.byAssetClass.length > 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[12px] font-bold text-slate-300">Asset Exposure</h3>
                  <span className="text-[10px] text-slate-600">
                    L/S {number(exposure.longShortRatio, 1)}:1
                  </span>
                </div>
                <div className="space-y-2.5">
                  {exposure.byAssetClass.map((ac) => (
                    <div key={ac.class}>
                      <div className="mb-1 flex justify-between text-[10px]">
                        <span className="text-slate-400">{ac.class}</span>
                        <span className="font-mono text-slate-400">{number(ac.pct, 1)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-cyan-400/60 transition-all" style={{ width: `${ac.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-slate-800/50 pt-2 space-y-1">
                  <MetricRow label="Gross Exposure"    value={money(exposure.grossExposure)} cls="text-slate-300" />
                  <MetricRow label="Net Exposure"      value={money(exposure.netExposure)}   cls="text-slate-300" />
                  <MetricRow label="Concentration HHI" value={`${number(exposure.concentrationRisk, 1)}%`}
                    cls={exposure.concentrationRisk > 50 ? "text-rose-400" : "text-slate-300"} />
                </div>
              </div>
            ) : (
              /* Fallback: local positions-derived exposure */
              positions.length > 0 && (
                <div className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-4">
                  <h3 className="mb-3 text-[12px] font-bold text-slate-300">Asset Exposure</h3>
                  <p className="text-[10px] text-slate-600">Loading DB-backed exposure…</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Monthly PnL Bar */}
        {analytics && analytics.monthlyBreakdown.length > 0 && (
          <div className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-5">
            <h2 className="mb-4 text-[13px] font-bold text-white">Monthly P&L</h2>
            <div className="flex items-end gap-1 h-20">
              {analytics.monthlyBreakdown.map((m) => {
                const max = Math.max(...analytics.monthlyBreakdown.map((x) => Math.abs(x.pnl)), 1);
                const h   = Math.round((Math.abs(m.pnl) / max) * 100);
                const pos = m.pnl >= 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${m.month}: ${money(m.pnl)}`}>
                    <div
                      className={`w-full rounded-sm transition-all ${pos ? "bg-emerald-500/60" : "bg-rose-500/60"}`}
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[8px] text-slate-700">{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { to: "/trading",                 icon: LineChart,        label: "Trading Terminal",    desc: "Execute new orders"       },
            { to: "/portfolio/comparison",    icon: GitCompare,       label: "Compare vs Benchmark",desc: "S&P, Gold, BTC vs you"   },
            { to: "/risk",                    icon: Activity,         label: "Risk Center",         desc: "VaR & stress testing"     },
            { to: "/wallet",                  icon: CircleDollarSign, label: "Wallet",              desc: "Capital & balance"        },
            { to: "/reports",                 icon: BarChart2,        label: "Reports & Statements",desc: "PDF exports"              },
          ].map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to}
              className="group flex items-center gap-3 rounded-xl border border-slate-800/60 bg-[#07111e] px-4 py-3 transition hover:border-slate-700">
              <Icon size={14} className="text-slate-600 group-hover:text-cyan-400 transition" />
              <div>
                <p className="text-[12px] font-semibold text-white">{label}</p>
                <p className="text-[10px] text-slate-600">{desc}</p>
              </div>
              <ChevronRight size={12} className="ml-auto text-slate-700 group-hover:text-slate-500 transition" />
            </Link>
          ))}
        </div>

      </main>
    </div>
  );
}
