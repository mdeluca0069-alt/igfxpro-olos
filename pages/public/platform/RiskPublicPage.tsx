import { Link } from "react-router-dom";
import { ArrowRight, Shield, AlertTriangle, BarChart2, CheckCircle, Zap, Lock, Eye } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const PROTECTIONS = [
  { icon: Shield,       title: "Negative balance protection",  body: "Your losses can never exceed your deposited balance. Mandatory under ESMA for all retail clients. If your balance turns negative from a market gap, IGFXPRO absorbs the deficit." },
  { icon: AlertTriangle,title: "Margin call at 100%",          body: "When your account equity drops to 100% of required margin, you receive an immediate alert by email and in-platform notification. Time to add funds or reduce exposure." },
  { icon: Zap,          title: "Stop-out at 50%",              body: "When equity falls to 50% of required margin, OLOS automatically closes the largest losing position. The process repeats until margin utilisation is restored." },
  { icon: Lock,         title: "ESMA leverage caps enforced",  body: "OLOS enforces ESMA retail leverage limits on every order: FX majors 30:1, indices 20:1, commodities 10:1, equities 5:1, crypto 2:1. No manual override by clients." },
  { icon: Eye,          title: "Real-time portfolio monitoring", body: "Live P&L, margin utilisation, aggregate exposure, and drawdown metrics updated tick-by-tick. Full risk dashboard available inside the terminal." },
  { icon: BarChart2,    title: "Position-level analytics",     body: "Slippage tracking, fill quality scores, and execution latency per trade. OLOS flags outlier executions and provides daily execution quality reports." },
];

const MARGIN_TABLE = [
  { asset: "Forex — Major Pairs",   leverage: "30:1",  margin: "3.33%", examples: "EUR/USD, GBP/USD, USD/JPY" },
  { asset: "Forex — Minor Pairs",   leverage: "20:1",  margin: "5.00%", examples: "EUR/GBP, AUD/JPY, GBP/CHF" },
  { asset: "Major Stock Indices",   leverage: "20:1",  margin: "5.00%", examples: "US500, US100, DE40, UK100" },
  { asset: "Commodities (Gold)",    leverage: "20:1",  margin: "5.00%", examples: "XAUUSD" },
  { asset: "Commodities (Other)",   leverage: "10:1",  margin: "10.0%", examples: "WTI, Brent, Silver, NG" },
  { asset: "Individual Equities",   leverage: "5:1",   margin: "20.0%", examples: "AAPL, NVDA, TSLA, AMZN" },
  { asset: "Cryptocurrencies",      leverage: "2:1",   margin: "50.0%", examples: "BTCUSD, ETHUSD, SOLUSD" },
];

export default function RiskPublicPage() {
  return (
    <PublicLayout>

      <section className="relative overflow-hidden bg-[#030712] py-28 lg:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/[0.03] blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Risk Management</span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Your capital.<br />
              <span className="text-cyan-400">Protected by OLOS.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-8 text-slate-400">
              IGFXPRO's risk engine enforces ESMA leverage caps, monitors margin in real time,
              and provides multi-layer protections against extreme market events —
              all governed automatically by OLOS.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Open protected account <ArrowRight size={15} />
              </Link>
              <Link to="/legal/risk-disclosure" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Read risk disclosure →
              </Link>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "50%",   u: "stop-out level",      n: "of required margin" },
              { v: "100%",  u: "margin call level",   n: "automatic alert"    },
              { v: "0",     u: "negative balance",    n: "ESMA retail protection" },
              { v: "24/7",  u: "risk monitoring",     n: "OLOS tick-by-tick"  },
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

      <section className="border-y border-white/[0.04] bg-[#050b14] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Protections</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Multi-layer risk controls</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROTECTIONS.map(({ icon: Icon, title, body }) => (
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

      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Leverage & Margin</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">ESMA leverage limits — enforced automatically</h2>
            <p className="mt-3 text-[14px] text-slate-500">
              These limits apply to all retail clients. Elective professional clients may access higher leverage
              subject to eligibility. Stop-out at 50% of required margin applies universally.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <div className="grid grid-cols-[2fr_1fr_1fr_2fr] gap-4 border-b border-white/[0.06] bg-white/[0.02] px-6 py-3">
              {["Asset Class", "Max Leverage", "Margin Req.", "Examples"].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{h}</span>
              ))}
            </div>
            {MARGIN_TABLE.map(({ asset, leverage, margin, examples }, i) => (
              <div key={asset} className={`grid grid-cols-[2fr_1fr_1fr_2fr] gap-4 border-b border-white/[0.03] px-6 py-4 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                <span className="text-[13px] font-semibold text-white">{asset}</span>
                <span className="text-[13px] font-bold tabular-nums text-cyan-400">{leverage}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{margin}</span>
                <span className="text-[12px] text-slate-500">{examples}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.04] bg-[#050b14] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Risk Tools</span>
              <h2 className="mt-3 text-[30px] font-bold tracking-[-0.025em] text-white">Tools to manage your own risk</h2>
              <p className="mt-4 text-[14px] leading-7 text-slate-400">
                Beyond automatic protections, IGFXPRO provides advanced tools to actively manage risk at every level.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { title: "Stop-loss orders",        desc: "Set a maximum loss per trade. Executes automatically when price hits your level." },
                { title: "Take-profit orders",      desc: "Lock in gains automatically. No need to monitor the terminal continuously." },
                { title: "Trailing stops",          desc: "Dynamic stop that follows price. Protects profits as the market moves in your favour." },
                { title: "Position size calculator",desc: "Input your risk % and account balance — iTrader calculates the correct lot size." },
                { title: "Risk/reward visualiser",  desc: "Draw S/L and T/P zones on the chart and see R:R ratio before placing the order." },
                { title: "OLOS Event Shield",       desc: "Automatically restricts new orders around high-impact economic events." },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-[#030912] px-4 py-3">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-cyan-400/70" />
                  <div>
                    <p className="text-[13px] font-semibold text-white">{title}</p>
                    <p className="text-[12px] text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#030712] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8 text-center">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white">Trade with confidence</h2>
          <p className="mt-3 text-[14px] text-slate-500">ESMA-compliant risk framework. Negative balance protection. OLOS risk engine.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
              Open account <ArrowRight size={15} />
            </Link>
            <Link to="/legal/risk-disclosure" className="inline-flex items-center rounded-lg border border-white/10 px-7 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
              Risk disclosure →
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
