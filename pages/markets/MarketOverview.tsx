/**
 * IGFXPRO — Market Overview Page
 * Professional landing for all tradeable asset classes
 */
import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, BarChart2, TrendingUp, Globe,
  DollarSign, Cpu, Shield, Zap, ChevronRight,
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { apiGet } from "../../shared/lib/apiHelpers";

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

function InView({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} className={className} variants={fadeUp} initial="hidden" animate={seen ? "visible" : "hidden"}>
      {children}
    </motion.div>
  );
}

type Quote = { symbol: string; bid: number; ask: number; mid: number; spread: number; changePct: number };

const ASSET_CLASSES = [
  {
    name: "Forex", desc: "Trade 60+ major, minor, and exotic currency pairs with institutional spreads from 0.6 pips.", href: "/markets/forex",
    color: "text-blue-400",    bg: "bg-blue-400/[0.05]",    border: "border-blue-400/20",    Icon: Globe,
    stats: [{ l: "Pairs", v: "60+" }, { l: "Spread from", v: "0.6 pips" }, { l: "Max lev", v: "1:30" }],
    symbols: [{ s: "EURUSD", d: 5 }, { s: "GBPUSD", d: 5 }, { s: "USDJPY", d: 3 }],
  },
  {
    name: "Indices", desc: "Access global indices — US500, US100, DE40, UK100 and more with tight spreads.", href: "/markets/indices",
    color: "text-violet-400",  bg: "bg-violet-400/[0.05]",  border: "border-violet-400/20",  Icon: BarChart2,
    stats: [{ l: "Indices", v: "20+" }, { l: "Spread from", v: "0.4 pts" }, { l: "Max lev", v: "1:20" }],
    symbols: [{ s: "US500", d: 1 }, { s: "US100", d: 1 }, { s: "DE40", d: 1 }],
  },
  {
    name: "Commodities", desc: "Gold, silver, oil, natural gas. Hedge against inflation with real assets.", href: "/markets/commodities",
    color: "text-amber-400",   bg: "bg-amber-400/[0.05]",   border: "border-amber-400/20",   Icon: DollarSign,
    stats: [{ l: "Markets", v: "15+" }, { l: "Gold spread", v: "$0.25" }, { l: "Max lev", v: "1:10" }],
    symbols: [{ s: "XAUUSD", d: 2 }, { s: "WTI", d: 2 }, { s: "BRENT", d: 2 }],
  },
  {
    name: "Crypto", desc: "Bitcoin, Ethereum, and top altcoins. 24/7 trading with OLOS AI signals on all majors.", href: "/markets/crypto",
    color: "text-orange-400",  bg: "bg-orange-400/[0.05]",  border: "border-orange-400/20",  Icon: Cpu,
    stats: [{ l: "Coins", v: "30+" }, { l: "BTC spread", v: "$50" }, { l: "Max lev", v: "1:5" }],
    symbols: [{ s: "BTCUSD", d: 0 }, { s: "ETHUSD", d: 2 }, { s: "SOLUSD", d: 2 }],
  },
  {
    name: "Equities", desc: "Trade CFDs on Apple, Tesla, NVIDIA, Amazon and 1,000+ stocks from US and EU markets.", href: "/markets/equities",
    color: "text-emerald-400", bg: "bg-emerald-400/[0.05]", border: "border-emerald-400/20", Icon: TrendingUp,
    stats: [{ l: "Stocks", v: "1,000+" }, { l: "Spread from", v: "0.1%" }, { l: "Max lev", v: "1:5" }],
    symbols: [{ s: "AAPL", d: 2 }, { s: "NVDA", d: 2 }, { s: "TSLA", d: 2 }],
  },
];

