import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Zap, Shield, TrendingUp, Clock, BarChart2, Bot } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

// ─── Data ─────────────────────────────────────────────────────────────────────

const MAJOR_PAIRS = [
  { symbol: "EUR/USD", spread: "0.1", leverage: "30:1", margin: "3.33%", pip: "$10", session: "24/5", category: "Major" },
  { symbol: "GBP/USD", spread: "0.3", leverage: "30:1", margin: "3.33%", pip: "$10", session: "24/5", category: "Major" },
  { symbol: "USD/JPY", spread: "0.2", leverage: "30:1", margin: "3.33%", pip: "¥1000", session: "24/5", category: "Major" },
  { symbol: "USD/CHF", spread: "0.4", leverage: "30:1", margin: "3.33%", pip: "Fr10", session: "24/5", category: "Major" },
  { symbol: "AUD/USD", spread: "0.5", leverage: "20:1", margin: "5.00%", pip: "$10", session: "24/5", category: "Major" },
  { symbol: "USD/CAD", spread: "0.5", leverage: "20:1", margin: "5.00%", pip: "C$10", session: "24/5", category: "Major" },
  { symbol: "NZD/USD", spread: "0.7", leverage: "20:1", margin: "5.00%", pip: "$10", session: "24/5", category: "Major" },
  { symbol: "EUR/GBP", spread: "0.5", leverage: "20:1", margin: "5.00%", pip: "£10", session: "24/5", category: "Minor" },
  { symbol: "EUR/JPY", spread: "0.6", leverage: "20:1", margin: "5.00%", pip: "¥1000", session: "24/5", category: "Minor" },
  { symbol: "GBP/JPY", spread: "0.9", leverage: "20:1", margin: "5.00%", pip: "¥1000", session: "24/5", category: "Minor" },
  { symbol: "EUR/CHF", spread: "0.8", leverage: "20:1", margin: "5.00%", pip: "Fr10", session: "24/5", category: "Minor" },
  { symbol: "AUD/JPY", spread: "1.0", leverage: "20:1", margin: "5.00%", pip: "¥1000", session: "24/5", category: "Minor" },
];

const FEATURES = [
  { icon: Zap,       title: "Sub-5ms execution",      body: "Orders fill through the OLOS matching engine in under 5 milliseconds. No requotes. No dealer intervention." },
  { icon: Shield,    title: "ESMA leverage caps",      body: "Retail clients trade majors at up to 30:1, minors at 20:1. ESMA rules enforced automatically by the risk engine." },
  { icon: TrendingUp,title: "OLOS AI signals",         body: "Real-time directional signals with confidence scores, macro context, and trend alignment across 60+ currency pairs." },
  { icon: Clock,     title: "24/5 liquidity",          body: "Continuous pricing from Sunday 22:00 UTC to Friday 22:00 UTC. Deep liquidity across all major trading sessions." },
  { icon: BarChart2, title: "Level 2 order book",      body: "10-level bid/ask depth, cumulative volume display, and DOM panel with real-time microstructure data." },
  { icon: Bot,       title: "Autopilot strategies",    body: "Deploy OLOS-powered automated strategies on forex pairs with configurable risk parameters and kill-switch governance." },
];

