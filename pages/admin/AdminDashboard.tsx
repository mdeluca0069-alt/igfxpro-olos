/**
 * AdminDashboard — Overview KPIs, recent activity feed, quick links
 */
import { useQuery } from "@tanstack/react-query";
import {
  Activity, BarChart2, ChevronRight, CircleDollarSign,
  RefreshCw, Shield, TrendingUp, Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiGet } from "../../shared/lib/apiHelpers";
import { money, number, dateShort } from "../../shared/utils/format";

type Quote = {
  symbol: string; bid: number; ask: number; mid: number; spread: number; changePct?: number;
};

type Position = {
  id: string; symbol: string; direction: "BUY" | "SELL";
  volume: number; openPrice: number; currentPrice: number;
  unrealizedPnl: number; marginUsed: number; openedAt: string;
};

type AuditEntry = {
  id: string; actor: string; action: string;
  entity: string;
  createdAt?: string;
  timestamp?: string;
};

function auditToActivity(entry: AuditEntry) {
  const type =
    entry.action.includes("deposit") || entry.action.includes("capital") ? "DEPOSIT" :
    entry.action.includes("document") || entry.action.includes("kyc")    ? "KYC"     :
    entry.action.includes("margin")  || entry.action.includes("risk") || entry.action.includes("kill") ? "ALERT" :
    "TRADE";
  const time = entry.createdAt ?? entry.timestamp ?? new Date().toISOString();
  return { id: entry.id, type, message: `[${entry.actor}] ${entry.action} on ${entry.entity}`, time };
}

const TYPE_CLS: Record<string, string> = {
  TRADE:   "bg-cyan-400/10 text-cyan-400",
  DEPOSIT: "bg-emerald-400/10 text-emerald-400",
  KYC:     "bg-amber-400/10 text-amber-400",
  ALERT:   "bg-rose-400/10 text-rose-400",
};

const QUICK_LINKS = [
  { label: "KYC Review",          href: "/admin/kyc",           icon: Shield },
  { label: "Liquidity Monitor",   href: "/admin/liquidity",     icon: BarChart2 },
  { label: "Margin Risk Board",   href: "/admin/margin-risk",   icon: TrendingUp },
  { label: "System Logs",         href: "/admin/logs",          icon: Activity },
];

export function AdminDashboard() {
  const quotesQ = useQuery<Quote[]>({
    queryKey: ["admin", "dashboard", "quotes"],
    queryFn: () => apiGet("/api/v1/trading/quotes", "admin"),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  const positionsQ = useQuery<Position[]>({
    queryKey: ["admin", "dashboard", "positions"],
    queryFn: () => apiGet("/api/v1/trading/positions", "admin"),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const auditQ = useQuery<AuditEntry[]>({
    queryKey: ["admin", "audit-feed"],
    queryFn: () => apiGet("/api/v1/admin/system-logs?limit=20", "admin"),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const overviewQ = useQuery<{ realRegisteredUsers: number; orders: number; kycQueue: number }>({
    queryKey: ["admin", "overview"],
    queryFn: () => apiGet("/api/v1/admin/overview", "admin"),
    staleTime: 30_000,
  });

  const quotes    = quotesQ.data    ?? [];
  const positions = positionsQ.data ?? [];
  const audit     = auditQ.data ?? [];

  const totalPnl   = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const avgSpread  = quotes.length > 0 ? quotes.reduce((s, q) => s + q.spread, 0) / quotes.length : 0;
  const openCount  = positions.length;
  const totalUsers = overviewQ.data?.realRegisteredUsers ?? 0;
  const activity   = audit.map(auditToActivity);

  const kpis = [
    { label: "Total Users",      value: number(totalUsers, 0), sub: "registered accounts", icon: Users,              cls: "text-white" },
    { label: "Open Positions",   value: number(openCount, 0),  sub: "across all clients", icon: BarChart2,     cls: "text-cyan-400" },
    { label: "Daily P&L",        value: money(totalPnl),       sub: "unrealized",    icon: TrendingUp,        cls: totalPnl >= 0 ? "text-emerald-400" : "text-rose-400" },
    { label: "Avg Spread",       value: number(avgSpread, 5),  sub: `${quotes.length} instruments`, icon: CircleDollarSign, cls: "text-amber-400" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
            <h1 className="text-xl font-extrabold text-white">Dashboard Overview</h1>
          </div>
          <button
            onClick={() => { void quotesQ.refetch(); void positionsQ.refetch(); void auditQ.refetch(); void overviewQ.refetch(); }}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-[12px] text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 p-6">
        {/* KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(({ label, value, sub, icon: Icon, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <Icon size={15} className={cls} />
              </div>
              <p className={`mt-2 text-2xl font-extrabold ${cls}`}>{value}</p>
              <p className="mt-1 text-[11px] text-slate-600">{sub}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-bold text-white">Recent Activity</h2>
            <ul className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_CLS[item.type]}`}>
                    {item.type}
                  </span>
                  <div className="flex-1">
                    <p className="text-[12px] text-slate-300">{item.message}</p>
                    <p className="text-[10px] text-slate-600">{dateShort(item.time)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links + Top Quotes */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-3 text-sm font-bold text-white">Quick Links</h2>
              <ul className="space-y-1">
                {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                  <li key={label}>
                    <Link
                      to={href}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    >
                      <Icon size={12} className="text-cyan-400" />
                      {label}
                      <ChevronRight size={10} className="ml-auto" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-3 text-sm font-bold text-white">Live Quotes</h2>
              {quotes.length === 0 ? (
                <p className="text-[12px] text-slate-600">No quotes available</p>
              ) : (
                <ul className="space-y-2">
                  {quotes.slice(0, 5).map((q) => (
                    <li key={q.symbol} className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-white">{q.symbol}</span>
                      <span className="font-mono text-slate-400">{number(q.mid, 5)}</span>
                      <span className={`font-semibold ${(q.changePct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {(q.changePct ?? 0) >= 0 ? "+" : ""}{(q.changePct ?? 0).toFixed(2)}%
                      </span>
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

export default AdminDashboard;
