import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Zap, Shield, Brain, TrendingUp, Target, CheckCircle, BarChart2, Lock, Settings } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const FEATURES = [
  {
    icon: Brain,
    title: "OLOS Signal Integration",
    body: "Autopilot receives signals directly from the OLOS intelligence engine. Every trade decision is backed by the full 5-factor reasoning chain — regime type, momentum, volume profile, macro overlay, and confidence score.",
  },
  {
    icon: Settings,
    title: "No-code Strategy Builder",
    body: "Construct complex rule-based strategies without writing a single line of code. Combine signal filters, time-of-day windows, session restrictions, and instrument whitelists with a visual interface.",
  },
  {
    icon: Shield,
    title: "Automated Risk Control",
    body: "Kelly Criterion position sizing, trailing stop-losses, daily drawdown kill-switches, and correlation guards all execute automatically. Define your risk parameters once — Autopilot enforces them on every trade.",
  },
  {
    icon: TrendingUp,
    title: "Portfolio Rebalancing",
    body: "Multi-asset exposure is managed across all open positions simultaneously. When correlation between instruments rises above your threshold, Autopilot automatically scales positions to maintain target risk.",
  },
  {
    icon: Zap,
    title: "Sub-5ms Execution Bot",
    body: "Orders are routed directly into the IGFXPRO matching engine. From signal confirmation to fill, execution completes in under 5 milliseconds — eliminating the emotional delay between decision and action.",
  },
  {
    icon: Target,
    title: "Hedging Engine",
    body: "When macro events threaten open positions, Autopilot can automatically place hedge positions to neutralize directional exposure. Configurable by currency pair, index, and event impact level.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Configure your strategy",
    body: "Set which OLOS signal types to follow, which instruments and sessions to trade, and define your full risk parameter suite — lot size, max daily loss, max open positions.",
  },
  {
    num: "02",
    title: "OLOS generates signals",
    body: "The intelligence engine continuously scans all instruments across all timeframes. When confidence thresholds are met, a signal is passed to your active Autopilot bot.",
  },
  {
    num: "03",
    title: "Risk validation fires",
    body: "Before any order is placed, the risk engine validates: drawdown limits, correlation, leverage compliance, and session restrictions. Signals that breach any rule are discarded.",
  },
  {
    num: "04",
    title: "Execution bot fills",
    body: "Valid orders are sent to the matching engine with microsecond precision. Fill confirmation, slippage tracking, and full audit trail are logged automatically.",
  },
];

const GUARDS = [
  "Daily drawdown kill-switch",
  "Max concurrent positions",
  "Correlation guard (0–1 threshold)",
  "Session whitelisting",
  "Instrument blacklist",
  "Min confidence filter",
  "Event horizon pause (NFP, FOMC, ECB)",
  "Leverage cap enforcement",
];

export default function AutopilotPublicPage() {
  return (
    <PublicLayout>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#030712] py-28 lg:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.04] blur-[130px]" />
          <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-cyan-500/[0.03] blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-400">IGFXPRO · Autopilot Engine</span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Your strategy.<br />
              <span className="text-emerald-400">On autopilot.</span>
            </h1>
            <p className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-slate-400">
              Autopilot connects the OLOS signal engine to a fully automated execution bot. Configure your risk parameters once — the system executes with sub-5ms precision, 24 hours a day, without emotional interference.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-[14px] font-bold text-black transition hover:bg-emerald-400">
                Open Account <ArrowRight size={16} />
              </Link>
              <Link to="/trading?platform=itrader"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-[14px] font-semibold text-white/70 transition hover:border-white/20 hover:text-white">
                View iTrader Terminal
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6">
              {[
                { icon: Zap,    label: "< 5ms execution" },
                { icon: Shield, label: "Risk-validated every trade" },
                { icon: Brain,  label: "OLOS-powered signals" },
                { icon: Lock,   label: "Kill-switch protection" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-slate-500">
                  <Icon size={13} className="text-emerald-500/60" />
                  <span className="text-[12px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-[#020609] py-24 lg:py-32">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-14 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">How Autopilot Works</span>
            <h2 className="mt-3 text-[38px] font-bold leading-[1.1] tracking-[-0.02em] text-white lg:text-[46px]">
              Four stages. Zero emotion.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(step => (
              <div key={step.num} className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="mb-4 font-mono text-[36px] font-bold leading-none text-white/[0.06]">{step.num}</p>
                <p className="mb-2 text-[15px] font-bold text-white">{step.title}</p>
                <p className="text-[13px] leading-relaxed text-slate-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-[#030712] py-24 lg:py-32">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-14">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-400">Autopilot Capabilities</span>
            <h2 className="mt-3 text-[38px] font-bold leading-[1.1] tracking-[-0.02em] text-white lg:text-[44px]">
              Built for serious strategy execution
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08]">
                  <Icon size={17} className="text-emerald-400" />
                </div>
                <p className="mb-2 text-[15px] font-bold text-white">{title}</p>
                <p className="text-[13px] leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Risk Guards ── */}
      <section className="bg-[#020609] py-24 lg:py-32">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-rose-400">Risk Architecture</span>
              <h2 className="mt-3 text-[38px] font-bold leading-[1.1] tracking-[-0.02em] text-white lg:text-[44px]">
                Eight risk guards.<br />Every single trade.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-slate-400">
                Autopilot enforces your entire risk framework automatically. No order bypasses validation — every rule you configure fires on every trade, every session, every day.
              </p>
              <div className="mt-8">
                <Link to="/platform/risk"
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-emerald-400 hover:text-emerald-300 transition">
                  Explore the Risk Engine <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
              <div className="mb-6 flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Pre-trade validation layer</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {GUARDS.map(g => (
                  <div key={g} className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="shrink-0 text-emerald-500/60" />
                    <span className="text-[12px] text-slate-400">{g}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Access CTA ── */}
      <section className="bg-[#030712] py-24 lg:py-32">
        <div className="mx-auto max-w-[700px] px-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08]">
            <Cpu size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-[38px] font-bold leading-[1.1] tracking-[-0.02em] text-white">
            Ready to automate your trading?
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            Autopilot is available from Gold tier onwards. Open an account to configure your first strategy and connect it to the OLOS signal engine.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-[14px] font-bold text-black transition hover:bg-emerald-400">
              Open Account <ArrowRight size={16} />
            </Link>
            <Link to="/platform/olos-ai"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-8 py-3.5 text-[14px] font-semibold text-white/70 transition hover:border-white/20 hover:text-white">
              <BarChart2 size={15} /> Explore OLOS
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-slate-600">
            {["Gold, Platinum, VIP & Enterprise accounts","ESMA regulated","No code required","Cancel anytime"].map(t => (
              <span key={t} className="flex items-center gap-1.5 text-[12px]">
                <CheckCircle size={11} className="text-emerald-500/40" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