const SESSIONS = [
  { name: "Sydney",     hours: "22:00 – 07:00 UTC", overlap: "Quiet — wide spreads on exotics" },
  { name: "Tokyo",      hours: "00:00 – 09:00 UTC", overlap: "Active JPY, AUD, NZD crosses" },
  { name: "London",     hours: "08:00 – 17:00 UTC", overlap: "Highest volume session — EUR, GBP, CHF" },
  { name: "New York",   hours: "13:00 – 22:00 UTC", overlap: "USD pairs — overlaps London 13:00–17:00" },
  { name: "London/NY",  hours: "13:00 – 17:00 UTC", overlap: "Peak liquidity — tightest spreads" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ForexPage() {
  return (
    <PublicLayout>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#030712] py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.04] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
              Foreign Exchange
            </span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Forex trading.<br />
              <span className="text-blue-400">Institutional execution.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-slate-400">
              Access 60+ currency pairs with raw interbank spreads from 0.0 pips, ESMA-regulated leverage up to 30:1,
              and OLOS AI signals delivering directional intelligence on every major session.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Open account <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Access terminal
              </Link>
            </div>
          </div>

          {/* Key stats */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "0.0",  u: "pips from",       n: "EUR/USD spread" },
              { v: "30:1", u: "max leverage",     n: "FX major pairs" },
              { v: "60+",  u: "currency pairs",   n: "majors, minors, exotics" },
              { v: "< 5",  u: "ms execution",     n: "OLOS matching engine" },
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

      {/* Instruments table */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Instruments</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Trading conditions</h2>
            <p className="mt-3 text-[14px] text-slate-500">
              Spreads are typical values under normal market conditions during the London/New York overlap session.
              ESMA leverage caps apply to retail clients.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_80px] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
              {["Pair", "Spread (pips)", "Max Leverage", "Margin Req.", "Pip Value (1 lot)", "Session", "Category"].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{h}</span>
              ))}
            </div>
            {MAJOR_PAIRS.map((row, i) => (
              <div key={row.symbol} className={`grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_80px] gap-2 border-b border-white/[0.03] px-5 py-3.5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                <span className="text-[13px] font-semibold text-white">{row.symbol}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{row.spread}</span>
                <span className="text-[13px] tabular-nums text-cyan-400">{row.leverage}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{row.margin}</span>
                <span className="text-[13px] tabular-nums text-slate-400">{row.pip}</span>
                <span className="text-[13px] text-slate-500">{row.session}</span>
                <span className={`text-[11px] font-semibold ${row.category === "Major" ? "text-emerald-400" : "text-blue-400"}`}>{row.category}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] text-slate-600">
            * 1 standard lot = 100,000 units of base currency. Minimum trade size 0.01 lots (micro lot).
            Overnight swap rates apply to positions held past 22:00 UTC. See full swap schedule in the trading terminal.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Why IGFXPRO Forex</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Designed for serious traders</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.12]">
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

      {/* Trading sessions */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Market Hours</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Global trading sessions</h2>
            <p className="mt-3 text-[14px] text-slate-500">
              The forex market operates 24 hours a day, 5 days a week. Liquidity and spreads vary by session.
              OLOS AI monitors all active sessions simultaneously, issuing signals regardless of the hour.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SESSIONS.map(({ name, hours, overlap }) => (
              <div key={name} className="rounded-xl border border-white/[0.06] bg-[#030912] p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400/70" />
                  <span className="text-[13px] font-bold text-white">{name}</span>
                </div>
                <p className="text-[12px] font-mono text-cyan-400/80">{hours}</p>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">{overlap}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OLOS AI section */}
      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
                <span className="h-1 w-1 rounded-full bg-cyan-400/70" /> OLOS-powered
              </span>
              <h2 className="mt-4 text-[36px] font-bold leading-[1.15] tracking-[-0.025em] text-white">
                AI intelligence for every forex trade
              </h2>
              <p className="mt-5 text-[15px] leading-8 text-slate-400">
                OLOS analyses 12 concurrent AI models against live forex data, macro news calendars,
                correlations with commodity and equity markets, and interbank order flow signals.
                The output: a single confidence-weighted directional signal with full explainability.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Trend alignment across 5 timeframes (M5, M15, H1, H4, D1)",
                  "Macro event detection with pre-trade lockout during high-impact news",
                  "Volatility regime classification (ranging / trending / breakout)",
                  "Correlation filter: USD-basket, carry trade flows, risk-on/risk-off",
                  "Confidence score 0–100 with minimum threshold enforcement",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-cyan-400/70" strokeWidth={2} />
                    <span className="text-[13px] text-slate-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1220] p-6">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Live OLOS signal example</p>
              {[
                { pair: "EUR/USD", dir: "BUY",  tf: "INTRADAY",  conf: 91, trend: 92, momentum: 88, macro: 94 },
                { pair: "GBP/USD", dir: "SELL", tf: "SHORT-TERM", conf: 78, trend: 74, momentum: 82, macro: 71 },
                { pair: "USD/JPY", dir: "BUY",  tf: "SWING",      conf: 85, trend: 89, momentum: 80, macro: 87 },
              ].map(sig => (
                <div key={sig.pair} className="mb-4 rounded-lg border border-white/[0.06] bg-[#030912] p-4 last:mb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-bold text-white">{sig.pair}</p>
                      <div className={`mt-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${sig.dir === "BUY" ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}>
                        {sig.dir === "BUY" ? "↑" : "↓"} {sig.dir} · {sig.tf}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">Confidence</p>
                      <p className="text-[22px] font-bold text-white">{sig.conf}%</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {[["Trend", sig.trend], ["Momentum", sig.momentum], ["Macro", sig.macro]].map(([l, v]) => (
                      <div key={l as string} className="flex items-center gap-2">
                        <span className="w-20 text-[10px] text-slate-600">{l}</span>
                        <div className="h-1 flex-1 rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-cyan-400/70" style={{ width: `${v}%` }} />
                        </div>
                        <span className="w-7 text-right text-[10px] tabular-nums text-slate-500">{v}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="mt-3 text-[10px] text-slate-600">Signal data is illustrative. Live signals available after login.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Risk warning + CTA */}
      <section className="border-t border-white/[0.04] bg-[#050b14] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10 rounded-lg border border-amber-400/[0.12] bg-amber-400/[0.04] px-5 py-4">
            <p className="text-[12px] leading-6 text-slate-500">
              <span className="font-semibold text-amber-400/80">Forex risk disclosure:</span>{" "}
              Trading foreign exchange on margin carries a high level of risk and may not be suitable for all investors.
              The high degree of leverage can work against you as well as for you. Before deciding to trade foreign exchange
              you should carefully consider your investment objectives, level of experience, and risk appetite.
              The possibility exists that you could sustain a loss of some or all of your initial investment.
              IGFXPRO enforces negative balance protection — your losses cannot exceed your account balance.
              ESMA leverage caps (30:1 for FX majors) apply to all retail clients.
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white">Ready to trade forex?</h2>
            <p className="mt-3 text-[14px] text-slate-500">Open an account in minutes. Access 60+ pairs with OLOS AI intelligence.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Open live account <ArrowRight size={15} />
              </Link>
              <Link to="/markets/indices" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-7 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Explore indices →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
