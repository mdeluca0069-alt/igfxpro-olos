import { Link } from "react-router-dom";
import { ArrowRight, Brain, TrendingUp, Shield, Zap, Activity, CheckCircle, Eye } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const MODELS = [
  { name: "Trend Alignment",     desc: "Measures agreement across 5 timeframes (M5→D1). High alignment = strong directional conviction.",  coverage: "All instruments" },
  { name: "Momentum Engine",     desc: "RSI, MACD, and proprietary momentum oscillators combined into a single normalised score.",             coverage: "All instruments" },
  { name: "Volume Profile",      desc: "Identifies value areas, point of control, and volume imbalances to predict price behaviour.",         coverage: "Forex, Indices" },
  { name: "Macro Context Model", desc: "Processes central bank calendars, CPI/NFP releases, and PMI data to assess macro tailwinds.",         coverage: "All instruments" },
  { name: "Volatility Regime",   desc: "Classifies market state: Trending, Ranging, or Breakout. Adjusts signal confidence accordingly.",    coverage: "All instruments" },
  { name: "Correlation Filter",  desc: "Detects USD-basket, risk-on/off, and carry trade flow correlations to avoid over-correlated trades.", coverage: "Forex, Crypto" },
  { name: "Order Flow Delta",    desc: "Analyses cumulative buy/sell imbalance in real-time tick data to predict short-term direction.",      coverage: "Indices, Equities" },
  { name: "Sentiment Gauge",     desc: "Aggregate positioning from COT reports, options skew, and retail sentiment indicators.",              coverage: "Forex, Commodities" },
  { name: "Pattern Recognition", desc: "Identifies 32 classical chart patterns with neural-network confidence scoring.",                     coverage: "All instruments" },
  { name: "Support/Resistance",  desc: "Dynamic S/R zones built from historical pivots, volume clusters, and psychological levels.",         coverage: "All instruments" },
  { name: "Event Risk Shield",   desc: "Detects proximity to high-impact events and reduces or blocks signal output during blackout windows.", coverage: "All instruments" },
  { name: "Risk/Reward Filter",  desc: "Validates each signal against minimum R:R ratio. Signals with R:R < 1.5 are suppressed.",            coverage: "All instruments" },
];

const CAPABILITIES = [
  { icon: Brain,     title: "12 concurrent AI models",   body: "OLOS runs 12 independent analytical models simultaneously. Each model contributes a weighted score. The final signal is a confidence-weighted composite — not a single algorithm." },
  { icon: Eye,       title: "Full explainability",        body: "Every OLOS signal comes with a complete factor breakdown: which models contributed, their individual scores, and why the overall confidence is what it is. No black box." },
  { icon: Activity,  title: "Autopilot execution",        body: "Enable OLOS Autopilot to automatically execute signals within your configured risk parameters. Minimum confidence threshold, position size limits, and event lockout windows all enforced." },
  { icon: Shield,    title: "AI governance layer",        body: "Autopilot operates under strict governance: kill-switch accessible by admins and clients, per-session trade count limits, and mandatory position size caps relative to account equity." },
  { icon: Zap,       title: "< 2ms signal latency",       body: "OLOS generates and delivers signals in under 2 milliseconds end-to-end. The signal overlaid on your chart at 09:00:00.001 is live — not delayed, not cached." },
  { icon: TrendingUp,title: "Multi-asset coverage",       body: "OLOS models are trained and validated across forex, indices, commodities, crypto and equities. Separate model configurations per asset class for optimal performance." },
];

