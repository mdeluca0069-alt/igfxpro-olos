/**
 * RevenueDashboard — real revenue from DB ledger (commission + swap).
 * Replaces Math.random() fake revenue generation.
 */
import { useState }           from "react";
import { useQuery }           from "@tanstack/react-query";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CircleDollarSign, TrendingUp } from "lucide-react";
import { money, number }      from "../../shared/utils/format";
import { apiGet }             from "../../shared/lib/apiHelpers";

type RevenuePeriod = "daily" | "weekly" | "monthly";

type RevenuePoint  = { date: string; commission: number; swap: number; revenue: number };
type TopSymbol     = { symbol: string; revenue: number; pct: number };

type RevenueResponse = {
  ok:         boolean;
  daily:      RevenuePoint[];
  topSymbols: TopSymbol[];
  totals:     { commission: number; swap: number; total: number };
};

export function RevenueDashboard() {
  const [period, setPeriod] = useState<RevenuePeriod>("monthly");

  const { data, isLoading } = useQuery<RevenueResponse>({
    queryKey:  ["admin-revenue"],
    queryFn:   () => apiGet("/api/v1/admin/revenue?days=30"),
    staleTime: 300_000,
  });

  const series     = data?.daily ?? [];
  const topSymbols = data?.topSymbols ?? [];
  const totals     = data?.totals ?? { commission: 0, swap: 0, total: 0 };

  const dailyR   = series[series.length - 1]?.revenue ?? 0;
  const weeklyR  = series.slice(-7).reduce((s, p) => s + p.revenue, 0);
  const monthlyR = totals.total;

  const PERIODS: { key: RevenuePeriod; label: string; value: number }[] = [
    { key: "daily",   label: "Today",   value: dailyR   },
    { key: "weekly",  label: "Week",    value: weeklyR  },
    { key: "monthly", label: "30 Days", value: monthlyR },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <CircleDollarSign size={18} className="text-emerald-400" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
              Admin · DB-Backed
            </p>
            <h1 className="text-xl font-extrabold text-white">Revenue Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">

        {isLoading ? (
          <div className="py-20 text-center text-[11px] text-slate-600">Loading revenue from database…</div>
        ) : (
          <>
            {/* Period KPIs */}
            <div className="grid gap-4 sm:grid-cols-3">
              {PERIODS.map(({ key, label, value }) => (
                <button
                  key={key} type="button"
                  onClick={() => setPeriod(key)}
                  className={`rounded-xl border p-5 text-left transition ${
                    period === key
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-900 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <TrendingUp size={13} className="text-emerald-400" />
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-400">{money(value)}</p>
                </button>
              ))}
            </div>

            {/* Revenue sources */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Commission (30d)</p>
                <p className="mt-2 text-2xl font-extrabold text-cyan-400">{money(totals.commission)}</p>
                <p className="mt-1 text-[11px] text-slate-600">
                  {totals.total > 0 ? number((totals.commission / totals.total) * 100, 1) : 0}% of total
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Swap Income (30d)</p>
                <p className="mt-2 text-2xl font-extrabold text-amber-400">{money(totals.swap)}</p>
                <p className="mt-1 text-[11px] text-slate-600">
                  {totals.total > 0 ? number((totals.swap / totals.total) * 100, 1) : 0}% of total
                </p>
              </div>
            </div>

            {/* Trend chart */}
            {series.length > 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Revenue Trend — Last 30 Days
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [money(v), ""]}
                    />
                    <Area type="monotone" dataKey="commission" stroke="#22d3ee" fill="url(#revGrad)" strokeWidth={2} dot={false} stackId="1" />
                    <Area type="monotone" dataKey="swap"       stroke="#f59e0b" fill="transparent"   strokeWidth={1.5} dot={false} stackId="1" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
                <p className="text-[12px] text-slate-600">No revenue data in the last 30 days.</p>
                <p className="mt-1 text-[11px] text-slate-700">Revenue appears here once trades are settled.</p>
              </div>
            )}

            {/* Top symbols */}
            {topSymbols.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Top Symbols by Commission (30d)
                </h2>
                <ul className="space-y-3">
                  {topSymbols.slice(0, 10).map((s, i) => (
                    <li key={s.symbol} className="flex items-center gap-3">
                      <span className="w-4 text-center text-[11px] font-bold text-slate-600">#{i + 1}</span>
                      <span className="w-16 font-bold text-white">{s.symbol}</span>
                      <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.pct}%` }} />
                      </div>
                      <span className="w-16 text-right font-mono text-[12px] text-emerald-400">{money(s.revenue)}</span>
                      <span className="w-10 text-right text-[11px] text-slate-500">{number(s.pct, 1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default RevenueDashboard;
