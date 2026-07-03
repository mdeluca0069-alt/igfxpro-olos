import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Zap, Shield, TrendingUp, Globe, Database } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const COMMODITIES = [
  { symbol: "XAUUSD", name: "Gold",          category: "Metal",  spread: "0.25", leverage: "10:1", margin: "10%", contract: "100 troy oz", pip: "$1",   hours: "Mon–Fri 23:00–22:00 UTC" },
  { symbol: "XAGUSD", name: "Silver",        category: "Metal",  spread: "0.03", leverage: "10:1", margin: "10%", contract: "5,000 troy oz",pip: "$5",   hours: "Mon–Fri 23:00–22:00 UTC" },
  { symbol: "XPTUSD", name: "Platinum",      category: "Metal",  spread: "1.50", leverage: "10:1", margin: "10%", contract: "50 troy oz",   pip: "$0.50",hours: "Mon–Fri 23:00–22:00 UTC" },
  { symbol: "WTI",    name: "Crude Oil WTI", category: "Energy", spread: "0.03", leverage: "10:1", margin: "10%", contract: "1,000 barrels", pip: "$10",  hours: "Mon–Fri 23:00–22:00 UTC" },
  { symbol: "BRENT",  name: "Crude Oil Brent",category:"Energy", spread: "0.04", leverage: "10:1", margin: "10%", contract: "1,000 barrels", pip: "$10",  hours: "Mon–Fri 23:00–22:00 UTC" },
  { symbol: "NGAS",   name: "Natural Gas",   category: "Energy", spread: "0.004",leverage: "10:1", margin: "10%", contract: "10,000 MMBtu",  pip: "$10",  hours: "Mon–Fri 23:00–22:00 UTC" },
  { symbol: "CORN",   name: "Corn",          category: "Agri",   spread: "0.50", leverage: "10:1", margin: "10%", contract: "5,000 bushels", pip: "$12.50",hours:"Mon–Fri 14:30–21:20 UTC" },
  { symbol: "WHEAT",  name: "Wheat",         category: "Agri",   spread: "0.75", leverage: "10:1", margin: "10%", contract: "5,000 bushels", pip: "$12.50",hours:"Mon–Fri 14:30–21:20 UTC" },
];

const FEATURES = [
  { icon: Shield,    title: "10:1 ESMA leverage",       body: "Retail clients access commodities at up to 10:1 leverage. Position sizing enforced with automatic margin monitoring and stop-out at 50%." },
  { icon: TrendingUp,title: "OLOS macro correlation",   body: "OLOS tracks USD-index correlation, geopolitical risk scores, OPEC calendar, and inventory report scheduling for energy signals." },
  { icon: Zap,       title: "Tight raw spreads",        body: "Gold from 0.25 USD/oz, WTI crude from 0.03 USD/bbl. Spreads widen during NYMEX settlement windows (14:28–14:30 UTC)." },
  { icon: Globe,     title: "No physical delivery",     body: "All commodity positions are cash-settled CFDs. No storage costs, no delivery obligations, no warehouse receipts." },
  { icon: Database,  title: "Economic calendar integration", body: "Terminal auto-highlights EIA inventory reports, USDA crop reports, and OPEC meetings. OLOS activates event shields pre-report." },
  { icon: CheckCircle,title: "Overnight financing",    body: "Transparent swap rates published daily. Precious metals carry rates based on LIBOR + broker spread. Energy CFDs use roll-adjusted prices." },
];

export default function CommoditiesPage() {
  return (
    <PublicLayout>

      <section className="relative overflow-hidden bg-[#030712] py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.04] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Commodities</span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Gold, oil, energy.<br />
              <span className="text-amber-400">Precision pricing.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-slate-400">
              Trade precious metals, crude oil, natural gas, and agricultural commodities as cash-settled CFDs.
              OLOS macro intelligence monitors inventory reports, geopolitical risk, and USD correlations in real time.
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
              { v: "$0.25", u: "spread from",   n: "XAUUSD (gold)" },
              { v: "10:1",  u: "max leverage",  n: "all commodities" },
              { v: "8",     u: "commodities",   n: "metals + energy + agri" },
              { v: "< 5",   u: "ms execution",  n: "OLOS engine" },
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
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Commodity trading conditions</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <div className="grid grid-cols-[1fr_1.4fr_1fr_1fr_1fr_1fr_1.5fr] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
              {["Symbol", "Name", "Category", "Spread", "Leverage", "Margin", "Trading Hours (UTC)"].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{h}</span>
              ))}
            </div>
            {COMMODITIES.map((row, i) => (
              <div key={row.symbol} className={`grid grid-cols-[1fr_1.4fr_1fr_1fr_1fr_1fr_1.5fr] gap-2 border-b border-white/[0.03] px-5 py-3.5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                <span className="text-[13px] font-bold text-amber-400">{row.symbol}</span>
                <span className="text-[13px] font-semibold text-white">{row.name}</span>
                <span className={`text-[11px] font-semibold ${
                  row.category === "Metal" ? "text-yellow-400" :
                  row.category === "Energy" ? "text-orange-400" : "text-green-400"
                }`}>{row.category}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{row.spread}</span>
                <span className="text-[13px] tabular-nums text-cyan-400">{row.leverage}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{row.margin}</span>
                <span className="text-[11px] text-slate-500">{row.hours}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-600">
            * Contract sizes above are standard lots. Micro lots (0.01) available for metals and energy.
            COMEX gold settlement (13:30 UTC) and NYMEX crude settlement (14:30 UTC) may cause temporary spread widening.
          </p>
        </div>
      </section>

      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Features</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Professional commodity trading</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.12]">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <Icon size={18} className="text-amber-400" strokeWidth={1.5} />
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
              <span className="font-semibold text-amber-400/80">Commodity CFD risk disclosure:</span>{" "}
              Commodity prices can be highly volatile due to weather, geopolitical events, supply-demand imbalances,
              and macroeconomic shifts. ESMA retail leverage limit for commodities is 10:1.
              Energy markets may experience significant price gaps around OPEC announcements and EIA inventory reports.
              IGFXPRO enforces negative balance protection on all commodity positions.
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white">Trade commodities with confidence</h2>
            <p className="mt-3 text-[14px] text-slate-500">Gold, crude oil, natural gas — institutional execution, OLOS macro intelligence.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Open live account <ArrowRight size={15} />
              </Link>
              <Link to="/markets/crypto" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-7 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Explore crypto →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
