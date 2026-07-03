/**
 * Wallet Dashboard — institutional capital management view.
 * Combines live balance, equity curve, deposit/withdrawal chart, and ledger.
 * Data sources: wallet store · /api/v1/wallet/balance · /api/v1/client/account
 */
import { memo, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowDownCircle, ArrowUpCircle, CircleDollarSign,
  History, LockKeyhole, RefreshCw, TrendingDown, TrendingUp,
  Wallet, Zap, BarChart2,
} from "lucide-react";
import { useWalletStore, type WalletBalance } from "../../store/wallet.store";
import { apiGet }             from "../../shared/lib/apiHelpers";
import { money, money2 }      from "../../shared/utils/format";
import { usePageTitle }       from "../../hooks/usePageTitle";
import { BalanceBreakdown }   from "../../components/wallet/BalanceBreakdown";
import { LedgerTable }        from "../../components/wallet/TransactionTable";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountResp = {
  capital: {
    allocated: number; equity: number; marginUsed: number;
    freeMargin: number; unrealizedPnl: number; riskScore: number;
  };
  ledger: LedgerEntry[];
};

type LedgerEntry = {
  id: string; createdAt: string; type: string;
  amount: number; status: string; note: string; reference?: string;
};

type EquityPoint = { date: string; equity: number; dailyPnl: number };