export default function OlosAiPublicPage() {
  return (
    <PublicLayout>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#030712] py-28 lg:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[700px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.05] blur-[140px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              OLOS Intelligence System
            </div>
            <h1 className="mt-3 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[64px]">
              Not a feature.<br />
              <span className="text-cyan-400">The operating system.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-8 text-slate-400">
              OLOS is the AI intelligence layer that governs every decision on the IGFXPRO platform.
              12 concurrent models. Full explainability. Zero black-box logic. Every order, every risk check,
              every signal — OLOS.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Access OLOS free <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Sign in
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "12",    u: "AI models",          n: "running simultaneously"    },
              { v: "< 2",   u: "ms signal latency",  n: "end-to-end"               },
              { v: "100%",  u: "explainable",        n: "full decision trace"       },
              { v: "6",     u: "asset classes",      n: "FX, indices, commod, crypto" },
            ].map(({ v, u, n }) => (
              <div key={n} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-5">
                <p className="text-[28px] font-bold tabular-nums tracking-[-0.03em] text-white">{v}</p>
                <p className="mt-0.5 text-[13px] font-medium text-slate-300">{u}</p>
                <p className="mt-1 text-[11px] text-slate-600">{n}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signal example */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Signal Structure</span>
              <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Every signal, fully explained</h2>
              <p className="mt-4 text-[14px] leading-7 text-slate-400">
                OLOS does not give you a buy/sell arrow. It gives you a complete breakdown: which of the
                12 models fired, their individual confidence, macro context, event proximity, and the
                weighted composite score. You decide whether to act — and you understand exactly why.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Confidence score 0–100 from composite model weighting",
                  "Individual factor scores: trend, momentum, volume, macro, sentiment",
                  "Volatility regime: ranging / trending / breakout",
                  "Event shield status: active / inactive (distance from next high-impact event)",
                  "Suggested entry, stop-loss, and take-profit zones",
                  "Risk/reward ratio pre-calculated and validated (minimum 1.5:1)",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-cyan-400/70" strokeWidth={2} />
                    <span className="text-[13px] text-slate-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Signal card demo */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1220] p-6">
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Sample OLOS Signal Output</p>
              <div className="rounded-xl border border-white/[0.06] bg-[#030912] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">EUR/USD · H1</p>
                    <p className="mt-1 text-[22px] font-bold text-white">BUY Signal</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-400/10 px-3 py-1">
                      <TrendingUp size={12} className="text-emerald-400" />
                      <span className="text-[12px] font-bold text-emerald-400">INTRADAY · HIGH CONVICTION</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-500">Confidence</p>
                    <p className="text-[36px] font-bold text-white leading-none">91%</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {[
                    { label: "Trend Alignment",   score: 92 },
                    { label: "Momentum",          score: 88 },
                    { label: "Volume Profile",    score: 76 },
                    { label: "Macro Context",     score: 94 },
                    { label: "Volatility Regime", score: 89 },
                    { label: "Order Flow Delta",  score: 85 },
                  ].map(({ label, score }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-[11px] text-slate-500">{label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${score}%`, opacity: 0.65 + score / 333 }} />
                      </div>
                      <span className="w-8 text-right text-[11px] tabular-nums text-slate-400">{score}%</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  {[{ l: "Entry", v: "1.0854" }, { l: "Stop Loss", v: "1.0820" }, { l: "Target", v: "1.0920" }].map(({ l, v }) => (
                    <div key={l} className="text-center">
                      <p className="text-[10px] text-slate-600">{l}</p>
                      <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-white">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                  <span>R:R = 1:1.94</span>
                  <span className="flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-emerald-400" />Event shield: inactive</span>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-slate-600">Live signals available after account registration.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 12 Models */}
      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">The 12 Models</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">What OLOS analyses on every signal</h2>
            <p className="mt-3 text-[14px] text-slate-500">
              All 12 models run in parallel on every supported instrument. Signal output is only generated when
              composite confidence exceeds the configured threshold (default: 70%).
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODELS.map(({ name, desc, coverage }) => (
              <div key={name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold text-white">{name}</p>
                  <span className="shrink-0 rounded border border-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-600">{coverage}</span>
                </div>
                <p className="mt-2 text-[12px] leading-5 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Capabilities</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">OLOS powers every part of the platform</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-[#030912] p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <Icon size={18} className="text-cyan-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-[14px] font-semibold text-white">{title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#030712] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8 text-center">
          <h2 className="text-[32px] font-bold tracking-[-0.02em] text-white">Trade with institutional AI intelligence</h2>
          <p className="mt-3 text-[14px] text-slate-500">Open an account to access OLOS signals, Autopilot, and the full intelligence layer.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
              Open free account <ArrowRight size={15} />
            </Link>
            <Link to="/trading?platform=itrader" className="inline-flex items-center rounded-lg border border-white/10 px-7 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
              ← iTrader Terminal
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
