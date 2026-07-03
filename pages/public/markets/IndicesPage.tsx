import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Zap, Shield, TrendingUp, Clock, BarChart2 } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const INDICES = [
  { symbol: "US500",  name: "S&P 500",          region: "USA",     spread: "0.4", leverage: "20:1", margin: "5.0%", hours: "Mon–Fri 14:30–21:00 UTC", pip: "$25" },
  { symbol: "US100",  name: "Nasdaq 100",        region: "USA",     spread: "1.0", leverage: "20:1", margin: "5.0%", hours: "Mon–Fri 14:30–21:00 UTC", pip: "$20" },
  { symbol: "DE40",   name: "DAX 40",            region: "Germany", spread: "1.0", leverage: "20:1", margin: "5.0%", hours: "Mon–Fri 08:00–16:30 UTC", pip: "€25" },
  { symbol: "UK100",  name: "FTSE 100",          region: "UK",      spread: "1.5", leverage: "20:1", margin: "5.0%", hours: "Mon–Fri 08:00–16:30 UTC", pip: "£10" },
  { symbol: "JP225",  name: "Nikkei 225",        region: "Japan",   spread: "6.0", leverage: "20:1", margin: "5.0%", hours: "Mon–Fri 00:00–06:00 UTC", pip: "¥25" },
  { symbol: "AU200",  name: "ASX 200",           region: "Australia",spread: "1.5",leverage: "20:1", margin: "5.0%", hours: "Mon–Fri 00:00–06:10 UTC", pip: "A$25" },
  { symbol: "EU50",   name: "Euro Stoxx 50",     region: "EU",      spread: "2.0", leverage: "20:1", margin: "5.0%", hours: "Mon–Fri 08:00–16:30 UTC", pip: "€10" },
  { symbol: "FR40",   name: "CAC 40",            region: "France",  spread: "1.5", leverage: "20:1", margin: "5.0%", hours: "Mon–Fri 08:00–16:30 UTC", pip: "€10" },
];

const FEATURES = [
  { icon: Zap,       title: "Cash & futures CFDs",     body: "Trade both cash index CFDs (continuous pricing) and quarterly futures contracts with fair value adjustments." },
  { icon: Shield,    title: "20:1 ESMA leverage",       body: "Retail clients trade all major indices at up to 20:1 leverage, with automatic margin call at 100% and stop-out at 50%." },
  { icon: TrendingUp,title: "OLOS macro signals",       body: "OLOS analyses equity sector rotations, earnings calendars, Fed/ECB policy signals, and VIX regime changes." },
  { icon: Clock,     title: "Extended hours",           body: "US indices available as pre-market CFDs from 09:00 UTC. Overnight gaps reflected in next-day opening price." },
  { icon: BarChart2, title: "Dividend adjustments",     body: "Long CFD positions receive dividend credits; short positions are charged. Adjustments posted at ex-dividend date." },
  { icon: CheckCircle,title: "No expiry on cash CFDs", body: "Cash index CFDs roll continuously with no expiry. Futures CFDs expire quarterly — terminal shows days-to-expiry." },
];

export default function IndicesPage() {
  return (
    <PublicLayout>

      <section className="relative overflow-hidden bg-[#030712] py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/[0.04] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Stock Indices</span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Global indices.<br />
              <span className="text-violet-400">One terminal.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-slate-400">
              Trade S&P 500, Nasdaq 100, DAX 40, FTSE 100 and 20+ more global indices as cash CFDs or quarterly futures.
              ESMA-regulated leverage at 20:1 with OLOS macro intelligence.
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
              { v: "0.4",  u: "pts from",       n: "US500 spread"      },
              { v: "20:1", u: "max leverage",    n: "all major indices" },
              { v: "20+",  u: "global indices",  n: "cash + futures"    },
              { v: "< 5",  u: "ms execution",    n: "OLOS engine"       },
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
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Instruments</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Index trading conditions</h2>
            <p className="mt-3 text-[14px] text-slate-500">
              Spreads shown are for cash CFDs during the primary session of each index. Wider spreads apply outside regular hours.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
              {["Symbol", "Index", "Region", "Spread (pts)", "Leverage", "Margin", "Trading Hours (UTC)"].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{h}</span>
              ))}
            </div>
            {INDICES.map((row, i) => (
              <div key={row.symbol} className={`grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-2 border-b border-white/[0.03] px-5 py-3.5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                <span className="text-[13px] font-bold text-cyan-400">{row.symbol}</span>
                <span className="text-[13px] font-semibold text-white">{row.name}</span>
                <span className="text-[12px] text-slate-400">{row.region}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{row.spread}</span>
                <span className="text-[13px] tabular-nums text-cyan-400">{row.leverage}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{row.margin}</span>
                <span className="text-[11px] text-slate-500">{row.hours}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-600">
            * Minimum trade size 0.1 lots for index CFDs. Overnight financing charges apply to cash CFDs held past 22:00 UTC (LIBOR + 2.5% annually). No overnight charge for futures CFDs.
          </p>
        </div>
      </section>

      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Why IGFXPRO Indices</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Everything you need to trade indices</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.12]">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <Icon size={18} className="text-violet-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-[14px] font-semibold text-white">{title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.04] bg-[#050b14] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10 rounded-lg border border-amber-400/[0.12] bg-amber-400/[0.04] px-5 py-4">
            <p className="text-[12px] leading-6 text-slate-500">
              <span className="font-semibold text-amber-400/80">Index CFD risk disclosure:</span>{" "}
              Index CFDs are leveraged instruments. You can lose more than your initial deposit if your position moves against you,
              unless you have negative balance protection. ESMA retail leverage limit for indices is 20:1.
              Past performance of an index does not guarantee future results. Cash CFDs track the underlying cash index price;
              futures CFDs track quarterly contracts and may include roll costs.
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white">Start trading global indices</h2>
            <p className="mt-3 text-[14px] text-slate-500">S&P 500, DAX, Nasdaq and 20+ more — all in one terminal.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Open live account <ArrowRight size={15} />
              </Link>
              <Link to="/markets/commodities" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-7 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Explore commodities →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