type PortfolioResp = {
  analytics: {
    sharpeRatio: number; sortinoRatio: number; maxDrawdown: number;
    annualizedReturn: number; totalRealizedPnl: number;
  };
  equityCurve: { curve: EquityPoint[] };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDepVsWithdraw(ledger: LedgerEntry[]) {
  const map = new Map<string, { month: string; deposits: number; withdrawals: number }>();
  for (const e of ledger) {
    const month = e.createdAt.slice(0, 7); // YYYY-MM
    if (!map.has(month)) {
      map.set(month, { month, deposits: 0, withdrawals: 0 });
    }
    const rec = map.get(month)!;
    if ((e.type === "DEPOSIT_REQUEST" || e.type === "ADMIN_CAPITAL_ALLOCATION") && e.amount > 0) {
      rec.deposits += e.amount;
    } else if (e.type === "WITHDRAW_REQUEST" && e.amount < 0) {
      rec.withdrawals += Math.abs(e.amount);
    }
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const KpiRow = memo(function KpiRow({ balance, capital }: {
  balance: WalletBalance | null;
  capital: AccountResp["capital"] | undefined;
}) {
  const equity     = balance?.equity     ?? capital?.equity     ?? 0;
  const available  = balance?.available  ?? capital?.allocated  ?? 0;
  const freeMargin = balance?.freeMargin ?? capital?.freeMargin ?? 0;
  const marginUsed = balance?.marginUsed ?? capital?.marginUsed ?? 0;
  const pnl        = balance?.unrealizedPnL ?? capital?.unrealizedPnl ?? 0;
  const pnlPos     = pnl >= 0;
  const currency   = balance?.currency ?? "USD";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#07111e] via-[#060d1a] to-[#05070d] p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/[0.06] blur-3xl" />
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Total Equity · {currency}</p>
            <div className="mt-1.5 flex items-end gap-3">
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-white">{money(equity)}</span>
              <div className={`mb-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${pnlPos ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                {pnlPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {pnlPos ? "+" : ""}{money(pnl)} unrealized
              </div>
            </div>
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <Link to="/wallet/deposit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/25 sm:flex-none">
              <ArrowDownCircle size={14} /> Deposit
            </Link>
            <Link to="/wallet/withdraw"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 sm:flex-none">
              <ArrowUpCircle size={14} /> Withdraw
            </Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800/50 pt-4 sm:grid-cols-4">
          {[
            { label: "Available",   value: money(available),  icon: CircleDollarSign, cls: "text-cyan-300"    },
            { label: "Free margin", value: money(freeMargin), icon: Zap,              cls: "text-emerald-300" },
            { label: "Margin used", value: money(marginUsed), icon: LockKeyhole,      cls: "text-slate-300"   },
            { label: "Open P&L",    value: `${pnlPos?"+":""}${money(pnl)}`, icon: pnlPos?TrendingUp:TrendingDown, cls: pnlPos?"text-emerald-300":"text-rose-300" },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon size={14} className={`shrink-0 ${cls}`} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
                <p className={`mt-0.5 text-sm font-extrabold tabular-nums ${cls}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const EquityTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const equity = payload.find((p) => p.name === "equity")?.value ?? 0;
  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#050a0f] px-3 py-2 text-[11px]">
      <p className="mb-1 text-slate-400">{label}</p>
      <p className="font-mono font-bold text-cyan-300">{money2(equity)}</p>
    </div>
  );
};

const DepVsWithTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#050a0f] px-3 py-2 text-[11px]">
      <p className="mb-1 text-slate-400">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className={`font-mono font-bold ${p.name === "deposits" ? "text-emerald-300" : "text-rose-300"}`}>
          {p.name === "deposits" ? "Deposits: " : "Withdrawals: "}{money2(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WalletDashboard() {
  usePageTitle("Wallet Dashboard");

  const storeBalance = useWalletStore((s) => s.balance);
  const storeLedger  = useWalletStore((s) => s.ledger);
  const [tab, setTab] = useState<"overview" | "history">("overview");

  const balanceQ = useQuery<WalletBalance>({
    queryKey:    ["wallet-balance"],
    queryFn:     () => apiGet("/api/v1/wallet/balance"),
    enabled:     !storeBalance,
    staleTime:   10_000,
    refetchInterval: 30_000,
  });

  const accountQ = useQuery<AccountResp>({
    queryKey:  ["wallet-account"],
    queryFn:   () => apiGet("/api/v1/client/account"),
    staleTime: 15_000,
  });

  const portfolioQ = useQuery<PortfolioResp>({
    queryKey:  ["wallet-portfolio"],
    queryFn:   () => apiGet("/api/v1/portfolio/performance"),
    staleTime: 60_000,
  });

  const balance = storeBalance ?? balanceQ.data ?? null;
  const capital = accountQ.data?.capital;
  const rawLedger = storeLedger.length
    ? (storeLedger as unknown as LedgerEntry[])
    : (accountQ.data?.ledger ?? []);

  const equityCurve  = portfolioQ.data?.equityCurve?.curve ?? [];
  const analytics    = portfolioQ.data?.analytics;
  const depVsWith    = useMemo(() => buildDepVsWithdraw(rawLedger), [rawLedger]);

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Capital Management</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-white">Wallet Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void balanceQ.refetch()}
              disabled={balanceQ.isFetching}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 p-2 text-slate-500 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={13} className={balanceQ.isFetching ? "animate-spin" : ""} />
            </button>
            <Link to="/wallet"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] text-slate-400 transition hover:border-slate-600 hover:text-white">
              <History size={11} /> Transactions
            </Link>
          </div>
        </div>

        {/* Balance hero */}
        <KpiRow balance={balance} capital={capital} />

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 w-fit">
          {(["overview", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "rounded-lg px-4 py-2 text-[12px] font-semibold capitalize transition",
                tab === t ? "bg-white/[0.07] text-white" : "text-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid gap-5 xl:grid-cols-3">

            {/* Left col: charts */}
            <div className="space-y-5 xl:col-span-2">

              {/* Equity curve */}
              <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Equity Curve</p>
                  <div className="flex gap-4 text-[10px]">
                    {analytics && (
                      <>
                        <span className="text-slate-600">Sharpe <span className="font-mono font-bold text-white">{analytics.sharpeRatio.toFixed(2)}</span></span>
                        <span className="text-slate-600">Max DD <span className="font-mono font-bold text-rose-400">{analytics.maxDrawdown.toFixed(1)}%</span></span>
                      </>
                    )}
                  </div>
                </div>
                {equityCurve.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={equityCurve} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="eqGradW" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={64} />
                      <Tooltip content={<EquityTooltip />} />
                      <Area type="monotone" dataKey="equity" name="equity" stroke="#06b6d4" fill="url(#eqGradW)" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-48 items-center justify-center text-[12px] text-slate-600">
                    {portfolioQ.isLoading ? "Loading equity curve…" : "No Data Available"}
                  </div>
                )}
              </div>

              {/* Deposits vs Withdrawals */}
              <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
                <p className="mb-4 text-sm font-bold text-white">Deposits vs Withdrawals (12 months)</p>
                {depVsWith.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={depVsWith} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={60} />
                      <Tooltip content={<DepVsWithTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 10, color: "#64748b" }} />
                      <Bar dataKey="deposits"    name="deposits"    fill="#34d399" opacity={0.8} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="withdrawals" name="withdrawals" fill="#f43f5e" opacity={0.8} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-44 items-center justify-center text-[12px] text-slate-600">
                    {accountQ.isLoading ? "Loading…" : "No Data Available"}
                  </div>
                )}
              </div>
            </div>

            {/* Right col: balance breakdown + performance ratios */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
                <p className="mb-3 text-sm font-bold text-white">Balance Breakdown</p>
                <BalanceBreakdown balance={balance} />
              </div>

              {analytics && (
                <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
                  <p className="mb-3 text-sm font-bold text-white">Performance</p>
                  <div className="space-y-3">
                    {[
                      { label: "Realized P&L",    value: `${analytics.totalRealizedPnl >= 0 ? "+" : ""}${money2(analytics.totalRealizedPnl)}`, cls: analytics.totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400" },
                      { label: "Annualised return",value: `${analytics.annualizedReturn >= 0 ? "+" : ""}${analytics.annualizedReturn.toFixed(1)}%`, cls: analytics.annualizedReturn >= 0 ? "text-emerald-400" : "text-rose-400" },
                      { label: "Sharpe ratio",     value: analytics.sharpeRatio.toFixed(2), cls: analytics.sharpeRatio >= 1 ? "text-emerald-400" : "text-amber-400" },
                      { label: "Sortino ratio",    value: analytics.sortinoRatio.toFixed(2), cls: analytics.sortinoRatio >= 1 ? "text-emerald-400" : "text-amber-400" },
                      { label: "Max drawdown",     value: `${analytics.maxDrawdown.toFixed(2)}%`, cls: analytics.maxDrawdown > 20 ? "text-rose-400" : "text-amber-400" },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="flex items-center justify-between border-b border-slate-800/30 pb-2 last:border-0 last:pb-0">
                        <span className="text-[11px] text-slate-500">{label}</span>
                        <span className={`font-mono text-[12px] font-bold ${cls}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security assurances */}
              <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={14} className="text-cyan-400" />
                  <p className="text-sm font-bold text-white">Fund Protection</p>
                </div>
                <ul className="space-y-2">
                  {[
                    "Segregated client accounts",
                    "Negative balance protection (ESMA)",
                    "Stop-out at 50% margin level",
                    "Full audit trail on all transactions",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[11px] text-slate-500">
                      <BarChart2 size={9} className="mt-0.5 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
            <p className="mb-4 text-sm font-bold text-white">Funding History</p>
            <LedgerTable />
          </div>
        )}
      </main>
    </div>
  );
}
