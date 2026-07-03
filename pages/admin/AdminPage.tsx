/**
 * IGFXPRO — Broker Control Center (BCC)
 * Complete admin panel: CRM, Cash, Documents, Liquidity, Trading,
 * Risk Policy, OLOS Governance, System Health.
 * All actions connected to live backend endpoints.
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, BadgeCheck, BarChart2, Bot,
  CheckCircle2, ChevronRight, CircleDollarSign,
  Cpu, FileCheck2, Globe, LogOut,
  Radio, RefreshCw, Shield, ShieldAlert, ShieldCheck,
  Sparkles, TrendingDown, TrendingUp, Users,
  Wallet, XCircle,
} from "lucide-react";
import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog";
import { useOptionalAuth }    from "../../app/AuthGate";
import { clearAuth }          from "../../shared/lib/brokerApi";
import { apiGet, apiPost }    from "../../shared/lib/apiHelpers";
import { money, number, dateShort } from "../../shared/utils/format";
import { useToast }           from "../../components/ui/Toast";
import { usePageTitle }       from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientTier = "STANDARD" | "GOLD" | "VIP" | "PLATINUM" | "ENTERPRISE";

type LedgerEntry = {
  id: string; type: string; amount: number; status: string;
  reference: string; note: string; createdAt: string;
};

type Document = {
  id: string; label: string; status: string; fileName?: string; rejectionReason?: string;
};

type AdminClientAccount = {
  userId: string;
  profile: {
    fullName: string; email: string; tier: ClientTier;
    kycStatus: string; mifidStatus: string; authKeyStatus: string;
  };
  capital: {
    allocated: number; equity: number; marginUsed: number;
    freeMargin: number; unrealizedPnl: number; riskScore: number;
  };
  documents: Document[];
  ledger: LedgerEntry[];
  settings: {
    olosNotifications: boolean; macroAlerts: boolean;
    orderConfirmations: boolean; autopilotSupervision: boolean;
  };
};

type ServiceHealth = {
  service: string; status: string; latencyMs: number | null; region?: string; detail?: string;
};

type RiskPolicy = {
  stopOutLevelPct: number; maxDrawdownPct: number; maxRiskPerTradePct: number;
  negativeBalanceProtection: boolean; eventRiskMode: string;
  killSwitchEnabled: boolean; killSwitchReason?: string;
};

type OlosGovernance = {
  autopilotEnabled: boolean; minConfidence: number; eventLockMinutes: number;
  modelStatus: string; activeModels: string[]; auditMode: string;
};

type Quote = {
  symbol: string; bid: number; ask: number; mid: number; spread: number; changePct?: number;
};

type AdminOverview = {
  users: number; kycQueue: number; orders: number; pendingDeposits?: number;
  pendingWithdrawals?: number; initialVolumeLimit?: number;
};

// ─── Module tabs ──────────────────────────────────────────────────────────────

type ModuleKey = "crm" | "cash" | "documents" | "liquidity" | "trading" | "risk" | "olos" | "health";

const MODULES: Array<{ key: ModuleKey; label: string; icon: React.ElementType; desc: string }> = [
  { key: "crm",       label: "CRM",          icon: Users,        desc: "Client profiles, tiers, capital" },
  { key: "cash",      label: "Cash",         icon: Wallet,       desc: "Deposit & withdrawal approvals" },
  { key: "documents", label: "Documents",    icon: FileCheck2,   desc: "KYC document review queue" },
  { key: "liquidity", label: "Liquidity",    icon: BarChart2,    desc: "Spread, depth, LP controls" },
  { key: "trading",   label: "Trading",      icon: ShieldAlert,  desc: "Kill switch, positions, orders" },
  { key: "risk",      label: "Risk Policy",  icon: Shield,       desc: "ESMA caps, stop-out, drawdown" },
  { key: "olos",      label: "OLOS AI",      icon: Bot,          desc: "Autopilot, confidence, models" },
  { key: "health",    label: "Health",       icon: Activity,     desc: "System services & latency" },
];

const TIER_BADGE: Record<string, string> = {
  STANDARD:   "border-slate-600   bg-slate-800   text-slate-300",
  GOLD:       "border-amber-400/40 bg-amber-400/10  text-amber-300",
  VIP:        "border-violet-400/40 bg-violet-400/10 text-violet-300",
  PLATINUM:   "border-cyan-400/40  bg-cyan-400/10   text-cyan-300",
  ENTERPRISE: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
};

const KYC_CLS: Record<string, string> = {
  APPROVED:       "text-emerald-300 bg-emerald-500/10",
  PENDING_REVIEW: "text-amber-300   bg-amber-500/10",
  MISSING:        "text-slate-500   bg-slate-800",
  REJECTED:       "text-rose-300    bg-rose-500/10",
};

// ─── Shared confirm dialog state ──────────────────────────────────────────────

type ConfirmState = {
  open: boolean; title: string; message: string;
  keyword?: string; variant?: "danger" | "warning";
  onConfirm: () => void;
};

const CLOSED: ConfirmState = { open: false, title: "", message: "", onConfirm: () => {} };

// ─── Helper: status dot ───────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s === "operational" || s === "healthy" || s === "active"
    ? "bg-emerald-400"
    : s === "degraded" || s === "warning"
    ? "bg-amber-400"
    : "bg-rose-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

// ─── ── CRM module ────────────────────────────────────────────────────────────

function CrmModule({
  accounts, loading,
  onAllocate, onWithdraw, onTierChange, onKycApprove,
  allocPending, withdrawPending, tierPending, kycPending,
}: {
  accounts: AdminClientAccount[]; loading: boolean;
  onAllocate: (userId: string, amount: number) => void;
  onWithdraw: (userId: string, amount: number) => void;
  onTierChange: (userId: string, tier: ClientTier) => void;
  onKycApprove: (userId: string) => void;
  allocPending: boolean; withdrawPending: boolean; tierPending: boolean; kycPending: boolean;
}) {
  const [sel,    setSel]    = useState<string>("");
  const [alloc,  setAlloc]  = useState(5000);
  const [wdraw,  setWdraw]  = useState(1000);

  const selected = accounts.find((a) => a.userId === sel) ?? accounts[0];

  return (
    <div className="space-y-5">
      {/* Client table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {["Client", "Tier", "KYC", "Equity", "Risk", "Docs", ""].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              : accounts.map((a) => (
                  <tr key={a.userId}
                    onClick={() => setSel(a.userId)}
                    className={`cursor-pointer border-t border-slate-800/60 transition hover:bg-slate-900/40 ${
                      (selected?.userId === a.userId) ? "bg-cyan-400/5" : ""
                    }`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{a.profile.fullName}</div>
                      <div className="text-[11px] text-slate-500">{a.profile.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.profile.tier}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onTierChange(a.userId, e.target.value as ClientTier)}
                        disabled={tierPending}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-white focus:border-cyan-500 focus:outline-none"
                      >
                        {(["STANDARD","GOLD","VIP","PLATINUM","ENTERPRISE"] as ClientTier[]).map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KYC_CLS[a.profile.kycStatus] ?? KYC_CLS.MISSING}`}>
                        {a.profile.kycStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-white">{money(a.capital.equity)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                          <div className={`h-full rounded-full ${
                            a.capital.riskScore > 70 ? "bg-rose-500" : a.capital.riskScore > 40 ? "bg-amber-500" : "bg-emerald-500"
                          }`} style={{ width: `${a.capital.riskScore}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500">{a.capital.riskScore}/100</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">
                      {a.documents.filter((d) => d.status === "APPROVED").length}/{a.documents.length} ok
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/client/${a.profile.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
                        Details <ChevronRight size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Selected client — capital controls */}
      {selected && (
        <div className="rounded-xl border border-slate-800 bg-[#07111e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Selected client</p>
              <h3 className="mt-0.5 text-base font-bold text-white">{selected.profile.fullName}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${TIER_BADGE[selected.profile.tier] ?? TIER_BADGE.STANDARD}`}>
                {selected.profile.tier}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${KYC_CLS[selected.profile.kycStatus] ?? KYC_CLS.MISSING}`}>
                KYC: {selected.profile.kycStatus}
              </span>
              {selected.profile.kycStatus !== "APPROVED" && (
                <button
                  type="button"
                  disabled={kycPending}
                  onClick={() => onKycApprove(selected.userId)}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50">
                  {kycPending ? "…" : "✓ Approve KYC"}
                </button>
              )}
              <Link to={`/admin/client/${selected.profile.email}`}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 hover:border-slate-500 transition">
                Full profile →
              </Link>
            </div>
          </div>

          {/* Capital summary */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Allocated",   value: money(selected.capital.allocated),   cls: "text-white" },
              { label: "Equity",      value: money(selected.capital.equity),       cls: "text-cyan-300" },
              { label: "Free margin", value: money(selected.capital.freeMargin),   cls: "text-emerald-300" },
              { label: "Unrealized",  value: money(selected.capital.unrealizedPnl), cls: selected.capital.unrealizedPnl >= 0 ? "text-emerald-300" : "text-rose-300" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="rounded-xl bg-slate-900/60 p-3">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
                <p className={`mt-1 font-mono font-bold ${cls}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Capital controls */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <TrendingUp size={10} className="mr-1 inline" />Allocate capital
              </p>
              <div className="flex gap-2">
                <input type="number" min={1} step={500} value={alloc}
                  onChange={(e) => setAlloc(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none" />
                <button
                  onClick={() => onAllocate(selected.userId, alloc)}
                  disabled={allocPending}
                  className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50">
                  {allocPending ? "…" : "Allocate"}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-rose-400">
                <TrendingDown size={10} className="mr-1 inline" />Withdraw capital
              </p>
              <div className="flex gap-2">
                <input type="number" min={1} step={500} value={wdraw}
                  onChange={(e) => setWdraw(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-white focus:border-rose-500 focus:outline-none" />
                <button
                  onClick={() => onWithdraw(selected.userId, wdraw)}
                  disabled={withdrawPending}
                  className="rounded-lg bg-rose-500/20 px-4 py-2 text-sm font-bold text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-50">
                  {withdrawPending ? "…" : "Withdraw"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cash module (deposit/withdrawal queue) ───────────────────────────────────

function CashModule({
  accounts, onReviewLedger, reviewPending,
}: {
  accounts: AdminClientAccount[];
  onReviewLedger: (userId: string, ledgerId: string, status: "APPROVED" | "REJECTED") => void;
  reviewPending: boolean;
}) {
  const pending = useMemo(() => {
    const rows: Array<{ userId: string; fullName: string; email: string } & LedgerEntry> = [];
    for (const acc of accounts) {
      for (const entry of acc.ledger) {
        if (entry.status === "PENDING_ADMIN") {
          rows.push({ userId: acc.userId, fullName: acc.profile.fullName, email: acc.profile.email, ...entry });
        }
      }
    }
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [accounts]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">{pending.length} pending approval{pending.length !== 1 ? "s" : ""}</p>
      </div>
      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#07111e] py-16 text-center">
          <CheckCircle2 size={24} className="mb-3 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-300">All clear — no pending transactions</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["Client", "Type", "Amount", "Reference", "Note", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending.map((row) => (
                <tr key={row.id} className="border-t border-slate-800/60 hover:bg-slate-900/20 transition">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white text-[12px]">{row.fullName}</div>
                    <div className="text-[10px] text-slate-500">{row.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      row.type.includes("DEPOSIT") ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                    }`}>{row.type.replace("_REQUEST", "")}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-white">{money(row.amount)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{row.reference}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-[11px] text-slate-500">{row.note || "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{dateShort(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onReviewLedger(row.userId, row.id, "APPROVED")}
                        disabled={reviewPending}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50">
                        <CheckCircle2 size={10} /> Approve
                      </button>
                      <button
                        onClick={() => onReviewLedger(row.userId, row.id, "REJECTED")}
                        disabled={reviewPending}
                        className="flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50">
                        <XCircle size={10} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Documents module (KYC review queue) ─────────────────────────────────────

function DocumentsModule({
  accounts, onReviewDoc, reviewPending,
}: {
  accounts: AdminClientAccount[];
  onReviewDoc: (userId: string, documentId: string, status: "APPROVED" | "REJECTED") => void;
  reviewPending: boolean;
}) {
  const queue = useMemo(() => {
    const rows: Array<{ userId: string; fullName: string; email: string } & Document> = [];
    for (const acc of accounts) {
      for (const doc of acc.documents) {
        // Show PENDING_REVIEW (uploaded, awaiting decision) and REJECTED (needs re-upload).
        // MISSING docs (no file yet) are not reviewable. APPROVED docs are complete.
        if (doc.status === "PENDING_REVIEW" || doc.status === "REJECTED") {
          rows.push({ userId: acc.userId, fullName: acc.profile.fullName, email: acc.profile.email, ...doc });
        }
      }
    }
    return rows;
  }, [accounts]);

  // Separate count of MISSING documents for awareness (clients haven't uploaded yet).
  const missingCount = useMemo(() => {
    let n = 0;
    for (const acc of accounts) {
      for (const doc of acc.documents) {
        if (doc.status === "MISSING") n++;
      }
    }
    return n;
  }, [accounts]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <p className="text-[11px] text-slate-500">
          {queue.length} document{queue.length !== 1 ? "s" : ""} pending review
        </p>
        {missingCount > 0 && (
          <p className="text-[11px] text-slate-600">
            · {missingCount} missing (client not yet uploaded)
          </p>
        )}
      </div>
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#07111e] py-16 text-center">
          <BadgeCheck size={24} className="mb-3 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-300">
            {missingCount > 0
              ? `No documents to review — ${missingCount} still missing (clients haven't uploaded)`
              : "All documents reviewed"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {queue.map((doc) => (
            <div key={`${doc.userId}-${doc.id}`}
              className="rounded-xl border border-slate-800 bg-[#07111e] p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">{doc.fullName}</p>
                  <p className="mt-0.5 text-sm font-bold text-white">{doc.label}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${KYC_CLS[doc.status] ?? KYC_CLS.MISSING}`}>
                  {doc.status.replace("_", " ")}
                </span>
              </div>
              <p className="mb-3 text-[11px] text-slate-600">{doc.fileName ?? "No file uploaded"}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onReviewDoc(doc.userId, doc.id, "APPROVED")}
                  disabled={reviewPending}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/15 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50">
                  <CheckCircle2 size={10} /> Approve
                </button>
                <button
                  onClick={() => onReviewDoc(doc.userId, doc.id, "REJECTED")}
                  disabled={reviewPending}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-500/15 py-2 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50">
                  <XCircle size={10} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Liquidity module ─────────────────────────────────────────────────────────

function LiquidityModule({
  quotes, onUpdate, pending,
}: {
  quotes: Quote[];
  onUpdate: (symbol: string, enabled: boolean, spreadMarkupBps?: number) => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {["Symbol", "Bid", "Ask", "Spread", "Change", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">
                    No quotes available — start the backend server
                  </td>
                </tr>
              )
              : quotes.map((q) => {
                const up = (q.changePct ?? 0) >= 0;
                return (
                  <tr key={q.symbol} className="border-t border-slate-800/60 hover:bg-slate-900/20 transition">
                    <td className="px-4 py-3 font-bold text-white">{q.symbol}</td>
                    <td className="px-4 py-3 font-mono text-rose-300">{number(q.bid, 5)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-300">{number(q.ask, 5)}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{number(q.spread, 5)}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>
                        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {up ? "+" : ""}{(q.changePct ?? 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="text-[11px] text-emerald-300">Active</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onUpdate(q.symbol, false)}
                          disabled={pending}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-bold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50">
                          Halt
                        </button>
                        <button
                          onClick={() => onUpdate(q.symbol, true, 10)}
                          disabled={pending}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 transition hover:border-slate-600 disabled:opacity-50">
                          +Spread
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Trading module (kill switch) ────────────────────────────────────────────

function TradingModule({
  risk, onKillSwitch, pending,
}: {
  risk: RiskPolicy | undefined;
  onKillSwitch: (enabled: boolean) => void;
  pending: boolean;
}) {
  const killActive = risk?.killSwitchEnabled ?? false;

  return (
    <div className="grid gap-4 md:grid-cols-2">

      {/* Kill switch */}
      <div className={`rounded-2xl border p-6 ${
        killActive
          ? "border-rose-500/40 bg-rose-500/8"
          : "border-slate-800 bg-[#07111e]"
      }`}>
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            killActive ? "bg-rose-500/20" : "bg-slate-800"
          }`}>
            <ShieldAlert size={18} className={killActive ? "text-rose-400" : "text-slate-500"} />
          </div>
          <div>
            <p className="font-bold text-white">Global Kill Switch</p>
            <p className="text-[11px] text-slate-500">Halt all trading immediately</p>
          </div>
          <div className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
            killActive ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/10 text-emerald-300"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${killActive ? "bg-rose-400 animate-pulse" : "bg-emerald-400"}`} />
            {killActive ? "ACTIVE" : "INACTIVE"}
          </div>
        </div>

        {risk?.killSwitchReason && (
          <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[11px] text-rose-300">
            <p className="font-semibold">Reason:</p>
            <p className="mt-0.5">{risk.killSwitchReason}</p>
          </div>
        )}

        <button
          onClick={() => onKillSwitch(!killActive)}
          disabled={pending}
          className={`w-full rounded-xl py-3.5 text-sm font-extrabold tracking-wide transition disabled:opacity-50 ${
            killActive
              ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
              : "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-500/30"
          }`}>
          {pending ? "Processing…" : killActive ? "DISABLE kill switch — Resume trading" : "ENABLE kill switch — Halt ALL trading"}
        </button>

        <p className="mt-2 text-center text-[10px] text-slate-600">
          This action is immediately audited and affects all clients
        </p>
      </div>

      {/* Risk summary */}
      {risk && (
        <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Current risk state</p>
          <div className="space-y-3 text-sm">
            {[
              { label: "Stop-out level",         value: `${risk.stopOutLevelPct}%`,    cls: "text-white" },
              { label: "Max drawdown",            value: `${risk.maxDrawdownPct}%`,     cls: "text-white" },
              { label: "Max risk per trade",      value: `${risk.maxRiskPerTradePct}%`, cls: "text-white" },
              { label: "Neg. balance protection", value: risk.negativeBalanceProtection ? "ACTIVE" : "OFF", cls: risk.negativeBalanceProtection ? "text-emerald-300" : "text-rose-300" },
              { label: "Event risk mode",         value: risk.eventRiskMode.toUpperCase(), cls: risk.eventRiskMode === "normal" ? "text-emerald-300" : "text-amber-300" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-500">{label}</span>
                <span className={`font-bold ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Risk policy module ───────────────────────────────────────────────────────

function RiskModule({
  risk, onUpdate, pending,
}: {
  risk: RiskPolicy | undefined;
  onUpdate: (policy: Partial<RiskPolicy>) => void;
  pending: boolean;
}) {
  const [stopOut,  setStopOut]  = useState(risk?.stopOutLevelPct   ?? 50);
  const [maxDD,    setMaxDD]    = useState(risk?.maxDrawdownPct     ?? 18);
  const [maxRisk,  setMaxRisk]  = useState(risk?.maxRiskPerTradePct ?? 2);
  const [nbp,      setNbp]      = useState(risk?.negativeBalanceProtection ?? true);
  const [evMode,   setEvMode]   = useState(risk?.eventRiskMode ?? "normal");

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-5 rounded-xl border border-slate-800 bg-[#07111e] p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ESMA Risk Parameters</p>

        {[
          { label: "Stop-out level", value: stopOut, set: setStopOut, min: 20, max: 100, unit: "%" },
          { label: "Max drawdown", value: maxDD, set: setMaxDD, min: 5, max: 50, unit: "%" },
          { label: "Max risk per trade", value: maxRisk, set: setMaxRisk, min: 0.5, max: 10, unit: "%" },
        ].map(({ label, value, set, min, max, unit }) => (
          <div key={label}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-400">{label}</span>
              <span className="font-bold text-cyan-300">{value}{unit}</span>
            </div>
            <input type="range" min={min} max={max} step={0.5} value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="w-full accent-cyan-400" />
            <div className="flex justify-between text-[9px] text-slate-700 mt-0.5">
              <span>{min}{unit}</span><span>{max}{unit}</span>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Negative Balance Protection</p>
            <p className="text-[10px] text-slate-600">ESMA mandatory for retail</p>
          </div>
          <button onClick={() => setNbp((p) => !p)}
            className={`relative h-6 w-11 rounded-full transition ${nbp ? "bg-emerald-500" : "bg-slate-700"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${nbp ? "left-5" : "left-0.5"}`} />
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-400">Event Risk Mode</p>
          <div className="flex gap-2">
            {["normal", "blocked"].map((mode) => (
              <button key={mode} onClick={() => setEvMode(mode)}
                className={`flex-1 rounded-xl py-2 text-sm font-bold capitalize transition ${
                  evMode === mode
                    ? mode === "normal" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    : "bg-slate-900 text-slate-500 hover:bg-slate-800"
                }`}>
                {mode}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onUpdate({ stopOutLevelPct: stopOut, maxDrawdownPct: maxDD, maxRiskPerTradePct: maxRisk, negativeBalanceProtection: nbp, eventRiskMode: evMode })}
          disabled={pending}
          className="w-full rounded-xl bg-cyan-400/15 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/25 disabled:opacity-50">
          {pending ? "Saving…" : "Save risk policy"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#07111e] p-5">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Compliance checklist</p>
        <div className="space-y-2.5">
          {[
            { label: "ESMA retail leverage caps", ok: true },
            { label: "Negative balance protection (NBP)", ok: nbp },
            { label: "Stop-out ≥ 50%", ok: stopOut >= 50 },
            { label: "Max drawdown guard active", ok: maxDD > 0 },
            { label: "Pre-trade risk validation", ok: true },
            { label: "Event risk mode configured", ok: true },
            { label: "Full MiFID II audit trail", ok: true },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-900/30 px-3 py-2.5">
              {ok
                ? <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                : <AlertTriangle size={13} className="shrink-0 text-amber-400" />}
              <span className={`text-[12px] ${ok ? "text-slate-300" : "text-amber-300"}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── OLOS governance module ───────────────────────────────────────────────────

function OlosModule({
  onUpdate, pending,
}: {
  onUpdate: (g: Partial<OlosGovernance>) => void;
  pending: boolean;
}) {
  const [autopilot,   setAutopilot]   = useState(true);
  const [minConf,     setMinConf]     = useState(78);
  const [eventLock,   setEventLock]   = useState(30);
  const [modelStatus, setModelStatus] = useState("operational");

  const models = [
    "regime", "confidence", "sentiment", "flow",
    "risk", "scenario", "autopilot", "macro",
    "volume", "momentum", "pattern", "liquidity",
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-5 rounded-xl border border-violet-500/20 bg-gradient-to-b from-violet-950/20 to-[#07111e] p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">OLOS Governance</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">Autopilot</p>
            <p className="text-[11px] text-slate-500">Supervised AI execution</p>
          </div>
          <button onClick={() => setAutopilot((p) => !p)}
            className={`relative h-7 w-12 rounded-full transition ${autopilot ? "bg-violet-500" : "bg-slate-700"}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${autopilot ? "left-6" : "left-1"}`} />
          </button>
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-400">Min confidence gate</span>
            <span className="font-bold text-violet-300">{minConf}%</span>
          </div>
          <input type="range" min={50} max={99} step={1} value={minConf}
            onChange={(e) => setMinConf(Number(e.target.value))}
            className="w-full accent-violet-500" />
          <div className="flex justify-between text-[9px] text-slate-700 mt-0.5">
            <span>50% permissive</span><span>99% strict</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-400">Event lock window</span>
            <span className="font-bold text-slate-300">{eventLock} min</span>
          </div>
          <input type="range" min={0} max={120} step={5} value={eventLock}
            onChange={(e) => setEventLock(Number(e.target.value))}
            className="w-full accent-violet-500" />
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-400">Model status</p>
          <div className="flex gap-2">
            {["operational", "degraded"].map((s) => (
              <button key={s} onClick={() => setModelStatus(s)}
                className={`flex-1 rounded-xl py-2 text-sm font-bold capitalize transition ${
                  modelStatus === s
                    ? s === "operational" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    : "bg-slate-900 text-slate-500 hover:bg-slate-800"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onUpdate({ autopilotEnabled: autopilot, minConfidence: minConf / 100, eventLockMinutes: eventLock, modelStatus })}
          disabled={pending}
          className="w-full rounded-xl bg-violet-500/15 py-3 text-sm font-bold text-violet-300 transition hover:bg-violet-500/25 disabled:opacity-50">
          {pending ? "Saving…" : "Save OLOS governance"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#07111e] p-5">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">12 AI engine models</p>
        <div className="grid grid-cols-2 gap-1.5">
          {models.map((m) => (
            <div key={m} className="flex items-center gap-2 rounded-xl bg-slate-900/50 px-3 py-2">
              <span className={`h-1.5 w-1.5 rounded-full ${modelStatus === "operational" ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="text-[11px] capitalize text-slate-400">{m}</span>
              <Cpu size={9} className="ml-auto text-slate-700" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[11px]">
          <Radio size={11} className="text-violet-400" />
          <span className="text-slate-500">All engines reporting — confidence gate: <span className="font-bold text-violet-300">{minConf}%</span></span>
        </div>
      </div>
    </div>
  );
}

// ─── System health module ─────────────────────────────────────────────────────

function HealthModule({ services, loading }: { services: ServiceHealth[]; loading: boolean }) {
  return (
    <div className="space-y-3">
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#07111e] py-16">
          <Activity size={24} className="mb-3 text-slate-600" />
          <p className="text-sm text-slate-600">No health data available</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => {
            const ms = svc.latencyMs;
            const latCls = ms == null ? "text-slate-500" : ms < 50 ? "text-emerald-300" : ms < 200 ? "text-amber-300" : "text-rose-300";
            return (
              <div key={svc.service} className="rounded-xl border border-slate-800 bg-[#07111e] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={svc.status} />
                    <p className="font-semibold capitalize text-white">
                      {svc.service.replace(/-/g, " ")}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${
                    svc.status.toLowerCase() === "operational" ? "text-emerald-400"
                    : svc.status.toLowerCase() === "degraded" ? "text-amber-400" : "text-rose-400"
                  }`}>{svc.status}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span className={`font-mono font-bold ${latCls}`}>{ms != null ? `${ms}ms` : "—"}</span>
                  <span className="flex items-center gap-1">
                    <Globe size={9} /> {svc.region ?? "eu-west"}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full ${
                    ms == null ? "bg-slate-600" : ms < 50 ? "bg-emerald-500" : ms < 200 ? "bg-amber-500" : "bg-rose-500"
                  }`} style={{ width: `${ms == null ? 0 : Math.min(100, (ms / 500) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────

export default function AdminPage() {
  usePageTitle("Broker Control Center");

  const auth  = useOptionalAuth();
  const toast = useToast();
  const qc    = useQueryClient();

  const [activeTab, setActiveTab] = useState<ModuleKey>("crm");
  const [confirm,   setConfirm]   = useState<ConfirmState>(CLOSED);

  const refresh = () => qc.invalidateQueries({ queryKey: ["bcc"] });

  // ─── Queries ─────────────────────────────────────────────────────────────

  const overviewQ  = useQuery<AdminOverview>({
    queryKey: ["bcc", "overview"], queryFn: () => apiGet("/api/v1/admin/overview", "admin"),
    staleTime: 15_000, refetchInterval: 30_000,
  });

  const accountsQ  = useQuery<AdminClientAccount[]>({
    queryKey: ["bcc", "accounts"], queryFn: () => apiGet("/api/v1/admin/client-accounts", "admin"),
    staleTime: 10_000,
  });

  const servicesQ  = useQuery<ServiceHealth[]>({
    queryKey: ["bcc", "health"], queryFn: () => apiGet("/api/v1/admin/service-health", "admin"),
    staleTime: 15_000, refetchInterval: 20_000,
  });

  const riskQ      = useQuery<RiskPolicy>({
    queryKey: ["bcc", "risk"], queryFn: () => apiGet("/api/v1/risk/snapshot", "admin"),
    select: (d: unknown) => d as RiskPolicy,
    staleTime: 10_000, refetchInterval: 15_000,
  });

  const quotesQ    = useQuery<Quote[]>({
    queryKey: ["bcc", "quotes"], queryFn: () => apiGet("/api/v1/trading/quotes", "admin"),
    staleTime: 5_000, refetchInterval: 10_000,
  });

  const accounts = accountsQ.data ?? [];
  const services = servicesQ.data ?? [];
  const quotes   = quotesQ.data   ?? [];
  const risk     = riskQ.data;
  const overview = overviewQ.data;

  // ─── Mutations ────────────────────────────────────────────────────────────

  const allocMut    = useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) =>
      apiPost("/api/v1/admin/capital/allocate", { userId, amount, note: "Manual allocation — BCC admin" }, "admin"),
    onSuccess: () => { setConfirm(CLOSED); toast.success("Capital allocated"); void refresh(); },
    onError:   (e) => { setConfirm(CLOSED); toast.error("Allocation failed", (e as Error).message); },
  });

  const withdrawMut = useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) =>
      apiPost("/api/v1/admin/capital/withdraw", { userId, amount, note: "Capital withdrawal — BCC admin" }, "admin"),
    onSuccess: () => { setConfirm(CLOSED); toast.success("Capital withdrawn"); void refresh(); },
    onError:   (e) => { setConfirm(CLOSED); toast.error("Withdrawal failed", (e as Error).message); },
  });

  const tierMut     = useMutation({
    mutationFn: ({ userId, tier }: { userId: string; tier: ClientTier }) =>
      apiPost("/api/v1/admin/client/tier", { userId, tier }, "admin"),
    onSuccess: () => { setConfirm(CLOSED); toast.success("Tier updated"); void refresh(); },
    onError:   (e) => { setConfirm(CLOSED); toast.error("Tier update failed", (e as Error).message); },
  });

  const kycMut      = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      apiPost("/api/v1/admin/client/kyc", { userId, kycStatus: "approved" }, "admin"),
    onSuccess: (_, vars) => {
      const acc = accounts.find((a) => a.userId === vars.userId);
      toast.success("KYC approved", `${acc?.profile.fullName ?? vars.userId} can now trade`);
      void refresh();
    },
    onError: (e) => toast.error("KYC approval failed", (e as Error).message),
  });

  const docMut      = useMutation({
    mutationFn: ({ userId, documentId, status }: { userId: string; documentId: string; status: string }) =>
      apiPost("/api/v1/admin/documents/review", { userId, documentId, status }, "admin"),
    onSuccess: () => { toast.success("Document reviewed"); void refresh(); },
    onError:   (e) => toast.error("Review failed", (e as Error).message),
  });

  const ledgerMut   = useMutation({
    mutationFn: ({ userId, ledgerId, status }: { userId: string; ledgerId: string; status: string }) =>
      apiPost("/api/v1/admin/ledger/review", { userId, ledgerId, status }, "admin"),
    onSuccess: () => { toast.success("Transaction processed"); void refresh(); },
    onError:   (e) => toast.error("Process failed", (e as Error).message),
  });

  const liquidityMut = useMutation({
    mutationFn: ({ symbol, enabled, spreadMarkupBps }: { symbol: string; enabled: boolean; spreadMarkupBps?: number }) =>
      apiPost("/api/v1/admin/liquidity/update", { symbol, enabled, spreadMarkupBps }, "admin"),
    onSuccess: () => { toast.success("Liquidity updated"); void refresh(); },
    onError:   (e) => toast.error("Liquidity update failed", (e as Error).message),
  });

  const killMut     = useMutation({
    mutationFn: (enabled: boolean) =>
      apiPost("/api/v1/admin/trading/kill-switch", { enabled, reason: enabled ? "Manual halt — BCC admin" : "Manual resume — BCC admin" }, "admin"),
    onSuccess: (_, enabled) => {
      setConfirm(CLOSED);
      toast[enabled ? "error" : "success"](enabled ? "Kill switch ENABLED — all trading halted" : "Kill switch DISABLED — trading resumed");
      void refresh();
    },
    onError: (e) => { setConfirm(CLOSED); toast.error("Kill switch failed", (e as Error).message); },
  });

  const riskMut     = useMutation({
    mutationFn: (policy: Partial<RiskPolicy>) =>
      apiPost("/api/v1/admin/risk-policy/update", policy, "admin"),
    onSuccess: () => { toast.success("Risk policy saved"); void refresh(); },
    onError:   (e) => toast.error("Policy update failed", (e as Error).message),
  });

  const olosMut     = useMutation({
    mutationFn: (g: Partial<OlosGovernance>) =>
      apiPost("/api/v1/admin/olos/update", g, "admin"),
    onSuccess: () => { toast.success("OLOS governance saved"); void refresh(); },
    onError:   (e) => toast.error("OLOS update failed", (e as Error).message),
  });

  // ─── Confirm-gated actions ────────────────────────────────────────────────

  function handleAllocate(userId: string, amount: number) {
    const acc = accounts.find((a) => a.userId === userId);
    setConfirm({
      open: true, variant: "warning",
      title: `Allocate ${money(amount)}?`,
      message: `This credits ${money(amount)} to ${acc?.profile.fullName ?? userId}. Ensure AML/KYC checks are complete before proceeding.`,
      onConfirm: () => allocMut.mutate({ userId, amount }),
    });
  }

  function handleWithdraw(userId: string, amount: number) {
    const acc = accounts.find((a) => a.userId === userId);
    setConfirm({
      open: true, variant: "danger", keyword: "CONFIRM",
      title: `Withdraw ${money(amount)}?`,
      message: `This debits ${money(amount)} from ${acc?.profile.fullName ?? userId}. This action is audited and irreversible.`,
      onConfirm: () => withdrawMut.mutate({ userId, amount }),
    });
  }

  function handleTierChange(userId: string, tier: ClientTier) {
    const acc = accounts.find((a) => a.userId === userId);
    setConfirm({
      open: true, variant: "warning",
      title: `Change tier to ${tier}?`,
      message: `${acc?.profile.fullName ?? userId} will be moved to ${tier}. Feature access changes immediately.`,
      onConfirm: () => tierMut.mutate({ userId, tier }),
    });
  }

  function handleKillSwitch(enabled: boolean) {
    setConfirm({
      open: true, variant: "danger", keyword: enabled ? "HALT" : undefined,
      title: enabled ? "Enable global kill switch?" : "Disable kill switch?",
      message: enabled
        ? "This HALTS ALL TRADING immediately. All new orders will be rejected. Use only in emergency."
        : "This re-enables trading for all clients. Ensure market conditions are safe.",
      onConfirm: () => killMut.mutate(enabled),
    });
  }

  const anyPending = allocMut.isPending || withdrawMut.isPending || tierMut.isPending
    || kycMut.isPending || docMut.isPending || ledgerMut.isPending || liquidityMut.isPending
    || killMut.isPending || riskMut.isPending || olosMut.isPending;

  // ─── Derived overview stats ───────────────────────────────────────────────

  const totalEquity  = accounts.reduce((s, a) => s + a.capital.equity, 0);
  const pendingCash  = accounts.reduce((s, a) => s + a.ledger.filter((l) => l.status === "PENDING_ADMIN").length, 0);
  const pendingDocs  = accounts.reduce((s, a) => s + a.documents.filter((d) => d.status !== "APPROVED").length, 0);
  const killActive   = risk?.killSwitchEnabled ?? false;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">

      {/* ── Header ── */}
      <header className="border-b border-slate-800/80 bg-[#060a12] px-5 py-4">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-cyan-400">Protected admin</span>
              {killActive && (
                <span className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-400">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-rose-400" /> KILL SWITCH ACTIVE
                </span>
              )}
            </div>
            <h1 className="mt-0.5 text-xl font-extrabold text-white">IGFXPRO Broker Control Center</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">{auth?.user?.email ?? "admin@igfxpro.local"}</span>
            <button
              onClick={() => { clearAuth(); window.location.assign("/admin/login"); }}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-[12px] font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800">
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-5 p-5">

        {/* ── KPI overview row ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {[
            { icon: Users,          label: "Clients",        value: `${overview?.users ?? accounts.length}`,   cls: "text-white"         },
            { icon: CircleDollarSign, label: "Total equity",  value: money(totalEquity),                       cls: "text-cyan-300"       },
            { icon: BadgeCheck,     label: "KYC queue",       value: `${overview?.kycQueue ?? pendingDocs}`,   cls: pendingDocs > 0 ? "text-amber-300" : "text-emerald-300" },
            { icon: Wallet,         label: "Cash pending",    value: `${pendingCash}`,                         cls: pendingCash > 0 ? "text-amber-300" : "text-emerald-300" },
            { icon: ShieldCheck,    label: "NBP",             value: risk?.negativeBalanceProtection ? "Active" : "OFF", cls: risk?.negativeBalanceProtection ? "text-emerald-300" : "text-rose-300" },
            { icon: Activity,       label: "System",          value: servicesQ.isError ? "Error" : `${services.length} svc`, cls: servicesQ.isError ? "text-rose-300" : "text-emerald-300" },
          ].map(({ icon: Icon, label, value, cls }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#07111e] px-4 py-3">
              <Icon size={15} className={cls} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
                <p className={`mt-0.5 text-sm font-extrabold ${cls}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Module tabs ── */}
        <div className="flex flex-wrap gap-1.5">
          {MODULES.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            const hasBadge =
              (key === "cash" && pendingCash > 0) ||
              (key === "documents" && pendingDocs > 0) ||
              (key === "trading" && killActive);
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`group flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12px] font-semibold transition ${
                  active
                    ? "border-cyan-400/40 bg-cyan-400/10 text-white"
                    : "border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}>
                <Icon size={13} className={active ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400"} />
                {label}
                {hasBadge && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    key === "trading" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {key === "trading" ? "!" : key === "cash" ? pendingCash : pendingDocs}
                  </span>
                )}
              </button>
            );
          })}

          <button onClick={() => { void refresh(); }}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-800 px-3 py-2 text-[11px] text-slate-500 transition hover:border-slate-600 hover:text-slate-300">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        {/* ── Active module workspace ── */}
        <div className="min-h-[400px]">

          {activeTab === "crm" && (
            <CrmModule
              accounts={accounts} loading={accountsQ.isLoading}
              onAllocate={handleAllocate} onWithdraw={handleWithdraw} onTierChange={handleTierChange}
              onKycApprove={(userId) => kycMut.mutate({ userId })}
              allocPending={allocMut.isPending} withdrawPending={withdrawMut.isPending}
              tierPending={tierMut.isPending} kycPending={kycMut.isPending}
            />
          )}

          {activeTab === "cash" && (
            <CashModule
              accounts={accounts}
              onReviewLedger={(userId, ledgerId, status) => ledgerMut.mutate({ userId, ledgerId, status })}
              reviewPending={ledgerMut.isPending}
            />
          )}

          {activeTab === "documents" && (
            <DocumentsModule
              accounts={accounts}
              onReviewDoc={(userId, documentId, status) => docMut.mutate({ userId, documentId, status })}
              reviewPending={docMut.isPending}
            />
          )}

          {activeTab === "liquidity" && (
            <LiquidityModule
              quotes={quotes}
              onUpdate={(symbol, enabled, spreadMarkupBps) => liquidityMut.mutate({ symbol, enabled, spreadMarkupBps })}
              pending={liquidityMut.isPending}
            />
          )}

          {activeTab === "trading" && (
            <TradingModule
              risk={risk}
              onKillSwitch={handleKillSwitch}
              pending={killMut.isPending}
            />
          )}

          {activeTab === "risk" && (
            <RiskModule
              risk={risk}
              onUpdate={(policy) => riskMut.mutate(policy)}
              pending={riskMut.isPending}
            />
          )}

          {activeTab === "olos" && (
            <OlosModule
              onUpdate={(g) => olosMut.mutate(g)}
              pending={olosMut.isPending}
            />
          )}

          {activeTab === "health" && (
            <HealthModule services={services} loading={servicesQ.isLoading} />
          )}
        </div>
      </main>

      {/* ── Confirm dialog ── */}
      <AdminConfirmDialog
        {...confirm}
        submitting={anyPending}
        onCancel={() => setConfirm(CLOSED)}
      />
    </div>
  );
}
