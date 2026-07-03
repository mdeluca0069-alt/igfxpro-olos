/**
 * UserBehaviorAnalytics — Real order + session data from GET /api/v1/admin/behavior.
 * Zero Math.random().
 */
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Users, Clock, TrendingUp, Loader2 } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { number } from "../../shared/utils/format";

type BehaviorResponse = {
  totalUsers:    number;
  openPositions: number;
  ordersToday:   number;
  ordersTotal:   number;
  hourlyActivity: { hour: string; sessions: number }[];
  topSymbols:    { symbol: string; volume: number; pct: number }[];
  generatedAt:   string;
};

export function UserBehaviorAnalytics() {
  const { data, isLoading, error } = useQuery<BehaviorResponse>({
    queryKey:        ["admin", "behavior"],
    queryFn:         () => apiGet<BehaviorResponse>("/api/v1/admin/behavior", "admin"),
    refetchInterval: 30_000,
    staleTime:       25_000,
  });

  const hourlyData = data?.hourlyActivity ?? [];
  const topSymbols = data?.topSymbols ?? [];
  const maxBar     = Math.max(...hourlyData.map((h) => h.sessions), 1);
  const peakHour   = hourlyData.reduce((a, b) => a.sessions > b.sessions ? a : b, { hour: "--", sessions: 0 }).hour;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Users size={18} className="text-cyan-400" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
            <h1 className="text-xl font-extrabold text-white">User Behavior Analytics</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[12px]">Loading real analytics…</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-[12px] text-rose-400">
            Failed to load behavior analytics. Retrying…
          </div>
        )}

        {data && (
          <>
            {/* KPI grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Registered Users",    value: number(data.totalUsers, 0),   icon: Users,      cls: "text-cyan-400"    },
                { label: "Orders Today",         value: number(data.ordersToday, 0),  icon: Clock,      cls: "text-amber-400"   },
                { label: "Peak Trading Hour",    value: peakHour,                     icon: TrendingUp,  cls: "text-emerald-400" },
                { label: "Open Positions",       value: number(data.openPositions, 0), icon: BarChart as unknown as React.ElementType, cls: "text-violet-400" },
              ].map(({ label, value, icon: Icon, cls }) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <Icon size={14} className={cls} />
                  </div>
                  <p className={`mt-2 text-2xl font-extrabold ${cls}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Hourly distribution */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Hourly Order Activity — Today (UTC)
              </h2>
              {hourlyData.every((h) => h.sessions === 0) ? (
                <div className="flex items-center justify-center py-12 text-[12px] text-slate-600">
                  No orders placed today yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hourlyData} barSize={10}>
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10, fill: "#475569" }}
                      axisLine={false}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#475569" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [v, "Orders"]}
                    />
                    <Bar dataKey="sessions" radius={[3, 3, 0, 0]}>
                      {hourlyData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.sessions === maxBar && maxBar > 0 ? "#22d3ee" : "#334155"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top symbols */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Top Symbols by Filled Volume (lots)
              </h2>
              {topSymbols.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-slate-600">
                  No filled orders yet — top symbols will appear as trading activity accumulates
                </div>
              ) : (
                <ul className="space-y-3">
                  {topSymbols.map((s, i) => (
                    <li key={s.symbol} className="flex items-center gap-4">
                      <span className="w-5 text-right text-[11px] font-bold text-slate-600">#{i + 1}</span>
                      <span className="w-16 font-bold text-white">{s.symbol}</span>
                      <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-mono text-[12px] text-cyan-400">
                        {number(s.volume, 0)} lots
                      </span>
                      <span className="w-10 text-right text-[11px] text-slate-500">{s.pct}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Execution summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Orders Total",   value: number(data.ordersTotal, 0), sub: "All time (this session)", cls: "text-cyan-400"    },
                { label: "Orders Today",   value: number(data.ordersToday, 0), sub: "Since midnight UTC",      cls: "text-amber-400"   },
                { label: "Open Positions", value: number(data.openPositions, 0), sub: "Currently active",      cls: "text-violet-400"  },
              ].map(({ label, value, sub, cls }) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className={`mt-2 text-2xl font-extrabold ${cls}`}>{value}</p>
                  <p className="mt-1 text-[11px] text-slate-600">{sub}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default UserBehaviorAnalytics;
