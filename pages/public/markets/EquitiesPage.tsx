import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Zap, Shield, TrendingUp, Eye, BarChart2 } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const EQUITIES = [
  { symbol: "AAPL",  name: "Apple Inc.",          sector: "Technology",  spread: "$0.04", leverage: "5:1", margin: "20%", exchange: "NASDAQ" },
  { symbol: "MSFT",  name: "Microsoft Corp.",     sector: "Technology",  spread: "$0.05", leverage: "5:1", margin: "20%", exchange: "NASDAQ" },
  { symbol: "NVDA",  name: "NVIDIA Corp.",        sector: "Technology",  spread: "$0.10", leverage: "5:1", margin: "20%", exchange: "NASDAQ" },
  { symbol: "TSLA",  name: "Tesla Inc.",          sector: "Automotive",  spread: "$0.12", leverage: "5:1", margin: "20%", exchange: "NASDAQ" },
  { symbol: "AMZN",  name: "Amazon.com Inc.",     sector: "Consumer",    spread: "$0.06", leverage: "5:1", margin: "20%", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.",       sector: "Technology",  spread: "$0.06", leverage: "5:1", margin: "20%", exchange: "NASDAQ" },
  { symbol: "META",  name: "Meta Platforms",      sector: "Technology",  spread: "$0.10", leverage: "5:1", margin: "20%", exchange: "NASDAQ" },
  { symbol: "JPM",   name: "JPMorgan Chase",      sector: "Finance",     spread: "$0.06", leverage: "5:1", margin: "20%", exchange: "NYSE"   },
  { symbol: "GS",    name: "Goldman Sachs",       sector: "Finance",     spread: "$0.10", leverage: "5:1", margin: "20%", exchange: "NYSE"   },
  { symbol: "V",     name: "Visa Inc.",           sector: "Finance",     spread: "$0.05", leverage: "5:1", margin: "20%", exchange: "NYSE"   },
  { symbol: "NFLX",  name: "Netflix Inc.",        sector: "Media",       spread: "$0.10", leverage: "5:1", margin: "20%", exchange: "NASDAQ" },
  { symbol: "DIS",   name: "Walt Disney Co.",     sector: "Media",       spread: "$0.06", leverage: "5:1", margin: "20%", exchange: "NYSE"   },
];

const SECTORS = [
  { name: "Technology",   count: 35, color: "text-blue-400" },
  { name: "Finance",      count: 22, color: "text-emerald-400" },
  { name: "Healthcare",   count: 18, color: "text-cyan-400" },
  { name: "Consumer",     count: 16, color: "text-violet-400" },
  { name: "Energy",       count: 12, color: "text-amber-400" },
  { name: "Industrials",  count: 15, color: "text-slate-300" },
];

const FEATURES = [
  { icon: TrendingUp, title: "Go long or short",       body: "CFDs allow you to profit from both rising and falling stock prices. No need to own shares — just trade the price movement." },
  { icon: Shield,     title: "5:1 ESMA leverage",      body: "Retail clients access equity CFDs at up to 5:1. Margin requirement is 20% of position notional value." },
  { icon: Zap,        title: "Earnings event signals", body: "OLOS monitors earnings calendars, analyst revisions, and options market positioning to generate pre-earnings intelligence." },
  { icon: Eye,        title: "Corporate actions",      body: "Dividends, splits, and reverse splits are automatically adjusted. Long positions receive dividend credits; shorts are charged." },
  { icon: BarChart2,  title: "US & EU stocks",         body: "Access 200+ US stocks (NYSE, NASDAQ) and 100+ European equities (LSE, XETRA, Euronext) from one account." },
  { icon: CheckCircle,title: "No ownership rights",   body: "CFD holders do not receive shareholder voting rights. Dividends are simulated as cash adjustments. Tax treatment may differ from share ownership." },
];

export default function EquitiesPage() {
  return (
    <PublicLayout>

      <section className="relative overflow-hidden bg-[#030712] py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.04] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Equity CFDs</span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Apple, Tesla, NVIDIA.<br />
              <span className="text-emerald-400">Long and short.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-slate-400">
              Trade 300+ US and European equities as CFDs. 5:1 leverage, fractional contract sizes,
              and OLOS earnings intelligence. Long or short — your choice.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Open account <ArrowRight size={15} />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Access terminal
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "$0.04", u: "spread from",   n: "AAPL typical"     },
              { v: "5:1",   u: "max leverage",  n: "ESMA retail cap"  },
              { v: "300+",  u: "stocks",        n: "US + EU equities" },
              { v: "< 5",   u: "ms execution",  n: "OLOS engine"      },
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

      {/* Sector coverage */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-8">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Sector Coverage</span>
            <h2 className="mt-3 text-[28px] font-bold tracking-[-0.025em] text-white">300+ equities across 6 sectors</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SECTORS.map(({ name, count, color }) => (
              <div key={name} className="rounded-xl border border-white/[0.06] bg-[#030912] p-4 text-center">
                <p className={`text-[22px] font-bold ${color}`}>{count}</p>
                <p className="mt-1 text-[12px] font-medium text-slate-300">{name}</p>
                <p className="text-[11px] text-slate-600">stocks</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instruments table */}
      <section className="border-b border-white/[0.04] bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Instruments</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Top equity CFDs</h2>
            <p className="mt-3 text-[14px] text-slate-500">
              Trading hours: Monday–Friday 14:30–21:00 UTC (US stocks). EU stocks 08:00–16:30 UTC.
              Pre-market CFDs available from 13:00 UTC with wider spreads.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <div className="grid grid-cols-[1fr_1.8fr_1fr_1fr_1fr_1fr_80px] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
              {["Ticker", "Company", "Sector", "Spread", "Leverage", "Margin", "Exchange"].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{h}</span>
              ))}
            </div>
            {EQUITIES.map((row, i) => (
              <div key={row.symbol} className={`grid grid-cols-[1fr_1.8fr_1fr_1fr_1fr_1fr_80px] gap-2 border-b border-white/[0.03] px-5 py-3.5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                <span className="text-[13px] font-bold text-emerald-400">{row.symbol}</span>
                <span className="text-[13px] font-semibold text-white">{row.name}</span>
                <span className="text-[12px] text-slate-400">{row.sector}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{row.spread}</span>
                <span className="text-[13px] tabular-nums text-cyan-400">{row.leverage}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{row.margin}</span>
                <span className="text-[11px] text-slate-500">{row.exchange}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-600">
            * Minimum trade size: 1 share CFD for most US stocks. Overnight financing: LIBOR + 2.5% p.a. for long positions, LIBOR – 2.5% for short positions.
            Dividend adjustments posted at ex-dividend date close.
          </p>
        </div>
      </section>

      <section className="bg-[#050b14] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Features</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Professional equity CFD trading</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-[#030912] p-6 transition hover:border-white/[0.12]">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <Icon size={18} className="text-emerald-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-[14px] font-semibold text-white">{title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.04] bg-[#030712] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10 rounded-lg border border-amber-400/[0.12] bg-amber-400/[0.04] px-5 py-4">
            <p className="text-[12px] leading-6 text-slate-500">
              <span className="font-semibold text-amber-400/80">Equity CFD risk disclosure:</span>{" "}
              CFD equity positions do not confer ownership of the underlying shares.
              ESMA retail leverage limit for equities is 5:1. Individual stocks can move 10–30% on earnings announcements.
              CFD holders do not receive voting rights. Dividends are applied as cash adjustments.
              Tax treatment of equity CFDs may differ from share ownership — consult your tax advisor.
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white">Trade the world's top stocks</h2>
            <p className="mt-3 text-[14px] text-slate-500">AAPL, NVDA, TSLA — long or short, from a single account.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Open live account <ArrowRight size={15} />
              </Link>
              <Link to="/markets/forex" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-7 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                ← Back to Forex
              </Link>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
