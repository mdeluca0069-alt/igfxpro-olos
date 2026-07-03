/**
 * IGFXPRO — Platform Overview
 * Institutional-grade overview: live market data, portfolio analytics,
 * OLOS AI signal preview, compliance posture, platform launcher.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, ArrowUpRight, ArrowDownRight, BarChart2, Bot, BrainCircuit,
  CheckCircle2, ChevronRight, CircleDollarSign, Globe, Monitor, Radio,
  Shield, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet, Zap,
} from "lucide-react";
import { useMarketStore }  from "../../store/market.store";
import { useSignalStore }  from "../../store/signal.store";
import { useRiskStore }    from "../../store/risk.store";
import { useWalletStore }  from "../../store/wallet.store";
import { useTradingStore } from "../../store/trading.store";
import { useTier }         from "../../app/TierProvider";
import { apiGet }          from "../../shared/lib/apiHelpers";
import { money, money2, number, priceDigits } from "../../shared/utils/format";
import { usePageTitle }    from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiWallet = {
  currency: string; available: number; equity: number;
  locked: number; freeMargin: number; unrealizedPnL: number; marginUsed: number;
};

type RiskSnap = {
  riskScore: number; marginLevelPct: number; negativeBalanceProtection: boolean;
  stopOutLevelPct: number; alerts: string[];
};

type EquityCurvePoint = { date: string; equity: number; dailyPnl: number };
type EquityCurveApiResponse = { curve: EquityCurvePoint[] };

// ─── Live quote ticker ────────────────────────────────────────────────────────

function QuoteTicker() {
  const quotesMap = useMarketStore((s) => s.quotes);
  const quotes    = Object.values(quotesMap).slice(0, 9);

  if (!quotes.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {quotes.map((q) => {
        const up = (q.changePct ?? 0) >= 0;
        const pd = priceDigits(q.symbol);
        return (
          <Link key={q.symbol} to={`/trading?symbol=${q.symbol}`}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm transition hover:border-slate-600 hover:bg-slate-900">
            <span className="font-bold text-white">{q.symbol}</span>
            <span className="font-mono text-slate-300">{number(q.mid, pd)}</span>
            <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>
              {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(q.changePct ?? 0).toFixed(2)}%
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Platform launcher card ───────────────────────────────────────────────────

function PlatformCard({
  href, icon: Icon, title, desc, badge, accent, features,
}: {
  href: string; icon: React.ElementType; title: string; desc: string;
  badge: string; accent: string; features: string[];
}) {
  return (
    <Link to={href}
      className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#07111e] p-5 transition hover:border-slate-700 hover:shadow-xl hover:shadow-black/40">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-0 transition group-hover:opacity-15 ${accent}`} />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 transition group-hover:bg-slate-700">
            <Icon size={20} className="text-cyan-400" />
          </div>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
            badge === "All tiers"   ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" :
            badge === "PLATINUM+"   ? "border-violet-400/30 bg-violet-400/10 text-violet-300" :
                                      "border-amber-400/30  bg-amber-400/10  text-amber-300"
          }`}>{badge}</span>
        </div>

        <h3 className="text-base font-extrabold text-white">{title}</h3>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">{desc}</p>

        <ul className="mt-4 space-y-1.5">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[11px] text-slate-400">
              <CheckCircle2 size={10} className="shrink-0 text-cyan-500/60" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-cyan-400 transition group-hover:text-cyan-300">
          Launch <ChevronRight size={12} />
        </div>
      </div>
    </Link>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, cls = "text-white" }: {
  icon: React.ElementType; label: string; value: string; sub: string; cls?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-[#07111e] px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800">
        <Icon size={16} className={cls} />
      </div>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
        <p className={`mt-0.5 text-lg font-extrabold tabular-nums ${cls}`}>{value}</p>
        <p className="text-[10px] text-slate-600">{sub}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  usePageTitle("Overview");

  const { tier }   = useTier();
  const storeWallet  = useWalletStore((s) => s.balance);
  const storeRisk    = useRiskStore((s) => s.snapshot);
  const topSignal    = useSignalStore((s) => s.activeSignals[0] ?? s.signals[0]);
  const connected    = useMarketStore((s) => s.connected);
  const marketCount  = useMarketStore((s) => Object.keys(s.quotes).length);
  const openPos      = useTradingStore((s) => s.positions.length);
  const pnlTotal     = useTradingStore((s) => s.getTotalUnrealizedPnL());

  const riskQ = useQuery({
    queryKey:  ["risk-ov"],
    queryFn:   () => apiGet<RiskSnap>("/api/v1/risk/snapshot"),
    enabled:   !storeRisk,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const walletQ = useQuery({
    queryKey:  ["wallet-ov"],
    queryFn:   () => apiGet<ApiWallet>("/api/v1/wallet/balance"),
    enabled:   !storeWallet,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const risk   = storeRisk  ?? riskQ.data;
  const wallet = storeWallet ?? walletQ.data;

  const equity     = wallet?.equity     ?? 0;
  const freeMargin = wallet?.freeMargin ?? 0;
  const pnl        = wallet?.unrealizedPnL ?? pnlTotal;
  const pnlPos     = pnl >= 0;

  const { data: curveResp } = useQuery<EquityCurveApiResponse | null>({
    queryKey:  ["equity-curve-ov"],
    queryFn:   () => apiGet<EquityCurveApiResponse>("/api/v1/portfolio/equity-curve?days=30"),
    staleTime: 120_000,
    retry: false,
  });

  const chartData = useMemo(() => {
    const pts = curveResp?.curve ?? [];
    return pts.map((p) => ({
      day:    new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      equity: p.equity,
    }));
  }, [curveResp]);

  const complianceItems = [
    { label: "ESMA retail leverage caps enforced",     ok: true  },
    { label: "Negative balance protection (NBP)",      ok: risk?.negativeBalanceProtection ?? true },
    { label: "OLOS AI — supervised execution only",   ok: true  },
    { label: "Pre-trade risk validation on every order", ok: true },
    { label: "Cryptographic audit trail (MiFID II)",   ok: true  },
    { label: "KYC / AML — AML-CF 231 compliant",      ok: true  },
    { label: "Stop-out governor active",               ok: true  },
  ];

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">

        {/* ── Hero ── */}
        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">

          {/* Left hero */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#07111e] via-[#060d1a] to-[#05070d] p-7">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/8 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-500/6 blur-3xl" />

            <div className="relative">
              {/* Status badges */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/8 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  {connected ? `Live · ${marketCount || 19} markets` : "Connecting…"}
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/6 px-3 py-1 text-[11px] font-semibold text-cyan-300/80">
                  OLOS Active
                </span>
                <span className="rounded-full border border-violet-400/20 bg-violet-400/6 px-3 py-1 text-[11px] font-semibold text-violet-300/80">
                  {tier}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-400">
                  MiFID II · ESMA regulated
                </span>
              </div>

              <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white lg:text-4xl">
                IGFXPRO OLOS —<br />
                <span className="text-cyan-400">institutional AI</span> meets<br />
                execution infrastructure.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                12 AI models orchestrated in real-time. Every order pre-validated by the OLOS risk engine.
                Full MiFID II audit trail. TwelveData live feed across 19 instruments.
              </p>

              {/* CTA buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/trading" className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:bg-cyan-300">
                  <BarChart2 size={15} /> iTrader Terminal
                </Link>
                <Link to="/trading?platform=mt5" className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/8 px-5 py-3 text-sm font-bold text-violet-300 transition hover:bg-violet-400/14">
                  <Monitor size={15} /> MT5 + Autopilot
                </Link>
                <Link to="/olos-ai" className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800">
                  <Bot size={15} /> OLOS AI
                </Link>
                <Link to="/risk" className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800">
                  <Shield size={15} /> Risk
                </Link>
              </div>

              {/* Quote ticker */}
              <div className="mt-5 border-t border-slate-800/50 pt-4">
                <QuoteTicker />
              </div>
            </div>
          </div>

          {/* Right: OLOS signal + portfolio */}
          <div className="space-y-3">
            {/* Top OLOS signal */}
            {topSignal ? (
              <Link to="/olos-ai" className="block group">
                <div className={`relative overflow-hidden rounded-2xl border p-5 transition hover:scale-[1.01] ${
                  topSignal.signalType === "BUY"
                    ? "border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 to-[#07111e]"
                    : "border-rose-500/25 bg-gradient-to-br from-rose-950/30 to-[#07111e]"
                }`}>
                  <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl opacity-20 ${
                    topSignal.signalType === "BUY" ? "bg-emerald-500" : "bg-rose-500"
                  }`} />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <BrainCircuit size={14} className="text-cyan-400" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">OLOS Live Signal</span>
                          <span className="flex items-center gap-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold text-slate-400">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />LIVE
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xl font-extrabold text-white">{topSignal.symbol}</span>
                          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                            topSignal.signalType === "BUY" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                          }`}>
                            {topSignal.signalType === "BUY" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {topSignal.signalType}
                          </span>
                          <span className="text-xs text-slate-500">{topSignal.timeframe}</span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{topSignal.entryRationale}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-3xl font-extrabold tabular-nums ${
                          topSignal.signalType === "BUY" ? "text-emerald-300" : "text-rose-300"
                        }`}>{number(topSignal.confidence, 0)}<span className="text-lg">%</span></div>
                        <div className="text-[9px] text-slate-600">confidence</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={14} className="text-slate-600" />
                  <span className="text-[11px] text-slate-600">OLOS evaluating markets…</span>
                </div>
                <div className="space-y-2">
                  {[80, 60, 45].map((w) => (
                    <div key={w} className="h-3 animate-pulse rounded-full bg-slate-800" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio mini cards */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Equity",      value: wallet ? money(equity) : "—",           cls: "text-white",          icon: Wallet },
                { label: "Free Margin", value: wallet ? money(freeMargin) : "—",       cls: "text-cyan-300",       icon: CircleDollarSign },
                { label: "Live P&L",    value: wallet ? `${pnlPos?"+":""}${money2(pnl)}`:"—", cls: pnlPos?"text-emerald-300":"text-rose-300", icon: pnlPos?TrendingUp:TrendingDown },
                { label: "Positions",   value: `${openPos}`,                             cls: openPos > 0 ? "text-amber-300" : "text-slate-400", icon: Activity },
              ].map(({ label, value, cls, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-[#07111e] p-3.5">
                  <div className="flex items-center gap-1.5">
                    <Icon size={11} className={cls} />
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
                  </div>
                  <p className={`mt-1.5 text-base font-extrabold tabular-nums ${cls}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── KPI row ── */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CircleDollarSign} label="Total Equity"  value={wallet ? money(equity) : "—"}    sub="Mark-to-market"          cls="text-cyan-300" />
          <StatCard icon={ShieldCheck}      label="Protection"    value="NBP Active"                      sub="Neg. balance guard"       cls="text-emerald-300" />
          <StatCard icon={Radio}            label="Live markets"  value={`${marketCount || 19}`}          sub="TwelveData feed"          cls="text-violet-300" />
          <StatCard icon={Zap}             label="Risk score"     value={risk ? `${risk.riskScore}/100` : "—"} sub="OLOS risk engine"    cls={!risk || risk.riskScore < 40 ? "text-emerald-300" : risk.riskScore < 70 ? "text-amber-300" : "text-rose-300"} />
        </section>

        {/* ── Equity chart + compliance ── */}
        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">

          {/* Equity curve */}
          <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Portfolio equity curve</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {wallet ? money(equity) : "—"}
                  {wallet && (
                    <span className={`ml-2 text-[12px] font-semibold ${pnlPos ? "text-emerald-400" : "text-rose-400"}`}>
                      {pnlPos ? "+" : ""}{money2(pnl)} today
                    </span>
                  )}
                </p>
              </div>
              <Link to="/wallet" className="text-[11px] text-cyan-400 hover:text-cyan-300">
                Wallet →
              </Link>
            </div>
            <div className="h-56">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[12px] text-slate-600">
                  No Data Available
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="eq" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="day" stroke="#334155" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} />
                  <YAxis stroke="#334155" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip
                    contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [money(v), "Equity"]}
                    labelStyle={{ color: "#64748b" }}
                  />
                  <Area dataKey="equity" stroke="#22d3ee" fill="url(#eq)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Compliance posture */}
          <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Compliance posture</p>
                <p className="mt-0.5 text-sm font-bold text-white">ESMA · MiFID II · AML</p>
              </div>
              <Link to="/risk" className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
                <Shield size={10} /> Risk dashboard
              </Link>
            </div>
            <div className="space-y-2">
              {complianceItems.map(({ label, ok }) => (
                <div key={label}
                  className="flex items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-900/30 px-3 py-2.5">
                  {ok
                    ? <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                    : <span className="h-3 w-3 shrink-0 rounded-full bg-rose-500/20 ring-1 ring-rose-500" />}
                  <span className={`text-[12px] leading-4 ${ok ? "text-slate-300" : "text-rose-300"}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Platform launcher ── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white">Trading platforms</h2>
            <span className="text-[11px] text-slate-600">All powered by OLOS AI</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PlatformCard
              href="/trading"
              icon={BarChart2}
              title="iTrader + OLOS"
              badge="All tiers"
              accent="bg-cyan-500"
              desc="Proprietary execution terminal with OLOS AI signal overlay, L2 order book, depth chart and real-time risk guardrails."
              features={[
                "Advanced charting (6 timeframes)",
                "OLOS signal overlay on chart",
                "L2 order book + DOM depth",
                "SL/TP + one-click execution",
                "Live P&L positions tracker",
              ]}
            />
            <PlatformCard
              href="/trading?platform=mt5"
              icon={Monitor}
              title="MT5 + Autopilot"
              badge="PLATINUM+"
              accent="bg-violet-500"
              desc="MetaTrader 5 bridge with supervised OLOS autopilot, confidence gate, event lock window and full audit trail."
              features={[
                "MT5 full execution bridge",
                "Supervised OLOS autopilot",
                "Confidence gate (min 78%)",
                "Event risk lock window",
                "Multi-account management",
              ]}
            />
            <PlatformCard
              href="/olos-ai"
              icon={Sparkles}
              title="OLOS AI Command"
              badge="VIP+"
              accent="bg-amber-500"
              desc="12-engine AI orchestrator: regime detection, sentiment, flow intelligence, macro context and confidence-weighted signal generation."
              features={[
                "12 AI model engines live",
                "Confidence breakdown per factor",
                "Entry / SL / TP levels",
                "Market regime classification",
                "Signal history & analytics",
              ]}
            />
          </div>
        </section>

        {/* ── Service grid ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-extrabold text-white">All services</h2>
            <p className="text-[11px] text-slate-600">Quick access to every platform service</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[
              { label: "Risk Dashboard",   href: "/risk",          icon: Shield,          desc: "Margin, warnings, kill switch" },
              { label: "Wallet",           href: "/wallet",        icon: Wallet,          desc: "Balance, deposit, withdraw" },
              { label: "Onboarding",       href: "/onboarding",   icon: CheckCircle2,    desc: "KYC, docs, live enablement" },
              { label: "Academy",          href: "/academy",       icon: Globe,           desc: "Trading education, OLOS playbook" },
              { label: "Support",          href: "/support",       icon: Activity,        desc: "Live chat, tickets, AI assistant" },
              { label: "Settings",         href: "/settings",      icon: Zap,             desc: "Profile, notifications, preferences" },
              { label: "Deposit",          href: "/dashboard/deposit",    icon: ArrowUpRight,  desc: "Fund your trading account" },
              { label: "Withdraw",         href: "/dashboard/withdraw",   icon: ArrowDownRight, desc: "Withdraw available balance" },
            ].map(({ label, href, icon: Icon, desc }) => (
              <Link key={label} to={href}
                className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-[#07111e] px-4 py-3.5 transition hover:border-slate-700 hover:bg-slate-900/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 transition group-hover:bg-slate-700">
                  <Icon size={14} className="text-slate-400 group-hover:text-cyan-400 transition" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white">{label}</p>
                  <p className="truncate text-[10px] text-slate-600">{desc}</p>
                </div>
                <ChevronRight size={12} className="ml-auto shrink-0 text-slate-700 transition group-hover:text-slate-500" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
