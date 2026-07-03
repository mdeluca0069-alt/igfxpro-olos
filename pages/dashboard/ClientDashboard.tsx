/**
 * IGFXPRO — Client Dashboard
 * Institutional information architecture per spec:
 *   S1 Account Overview · S2 Account Status · S3 OLOS System Status
 *   S4 Portfolio Snapshot · S5 Quick Actions
 *
 * No service catalog. No marketing. Only what the client needs immediately.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import {
  AlertTriangle, ArrowUpRight, Bot, CheckCircle2,
  FileCheck2, FileUp, Headphones, LineChart,
  Wallet, XCircle,
} from "lucide-react";
import {
  getClientAccount, saveClientAccount,
  type ClientAccountState, type ClientDocumentStatus,
} from "../../shared/lib/clientAccountStore";
import { brokerRequest, clearAuth } from "../../shared/lib/brokerApi";
import { readStoredPrincipal, writeStoredPrincipal } from "../../shared/lib/principalStorage";
import type { AccountTier } from "../../shared/schemas/auth.principal";
import { useTier }           from "../../app/TierProvider";
import { useWalletStore }    from "../../store/wallet.store";
import { useSignalStore }    from "../../store/signal.store";
import { useRiskStore }      from "../../store/risk.store";
import { useTradingStore }   from "../../store/trading.store";
import { useMarketStore }    from "../../store/market.store";
import { apiGet }            from "../../shared/lib/apiHelpers";
import { money, money2, number } from "../../shared/utils/format";
import { usePageTitle }      from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiWallet = {
  currency: string; available: number; equity: number;
  locked: number; freeMargin: number; unrealizedPnL: number; marginUsed: number;
};

type RiskSnap = {
  riskScore: number; marginLevelPct: number; stopOutLevelPct: number;
  negativeBalanceProtection: boolean; eventRiskMode: string; alerts: string[];
};

type AutopilotConf = {
  enabled: boolean; mode: string; minConfidence: number; modelStatus: string;
  activeModels: string[];
};

type ActiveSignal = {
  id: string; symbol: string; signalType: string; confidence: number;
  timeframe?: string; marketRegime?: string; entryRationale?: string;
  entryPrice?: number; stopLoss?: number; takeProfit?: number;
};

type AIConf = {
  score: number | null;
  breakdown: { trend: number; momentum: number; volume: number; macro: number } | null;
};

type PendingOrders = { count: number };

type Position = {
  id: string; symbol: string; side: string; quantity: number;
  entryPrice: number; markPrice?: number; pnl: number; marginUsed: number;
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, eyebrow, children, action }: {
  title: string; eyebrow?: string; children: React.ReactNode;
  action?: { label: string; to: string };
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#07111e]">
      <div className="flex items-center justify-between border-b border-slate-800/50 px-5 py-3.5">
        <div>
          {eyebrow && (
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{eyebrow}</p>
          )}
          <h2 className="text-[13px] font-bold text-white">{title}</h2>
        </div>
        {action && (
          <Link to={action.to}
            className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 transition hover:text-cyan-300">
            {action.label} <ArrowUpRight size={10} />
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Metric cell ─────────────────────────────────────────────────────────────

function Cell({ label, value, sub, cls = "text-white" }: {
  label: string; value: string; sub?: string; cls?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums leading-none ${cls}`}>{value}</p>
      {sub && <p className="mt-1 text-[10px] text-slate-600">{sub}</p>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function Badge({ label, ok, warn }: { label: string; ok: boolean; warn?: boolean }) {
  const cls = ok
    ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-300"
    : warn
    ? "border-amber-400/25 bg-amber-400/8 text-amber-300"
    : "border-rose-400/25 bg-rose-400/8 text-rose-300";
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${cls}`}>
      <Icon size={12} className="shrink-0" />
      <span className="text-[12px] font-semibold">{label}</span>
    </div>
  );
}

// ─── OLOS state row ───────────────────────────────────────────────────────────

function OlosRow({ label, value, cls = "text-slate-300" }: {
  label: string; value: string; cls?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/30 py-2.5 last:border-0">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`text-[12px] font-bold ${cls}`}>{value}</span>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function ClientDashboard() {
  usePageTitle("Dashboard");

  const { tier } = useTier();
  const [account, setAccount] = useState(() => getClientAccount());

  const storeWallet    = useWalletStore((s) => s.balance);
  const principal      = useMemo(() => readStoredPrincipal(), []);
  const riskWarnings   = useRiskStore((s) => s.unacknowledgedCount);
  const storeRisk      = useRiskStore((s) => s.snapshot);
  const storePositions = useTradingStore(useShallow((s) => s.positions.slice(0, 20)));
  const storeSignal    = useSignalStore((s) => s.activeSignals[0] ?? s.signals[0]);
  const connected      = useMarketStore((s) => s.connected);

  const { data: apiWallet } = useQuery<ApiWallet>({
    queryKey:  ["wallet-dash"],
    queryFn:   () => apiGet("/api/v1/wallet/balance"),
    enabled:   !storeWallet,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: riskData } = useQuery<RiskSnap>({
    queryKey:  ["risk-dash"],
    queryFn:   () => apiGet("/api/v1/risk/snapshot"),
    enabled:   !storeRisk,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: autopilot } = useQuery<AutopilotConf>({
    queryKey:  ["ap-dash"],
    queryFn:   () => apiGet("/api/v1/autopilot/config"),
    staleTime: 30_000,
  });

  // Fetch active signals if store is empty
  const { data: apiSignals = [] } = useQuery<ActiveSignal[]>({
    queryKey:  ["signals-dash"],
    queryFn:   () => apiGet("/api/v1/signals/active"),
    enabled:   !storeSignal,
    staleTime: 12_000,
    refetchInterval: 15_000,
  });

  // Fetch AI confidence for real factor breakdown
  const { data: aiConf } = useQuery<AIConf>({
    queryKey:  ["aiconf-dash"],
    queryFn:   () => apiGet("/api/v1/ai/confidence"),
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: false,
  });

  // Fetch open positions if store is empty
  const { data: apiPositions = [] } = useQuery<Position[]>({
    queryKey:  ["positions-dash"],
    queryFn:   () => apiGet("/api/v1/trading/positions"),
    enabled:   storePositions.length === 0,
    staleTime: 8_000,
    refetchInterval: 10_000,
  });

  // Fetch pending orders count
  const { data: pendingOrdersData } = useQuery<PendingOrders>({
    queryKey:  ["pending-orders-dash"],
    queryFn:   async () => {
      const r: any[] = await apiGet("/api/v1/trading/orders?status=PENDING&limit=1");
      // API may return array or { count } shape
      if (Array.isArray(r)) return { count: r.length };
      return r as PendingOrders;
    },
    staleTime: 15_000,
    refetchInterval: 20_000,
    retry: false,
  });

  const topSignal  = storeSignal ?? (apiSignals.filter(s => s.signalType !== "HOLD")[0] ?? null);
  const positions  = storePositions.length > 0 ? storePositions : (apiPositions as any[]);

  useEffect(() => {
    let cancelled = false;
    brokerRequest<ClientAccountState>("/api/v1/client/account", { method: "GET" }, "client")
      .then((r) => {
        if (cancelled) return;
        setAccount(saveClientAccount(r));
        // Sync tier to principalStorage so TierProvider reflects admin changes
        // without requiring the client to log out and back in.
        const stored = readStoredPrincipal();
        if (stored && stored.tier !== r.profile.tier) {
          writeStoredPrincipal({ ...stored, tier: r.profile.tier as AccountTier });
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const wallet  = storeWallet ?? apiWallet;
  const risk    = (storeRisk ?? riskData) as RiskSnap | undefined;

  const equity      = wallet?.equity      ?? account.capital.equity;
  const pnl         = wallet?.unrealizedPnL ?? account.capital.unrealizedPnl ?? 0;
  const freeMargin  = wallet?.freeMargin  ?? account.capital.freeMargin;
  const marginUsed  = wallet?.marginUsed  ?? account.capital.marginUsed;
  const marginLevel = risk?.marginLevelPct ?? (marginUsed > 0 ? (equity / marginUsed) * 100 : 0);
  const riskScore   = risk?.riskScore ?? account.capital.riskScore;
  const pnlPos      = pnl >= 0;

  const pendingDocs = useMemo(
    () => account.documents.filter((d) => d.status !== "APPROVED"),
    [account.documents],
  );

  const openPositions  = positions.length;
  const todayPnL       = positions.reduce((s, p) => s + (p.pnl ?? 0), 0);
  const exposure       = positions.reduce((s, p) => s + (p.marginUsed ?? 0), 0);

  // OLOS state — no fake fallbacks, show "—" when data isn't loaded
  const modelCount    = autopilot?.activeModels?.length ?? (autopilot ? 0 : null);
  const autopilotOn   = autopilot?.enabled ?? false;
  const modelStatus   = autopilot?.modelStatus ?? "—";
  const regime        = topSignal?.marketRegime ?? (aiConf?.score != null ? (aiConf.score > 0.8 ? "Trending" : aiConf.score > 0.6 ? "Mixed" : "Ranging") : "—");
  const latestInsight = topSignal?.entryRationale ?? null;

  // AI confidence breakdown — real data only
  const confBreakdown = aiConf?.breakdown ?? null;
  const pendingOrders = pendingOrdersData?.count ?? 0;

  const DOC_STATUS: Record<ClientDocumentStatus, string> = {
    MISSING:        "Missing",
    PENDING_REVIEW: "In review",
    APPROVED:       "Approved",
    REJECTED:       "Rejected",
  };

  return (
    <main className="mx-auto max-w-[1100px] space-y-4 p-5">

      {/* ────────────────────────────────────────────────────────────
          SECTION 1 — Account Overview
      ──────────────────────────────────────────────────────────── */}
      <Section title="Account Overview" eyebrow="Live · mark-to-market" action={{ label: "Wallet", to: "/wallet" }}>
        {principal && (
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-white/5 pb-3 text-xs text-slate-400">
            <span>Account <span className="font-mono text-slate-200">{principal.accountNumber ?? "—"}</span></span>
            <span>Login <span className="text-slate-200">{principal.email ?? "—"}</span></span>
            <span>Tier <span className="text-slate-200">{principal.tier}</span></span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <Cell
            label="Total Equity"
            value={money(equity)}
            sub={wallet?.currency ?? "USD"}
            cls="text-white"
          />
          <Cell
            label="Unrealized P&L"
            value={`${pnlPos ? "+" : ""}${money2(pnl)}`}
            sub="Open positions"
            cls={pnlPos ? "text-emerald-300" : "text-rose-300"}
          />
          <Cell
            label="Free Margin"
            value={money(freeMargin)}
            sub="Available"
            cls="text-cyan-300"
          />
          <Cell
            label="Margin Used"
            value={money(marginUsed)}
            sub="In positions"
            cls="text-slate-300"
          />
          <Cell
            label="Margin Level"
            value={marginLevel > 0 ? `${number(marginLevel, 0)}%` : "—"}
            sub={`Stop-out ${risk?.stopOutLevelPct ?? 50}%`}
            cls={
              marginLevel > 0 && marginLevel < (risk?.stopOutLevelPct ?? 50) * 1.5
                ? "text-rose-300"
                : marginLevel < 200
                ? "text-amber-300"
                : "text-emerald-300"
            }
          />
          <Cell
            label="Risk Score"
            value={`${riskScore}/100`}
            sub={riskScore > 70 ? "High risk" : riskScore > 40 ? "Moderate" : "Low risk"}
            cls={riskScore > 70 ? "text-rose-300" : riskScore > 40 ? "text-amber-300" : "text-emerald-300"}
          />
        </div>
      </Section>

      {/* ────────────────────────────────────────────────────────────
          SECTION 2 — Account Status
      ──────────────────────────────────────────────────────────── */}
      <Section title="Account Status" eyebrow="Compliance & access" action={{ label: "Documents", to: "/documents" }}>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Badge
            label={`KYC ${account.profile.kycStatus}`}
            ok={account.profile.kycStatus === "APPROVED"}
            warn={account.profile.kycStatus === "PENDING_REVIEW"}
          />
          <Badge
            label={`Tier: ${tier}`}
            ok={["PLATINUM", "VIP", "ENTERPRISE"].includes(tier)}
            warn={tier === "GOLD"}
          />
          <Badge
            label="Neg. Balance Protection"
            ok={risk?.negativeBalanceProtection ?? true}
          />
          <Badge
            label={pendingDocs.length > 0 ? `${pendingDocs.length} doc${pendingDocs.length > 1 ? "s" : ""} pending` : "Docs complete"}
            ok={pendingDocs.length === 0}
            warn={pendingDocs.length > 0}
          />
        </div>

        {/* Pending docs detail */}
        {pendingDocs.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {pendingDocs.map((doc) => (
              <Link key={doc.id} to="/documents"
                className="flex items-center gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 px-3 py-2.5 transition hover:border-slate-700">
                <FileCheck2 size={12} className={
                  doc.status === "APPROVED" ? "text-emerald-400" :
                  doc.status === "PENDING_REVIEW" ? "text-amber-400" : "text-slate-500"
                } />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-white">{doc.label}</p>
                  <p className={`text-[10px] ${
                    doc.status === "MISSING" ? "text-slate-500" :
                    doc.status === "PENDING_REVIEW" ? "text-amber-400" : "text-slate-500"
                  }`}>{DOC_STATUS[doc.status as ClientDocumentStatus]}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {riskWarnings > 0 && (
          <Link to="/risk"
            className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/6 px-4 py-2.5 transition hover:bg-amber-500/10">
            <AlertTriangle size={13} className="shrink-0 text-amber-400" />
            <span className="text-[12px] text-amber-200">
              <span className="font-bold">{riskWarnings}</span> unacknowledged risk alert{riskWarnings > 1 ? "s" : ""}
            </span>
            <span className="ml-auto text-[11px] text-amber-400">Review →</span>
          </Link>
        )}
      </Section>

      {/* ────────────────────────────────────────────────────────────
          SECTION 3 — OLOS System Status
          OLOS is the operating system of the broker.
      ──────────────────────────────────────────────────────────── */}
      <Section title="OLOS System Status" eyebrow="AI operating system" action={{ label: "OLOS Intelligence", to: "/olos-ai" }}>
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

          {/* Status rows */}
          <div>
            <OlosRow
              label="AI Models active"
              value={modelCount !== null ? `${modelCount} / 12` : "—"}
              cls={modelCount === null ? "text-slate-500" : modelCount >= 10 ? "text-emerald-300" : "text-amber-300"}
            />
            <OlosRow
              label="Autopilot"
              value={autopilot ? (autopilotOn ? `Active · ${autopilot.mode}` : "Paused") : "—"}
              cls={!autopilot ? "text-slate-500" : autopilotOn ? "text-emerald-300" : "text-slate-400"}
            />
            <OlosRow
              label="Model status"
              value={modelStatus === "—" ? "—" : modelStatus.charAt(0).toUpperCase() + modelStatus.slice(1)}
              cls={modelStatus === "—" ? "text-slate-500" : modelStatus === "operational" ? "text-emerald-300" : "text-amber-300"}
            />
            <OlosRow
              label="Market regime"
              value={regime}
              cls={regime === "—" ? "text-slate-500" : "text-cyan-300"}
            />
            <OlosRow
              label="Risk state"
              value={
                riskScore > 70 ? "Elevated — reduce exposure" :
                riskScore > 40 ? "Moderate — monitor" : "Clear"
              }
              cls={riskScore > 70 ? "text-rose-300" : riskScore > 40 ? "text-amber-300" : "text-emerald-300"}
            />
          </div>

          {/* Latest OLOS insight */}
          <div className={`rounded-xl border p-4 ${
            topSignal?.signalType === "BUY"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : topSignal?.signalType === "SELL"
              ? "border-rose-500/20 bg-rose-500/5"
              : "border-slate-800/60 bg-slate-900/30"
          }`}>
            <div className="mb-3 flex items-center gap-2">
              <Bot size={13} className="text-cyan-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Latest OLOS insight
              </span>
              {topSignal && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  topSignal.signalType === "BUY"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}>
                  {topSignal.signalType}
                </span>
              )}
            </div>
            {topSignal ? (
              <>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-base font-extrabold text-white">{topSignal.symbol}</span>
                  <span className={`text-2xl font-extrabold tabular-nums ${
                    topSignal.signalType?.includes("BUY") ? "text-emerald-300" : "text-rose-300"
                  }`}>{number(topSignal.confidence, 0)}<span className="text-sm">%</span></span>
                </div>
                {latestInsight ? (
                  <p className="text-[11px] leading-5 text-slate-400 line-clamp-3">{latestInsight}</p>
                ) : (
                  <p className="text-[11px] leading-5 text-slate-500">
                    {topSignal.signalType?.includes("BUY") ? "Bullish" : "Bearish"} signal on {topSignal.symbol}
                    {topSignal.timeframe ? ` · ${topSignal.timeframe}` : ""} · {topSignal.confidence}% confidence
                  </p>
                )}
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full transition-all ${
                    topSignal.signalType?.includes("BUY") ? "bg-emerald-500" : "bg-rose-500"
                  }`} style={{ width: `${topSignal.confidence}%` }} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400/40" />
                <p className="text-[11px] leading-5 text-slate-600">
                  OLOS scanning markets for high-confidence signals…
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Confidence factor breakdown — only shown with real data */}
        {(topSignal || confBreakdown) && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(["trend", "momentum", "volume", "macro"] as const).map((key) => {
              const labels: Record<string, string> = { trend: "Trend", momentum: "Momentum", volume: "Volume", macro: "Macro" };
              const colors: Record<string, string> = { trend: "bg-cyan-400/60", momentum: "bg-blue-400/60", volume: "bg-emerald-400/60", macro: "bg-amber-400/60" };
              const rawVal = confBreakdown ? confBreakdown[key] : null;
              const v = rawVal !== null ? Math.round(rawVal * 100) : null;
              return (
                <div key={key} className="rounded-xl bg-slate-900/50 px-3 py-2">
                  <div className="mb-1 flex justify-between text-[9px]">
                    <span className="text-slate-600">{labels[key]}</span>
                    {v !== null
                      ? <span className="font-bold text-slate-400">{v}%</span>
                      : <span className="text-slate-700">—</span>}
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full transition-all ${colors[key]}`}
                      style={{ width: v !== null ? `${v}%` : "0%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ────────────────────────────────────────────────────────────
          SECTION 4 — Portfolio Snapshot
      ──────────────────────────────────────────────────────────── */}
      <Section title="Portfolio Snapshot" eyebrow="Positions & exposure" action={{ label: "Portfolio", to: "/portfolio" }}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <Cell
            label="Open Positions"
            value={`${openPositions}`}
            sub="Active trades"
            cls={openPositions > 0 ? "text-white" : "text-slate-500"}
          />
          <Cell
            label="Pending Orders"
            value={pendingOrders > 0 ? `${pendingOrders}` : "0"}
            sub="Awaiting fill"
            cls={pendingOrders > 0 ? "text-amber-300" : "text-slate-500"}
          />
          <Cell
            label="Today's P&L"
            value={openPositions > 0 ? `${todayPnL >= 0 ? "+" : ""}${money2(todayPnL)}` : "—"}
            sub={openPositions > 0 ? "Unrealized" : "No open positions"}
            cls={openPositions === 0 ? "text-slate-500" : todayPnL >= 0 ? "text-emerald-300" : "text-rose-300"}
          />
          <Cell
            label="Asset Exposure"
            value={exposure > 0 ? money(exposure) : "—"}
            sub={exposure > 0 ? "Margin locked" : "No exposure"}
            cls={exposure > 0 ? "text-slate-300" : "text-slate-500"}
          />
        </div>

        {/* Open positions mini-table */}
        {openPositions > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/50 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                  {["Symbol", "Side", "Size", "Entry", "Mark", "P&L"].map((h) => (
                    <th key={h} className="px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.slice(0, 5).map((pos) => (
                  <tr key={pos.id} className="border-t border-slate-800/30 hover:bg-slate-900/20 transition">
                    <td className="px-4 py-2.5 font-bold text-white">{pos.symbol}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        pos.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                      }`}>{pos.side}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{number(pos.quantity, 0)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{number(pos.entryPrice, 5)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{number(pos.markPrice ?? pos.entryPrice, 5)}</td>
                    <td className={`px-4 py-2.5 font-mono font-bold ${pos.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {pos.pnl >= 0 ? "+" : ""}{money2(pos.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {openPositions > 5 && (
              <div className="border-t border-slate-800/40 px-4 py-2 text-center">
                <Link to="/portfolio" className="text-[11px] text-cyan-400 hover:text-cyan-300">
                  View all {openPositions} positions →
                </Link>
              </div>
            )}
          </div>
        )}

        {openPositions === 0 && (
          <div className="mt-3 rounded-xl border border-slate-800/40 bg-slate-900/20 px-4 py-6 text-center">
            <p className="text-[12px] text-slate-600">No open positions</p>
            <Link to="/trading" className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
              <LineChart size={11} /> Open Trading Terminal
            </Link>
          </div>
        )}
      </Section>

      {/* ────────────────────────────────────────────────────────────
          SECTION 5 — Quick Actions
      ──────────────────────────────────────────────────────────── */}
      <Section title="Quick Actions" eyebrow="Shortcuts">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              to:    "/trading",
              icon:  LineChart,
              label: "Trading Terminal",
              desc:  "iTrader + OLOS",
              cls:   "border-cyan-400/25 bg-cyan-400/8 hover:bg-cyan-400/14",
              iconCls: "text-cyan-400",
            },
            {
              to:    "/dashboard/deposit",
              icon:  Wallet,
              label: "Deposit Funds",
              desc:  "Fund account",
              cls:   "border-emerald-500/20 bg-emerald-500/6 hover:bg-emerald-500/10",
              iconCls: "text-emerald-400",
            },
            {
              to:    "/dashboard/withdraw",
              icon:  ArrowUpRight,
              label: "Withdraw Funds",
              desc:  "To bank / wallet",
              cls:   "border-slate-700 bg-slate-900/40 hover:bg-slate-900",
              iconCls: "text-slate-400",
            },
            {
              to:    "/documents",
              icon:  FileUp,
              label: "Upload Documents",
              desc:  "KYC & compliance",
              cls:   "border-slate-700 bg-slate-900/40 hover:bg-slate-900",
              iconCls: "text-slate-400",
            },
            {
              to:    "/support",
              icon:  Headphones,
              label: "Contact Support",
              desc:  "Live chat · tickets",
              cls:   "border-slate-700 bg-slate-900/40 hover:bg-slate-900",
              iconCls: "text-slate-400",
            },
          ].map(({ to, icon: Icon, label, desc, cls, iconCls }) => (
            <Link key={label} to={to}
              className={`flex flex-col gap-2 rounded-xl border px-4 py-4 transition ${cls}`}>
              <Icon size={16} className={iconCls} />
              <div>
                <p className="text-[13px] font-semibold text-white">{label}</p>
                <p className="text-[10px] text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Status footer */}
      <div className="flex items-center justify-between px-1 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`} />
          {connected ? "Live · market data connected" : "Connecting to markets…"}
        </span>
        <span>IGFXPRO · ESMA regulated · MiFID II compliant</span>
        <button onClick={() => { clearAuth("client"); window.location.assign("/login"); }}
          className="text-slate-600 transition hover:text-slate-400">
          Sign out
        </button>
      </div>
    </main>
  );
}

export default ClientDashboard;