function MiniQuote({ symbol, digits }: { symbol: string; digits: number }) {
  const { data: quotes } = useQuery<Quote[]>({
    queryKey: ["pub-quotes-market"],
    queryFn: async () => { try { return await apiGet<Quote[]>("/api/v1/trading/quotes"); } catch { return []; } },
    refetchInterval: 3_000,
    staleTime: 2_000,
  });
  const q = quotes?.find(q => q.symbol === symbol);
  const pos = (q?.changePct ?? 0) >= 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-slate-400">{symbol}</span>
      {q ? (
        <div className="text-right">
          <p className="font-mono text-[12px] font-black text-white">{q.mid.toFixed(digits)}</p>
          <p className={`text-[10px] font-bold ${pos ? "text-emerald-400" : "text-rose-400"}`}>
            {pos ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%
          </p>
        </div>
      ) : (
        <div className="h-6 w-16 animate-pulse rounded bg-slate-800/60" />
      )}
    </div>
  );
}

export default function MarketOverview() {
  usePageTitle("Markets — IGFXPRO");
  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/[0.04] bg-[#030712] py-20">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.04] blur-[120px]" />
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <InView>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">Live markets</span>
            </div>
          </InView>
          <InView>
            <h1 className="text-[48px] font-black leading-[1.08] tracking-[-0.04em] text-white lg:text-[60px]">
              10,000+ instruments.
              <br />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">One platform.</span>
            </h1>
          </InView>
          <InView>
            <p className="mt-5 max-w-xl text-[16px] leading-8 text-slate-400">
              Trade Forex, Indices, Commodities, Crypto, and Equities with institutional spreads,
              sub-5ms execution, and OLOS AI signals across every market.
            </p>
          </InView>
          <InView>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-[14px] font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.3)] transition hover:bg-cyan-300">
                Start trading free <ArrowRight size={16} />
              </Link>
              <Link to="/trading" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3.5 text-[14px] font-bold text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.07]">
                Open terminal
              </Link>
            </div>
          </InView>
          <InView>
            <div className="mt-10 flex flex-wrap gap-6">
              {[
                { icon: Shield, text: "ESMA regulated"  },
                { icon: Zap,    text: "< 5ms execution" },
                { icon: Globe,  text: "190+ countries"  },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-slate-500">
                  <Icon size={13} className="text-cyan-400/70" strokeWidth={1.5} />
                  <span className="text-[12px] font-medium">{text}</span>
                </div>
              ))}
            </div>
          </InView>
        </div>
      </div>

      {/* Asset class grid */}
      <div className="mx-auto max-w-[1200px] px-6 py-16 lg:px-8">
        <InView>
          <h2 className="mb-10 text-[32px] font-black tracking-[-0.03em] text-white">Choose your market</h2>
        </InView>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {ASSET_CLASSES.map(({ name, desc, href, color, bg, border, Icon, stats, symbols }) => (
            <motion.div key={name} variants={fadeUp}>
              <Link to={href}
                className={`group block rounded-2xl border ${border} ${bg} p-6 transition-all hover:border-opacity-50 hover:shadow-lg`}
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                    <Icon size={20} className={color} strokeWidth={1.5} />
                  </div>
                  <ChevronRight size={16} className={`${color} opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100`} />
                </div>
                <h3 className={`text-[20px] font-black ${color}`}>{name}</h3>
                <p className="mt-1.5 text-[12px] leading-5 text-slate-500">{desc}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {stats.map(({ l, v }) => (
                    <div key={l} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2 text-center">
                      <p className="text-[13px] font-black text-white">{v}</p>
                      <p className="text-[9px] text-slate-600">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 border-t border-white/[0.05] pt-4">
                  {symbols.map(({ s, d }) => <MiniQuote key={s} symbol={s} digits={d} />)}
                </div>
              </Link>
            </motion.div>
          ))}

          {/* CTA card */}
          <motion.div variants={fadeUp}
            className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-gradient-to-br from-cyan-400/[0.05] to-blue-400/[0.03] p-8 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
              <Zap size={24} className="text-cyan-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-[18px] font-black text-white">All markets in one terminal</h3>
            <p className="mt-2 text-[12px] leading-5 text-slate-500">
              Switch between all asset classes instantly in iTrader. One account, one platform.
            </p>
            <Link to="/trading"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-[12px] font-black text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300">
              Launch terminal <ArrowRight size={13} />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
