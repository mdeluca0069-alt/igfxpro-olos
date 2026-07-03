/**
 * IGFXPRO — Wallet Dashboard
 * Complete capital management: live balance, P&L, ledger history,
 * deposit/withdraw quick actions, transaction filtering.
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownCircle, ArrowUpCircle, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock, Filter, History, LockKeyhole,
  RefreshCw, TrendingDown, TrendingUp, Wallet, Zap,
} from "lucide-react";
import { useWalletStore, type WalletBalance } from "../../store/wallet.store";
import { apiGet }        from "../../shared/lib/apiHelpers";
import { money, dateShort } from "../../shared/utils/format";
import { usePageTitle }  from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type LedgerEntry = {
  id: string; createdAt: string; type: string;
  amount: number; status: string; note: string; reference?: string;
};

type AccountResp = {
  capital: { allocated: number; equity: number; marginUsed: number; freeMargin: number; unrealizedPnl: number; riskScore: number };
  ledger: LedgerEntry[];
};

// ─── Ledger type label ────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT_REQUEST:          "Deposit",
  WITHDRAW_REQUEST:         "Withdrawal",
  ADMIN_CAPITAL_ALLOCATION: "Capital allocation",
  MARGIN_RESERVED:          "Margin reserved",
  MARGIN_RELEASED:          "Margin released",
  PNL_CREDIT:               "P&L credit",
  PNL_DEBIT:                "P&L debit",
  FEE:                      "Commission",
  DOCUMENT_EVENT:           "Document event",
};

const STATUS_CLS: Record<string, string> = {
  APPROVED:      "bg-emerald-500/15 text-emerald-300",
  PENDING_ADMIN: "bg-amber-500/15   text-amber-300",
  REJECTED:      "bg-rose-500/15    text-rose-300",
  COMPLETED:     "bg-cyan-500/15    text-cyan-300",
};

// ─── Balance hero ─────────────────────────────────────────────────────────────

function BalanceHero({ balance, capital }: {
  balance: WalletBalance | null;
  capital: AccountResp["capital"] | undefined;
}) {
  const equity    = balance?.equity     ?? capital?.equity     ?? 0;
  const available = balance?.available  ?? capital?.allocated  ?? 0;
  const freeMargin = balance?.freeMargin ?? capital?.freeMargin ?? 0;
  const marginUsed = balance?.marginUsed ?? capital?.marginUsed ?? 0;
  const pnl        = balance?.unrealizedPnL ?? capital?.unrealizedPnl ?? 0;
  const pnlPos     = pnl >= 0;
  const currency   = balance?.currency ?? "USD";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#07111e] via-[#060d1a] to-[#05070d] p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/8 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Main equity */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Total Equity · {currency}</p>
            <div className="mt-1.5 flex items-end gap-3">
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-white">{money(equity)}</span>
              <div className={`mb-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                pnlPos ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
              }`}>
                {pnlPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {pnlPos ? "+" : ""}{money(pnl)} unrealized
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Mark-to-market · updated in real-time</p>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 sm:flex-shrink-0">
            <Link to="/dashboard/deposit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/25 border border-emerald-500/20 sm:flex-none sm:justify-start">
              <ArrowDownCircle size={14} /> Deposit
            </Link>
            <Link to="/dashboard/withdraw"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 sm:flex-none sm:justify-start">
              <ArrowUpCircle size={14} /> Withdraw
            </Link>
          </div>
        </div>

        {/* 4-metric bar */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800/50 pt-4 sm:grid-cols-4">
          {[
            { label: "Available",   value: money(available),  sub: "Cash balance",            icon: CircleDollarSign, cls: "text-cyan-300"    },
            { label: "Free margin", value: money(freeMargin), sub: "Available for orders",    icon: Zap,              cls: "text-emerald-300" },
            { label: "Margin used", value: money(marginUsed), sub: "Locked in positions",     icon: LockKeyhole,      cls: "text-slate-300"   },
            { label: "Open P&L",    value: `${pnlPos?"+":""}${money(pnl)}`, sub: "Unrealized mark-to-mkt", icon: pnlPos?TrendingUp:TrendingDown, cls: pnlPos?"text-emerald-300":"text-rose-300" },
          ].map(({ label, value, sub, icon: Icon, cls }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon size={14} className={`shrink-0 ${cls}`} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
                <p className={`mt-0.5 text-sm font-extrabold tabular-nums ${cls}`}>{value}</p>
                <p className="text-[9px] text-slate-700">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ledger card (mobile) ─────────────────────────────────────────────────────

function LedgerCard({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.amount > 0;
  const statusCls = STATUS_CLS[entry.status] ?? "bg-slate-800 text-slate-400";
  const label = TYPE_LABEL[entry.type] ?? entry.type.replace(/_/g, " ");
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800/60 bg-[#07111e] px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isCredit ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
        {isCredit
          ? <ArrowDownCircle size={14} className="text-emerald-400" />
          : <ArrowUpCircle size={14} className="text-rose-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-white">{label}</p>
          <p className={`shrink-0 font-mono text-[14px] font-bold tabular-nums ${isCredit ? "text-emerald-300" : "text-rose-300"}`}>
            {isCredit ? "+" : ""}{money(entry.amount)}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusCls}`}>
            {entry.status.replace("_", " ")}
          </span>
          <span className="text-[10px] text-slate-600">
            <Clock size={8} className="mr-1 inline" />{dateShort(entry.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Ledger row (desktop) ─────────────────────────────────────────────────────

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.amount > 0;
  const statusCls = STATUS_CLS[entry.status] ?? "bg-slate-800 text-slate-400";
  const label = TYPE_LABEL[entry.type] ?? entry.type.replace(/_/g, " ");

  return (
    <tr className="border-t border-slate-800/40 transition hover:bg-slate-900/20">
      <td className="py-3.5 pr-4">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            isCredit ? "bg-emerald-500/15" : "bg-rose-500/15"
          }`}>
            {isCredit
              ? <ArrowDownCircle size={12} className="text-emerald-400" />
              : <ArrowUpCircle size={12} className="text-rose-400" />}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-white">{label}</p>
            {entry.reference && (
              <p className="text-[10px] font-mono text-slate-600">{entry.reference}</p>
            )}
          </div>
        </div>
      </td>
      <td className="pr-4">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusCls}`}>
          {entry.status.replace("_", " ")}
        </span>
      </td>
      <td className={`pr-4 font-mono text-sm font-bold tabular-nums ${isCredit ? "text-emerald-300" : "text-rose-300"}`}>
        {isCredit ? "+" : ""}{money(entry.amount)}
      </td>
      <td className="pr-4 max-w-[200px] truncate text-[11px] text-slate-500">{entry.note || "—"}</td>
      <td className="text-[11px] text-slate-600 whitespace-nowrap">
        <Clock size={9} className="mr-1 inline" />
        {dateShort(entry.createdAt)}
      </td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WalletPage() {
  usePageTitle("Wallet");

  const [filter, setFilter] = useState<"all" | "deposits" | "withdrawals" | "pending">("all");

  const storeBalance = useWalletStore((s) => s.balance);
  const storeLedger  = useWalletStore((s) => s.ledger);

  const balanceQ = useQuery<WalletBalance>({
    queryKey:  ["wallet-page"],
    queryFn:   () => apiGet("/api/v1/wallet/balance"),
    enabled:   !storeBalance,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const accountQ = useQuery<AccountResp>({
    queryKey:  ["account-page"],
    queryFn:   () => apiGet("/api/v1/client/account"),
    staleTime: 15_000,
  });

  const balance = storeBalance ?? balanceQ.data ?? null;
  const capital = accountQ.data?.capital;
  const rawLedger: LedgerEntry[] = storeLedger.length
    ? (storeLedger as unknown as LedgerEntry[])
    : (accountQ.data?.ledger ?? []);

  const ledger = useMemo(() => {
    switch (filter) {
      case "deposits":    return rawLedger.filter((e) => e.type === "DEPOSIT_REQUEST" || e.type === "ADMIN_CAPITAL_ALLOCATION");
      case "withdrawals": return rawLedger.filter((e) => e.type === "WITHDRAW_REQUEST");
      case "pending":     return rawLedger.filter((e) => e.status === "PENDING_ADMIN");
      default:            return rawLedger;
    }
  }, [rawLedger, filter]);

  const pendingCount = rawLedger.filter((e) => e.status === "PENDING_ADMIN").length;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">IGFXPRO · Capital management</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-white">Wallet</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard/transactions"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] text-slate-400 transition hover:border-slate-600 hover:text-white">
              <History size={11} /> All transactions
            </Link>
            <Link to="/dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-400/8 px-3 py-2 text-[12px] font-semibold text-cyan-300 transition hover:bg-cyan-400/14">
              Dashboard <ChevronRight size={11} />
            </Link>
          </div>
        </div>

        {/* Balance hero */}
        <BalanceHero balance={balance} capital={capital} />

        {/* Quick actions strip */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              href:  "/dashboard/deposit",
              icon:  ArrowDownCircle,
              label: "Deposit funds",
              desc:  "Bank transfer · card · crypto · PayPal",
              cls:   "border-emerald-500/20 bg-emerald-500/6 hover:bg-emerald-500/10",
              iconCls: "text-emerald-400",
            },
            {
              href:  "/dashboard/withdraw",
              icon:  ArrowUpCircle,
              label: "Withdraw funds",
              desc:  "To verified bank account or wallet",
              cls:   "border-slate-700 bg-slate-900/40 hover:bg-slate-900",
              iconCls: "text-slate-400",
            },
            {
              href:  "/dashboard/transactions",
              icon:  History,
              label: "Transaction history",
              desc:  "Full ledger with audit trail",
              cls:   "border-slate-700 bg-slate-900/40 hover:bg-slate-900",
              iconCls: "text-slate-400",
            },
          ].map(({ href, icon: Icon, label, desc, cls, iconCls }) => (
            <Link key={label} to={href}
              className={`group flex items-center gap-4 rounded-2xl border px-5 py-4 transition ${cls}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 transition group-hover:bg-slate-700">
                <Icon size={18} className={iconCls} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white">{label}</p>
                <p className="text-[11px] text-slate-500">{desc}</p>
              </div>
              <ChevronRight size={14} className="ml-auto shrink-0 text-slate-700 transition group-hover:text-slate-500" />
            </Link>
          ))}
        </div>

        {/* Ledger */}
        <div className="rounded-2xl border border-slate-800 bg-[#07111e]">

          {/* Ledger header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Transaction ledger</p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {rawLedger.length} entries
                {pendingCount > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {pendingCount} pending
                  </span>
                )}
              </p>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5">
              <Filter size={11} className="text-slate-600" />
              {(["all", "deposits", "withdrawals", "pending"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                    filter === f
                      ? "bg-cyan-400/15 text-cyan-300"
                      : "text-slate-500 hover:text-slate-300"
                  }`}>
                  {f}
                </button>
              ))}
              <button onClick={() => void balanceQ.refetch()}
                className="ml-1 rounded-lg border border-slate-700 p-1.5 text-slate-500 transition hover:border-slate-600 hover:text-slate-300">
                <RefreshCw size={11} />
              </button>
            </div>
          </div>

          {/* Ledger content */}
          {accountQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-800/50" />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wallet size={28} className="mb-3 text-slate-700" />
              <p className="text-sm text-slate-600">No transactions yet</p>
              <p className="mt-1 text-[11px] text-slate-700">Make a deposit to start trading</p>
              <Link to="/dashboard/deposit"
                className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20">
                <ArrowDownCircle size={14} /> Make a deposit
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile: ledger cards */}
              <div className="space-y-2 p-3 sm:hidden">
                {ledger.slice(0, 30).map((e) => <LedgerCard key={e.id} entry={e} />)}
              </div>
              {/* Desktop: ledger table */}
              <div className="hidden sm:block overflow-x-auto p-2">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                      <th className="px-3 pb-3">Transaction</th>
                      <th className="pr-4 pb-3">Status</th>
                      <th className="pr-4 pb-3">Amount</th>
                      <th className="pr-4 pb-3">Note</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.slice(0, 30).map((e) => (
                      <LedgerRow key={e.id} entry={e} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {ledger.length > 30 && (
            <div className="border-t border-slate-800 px-5 py-3 text-center">
              <Link to="/dashboard/transactions"
                className="text-[12px] font-semibold text-cyan-400 hover:text-cyan-300">
                View all {ledger.length} transactions →
              </Link>
            </div>
          )}
        </div>

        {/* Info panels */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: LockKeyhole,
              title: "Fund segregation",
              desc: "Client funds are held in segregated accounts, separated from operational capital. Double-entry ledger with full reconciliation.",
              cls: "text-cyan-400",
            },
            {
              icon: CheckCircle2,
              title: "ESMA protection",
              desc: "Negative balance protection is active. You cannot lose more than your deposited balance. Stop-out at 50% margin level.",
              cls: "text-emerald-400",
            },
            {
              icon: History,
              title: "Full audit trail",
              desc: "Every deposit, withdrawal, and capital event is cryptographically logged with timestamps. Exportable for tax or regulatory review.",
              cls: "text-violet-400",
            },
          ].map(({ icon: Icon, title, desc, cls }) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800">
                  <Icon size={14} className={cls} />
                </div>
                <p className="text-sm font-bold text-white">{title}</p>
              </div>
              <p className="text-[12px] leading-5 text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
