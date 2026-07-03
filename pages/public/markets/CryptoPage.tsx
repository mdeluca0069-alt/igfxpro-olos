import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Zap, Shield, Clock, Lock } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const CRYPTO = [
  { symbol: "BTCUSD",  name: "Bitcoin",       spread: "$15",  leverage: "2:1", margin: "50%", contract: "1 BTC",     hours: "24/7", min: "0.001 BTC" },
  { symbol: "ETHUSD",  name: "Ethereum",      spread: "$5",   leverage: "2:1", margin: "50%", contract: "1 ETH",     hours: "24/7", min: "0.01 ETH"  },
  { symbol: "LTCUSD",  name: "Litecoin",      spread: "$0.50",leverage: "2:1", margin: "50%", contract: "1 LTC",     hours: "24/7", min: "0.1 LTC"   },
  { symbol: "XRPUSD",  name: "XRP",           spread: "$0.005",leverage:"2:1", margin: "50%", contract: "1,000 XRP", hours: "24/7", min: "10 XRP"    },
  { symbol: "ADAUSD",  name: "Cardano",       spread: "$0.003",leverage:"2:1", margin: "50%", contract: "1,000 ADA", hours: "24/7", min: "10 ADA"    },
  { symbol: "SOLUSD",  name: "Solana",        spread: "$0.10",leverage: "2:1", margin: "50%", contract: "1 SOL",     hours: "24/7", min: "0.1 SOL"   },
  { symbol: "DOTUSD",  name: "Polkadot",      spread: "$0.02",leverage: "2:1", margin: "50%", contract: "1 DOT",     hours: "24/7", min: "1 DOT"     },
  { symbol: "LINKUSD", name: "Chainlink",     spread: "$0.05",leverage: "2:1", margin: "50%", contract: "1 LINK",    hours: "24/7", min: "1 LINK"    },
];

const FEATURES = [
  { icon: Clock,   title: "24/7 markets",          body: "Crypto CFDs trade around the clock, including weekends. No market gaps, no overnight closures. OLOS monitors all hours." },
  { icon: Shield,  title: "2:1 ESMA leverage",     body: "ESMA caps crypto leverage at 2:1 for retail clients. Higher leverage available to elective professional clients upon eligibility assessment." },
  { icon: Zap,     title: "Cash-settled CFDs",     body: "No wallets, no private keys, no blockchain fees. Positions are settled in USD. Profit from both rising and falling markets." },
  { icon: Lock,    title: "Negative balance protection", body: "Your losses are capped at your account balance. Mandatory under ESMA. No hidden margin calls beyond your deposit." },
  { icon: CheckCircle, title: "Institutional pricing", body: "IGFXPRO sources crypto prices from 5 major reference exchanges. Volume-weighted mid-price ensures fair execution." },
  { icon: ArrowRight,  title: "OLOS on-chain signals", body: "OLOS analyses on-chain flow metrics, exchange reserve changes, funding rates, and whale wallet movements for signal generation." },
];

export default function CryptoPage() {
  return (
    <PublicLayout>

      <section className="relative overflow-hidden bg-[#030712] py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[0.04] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Cryptocurrency</span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Crypto CFDs.<br />
              <span className="text-orange-400">24/7 execution.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-slate-400">
              Trade Bitcoin, Ethereum, and 8+ major cryptocurrencies as CFDs with no wallet required.
              2:1 ESMA leverage. Cash-settled. Negative balance protection enforced.
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
              { v: "$15",  u: "spread from",   n: "BTCUSD typical" },
              { v: "2:1",  u: "max leverage",  n: "ESMA retail cap" },
              { v: "10+",  u: "crypto pairs",  n: "BTC, ETH + altcoins" },
              { v: "24/7", u: "trading hours", n: "no market close" },
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
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Crypto trading conditions</h2>
            <p className="mt-3 text-[14px] text-slate-500">
              Spreads are typical values. Crypto markets can widen significantly during high-volatility events and weekend low-liquidity periods.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr_1fr_1fr] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
              {["Symbol", "Asset", "Spread (USD)", "Leverage", "Margin", "Contract", "Min Trade"].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{h}</span>
              ))}
            </div>
            {CRYPTO.map((row, i) => (
              <div key={row.symbol} className={`grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr_1fr_1fr] gap-2 border-b border-white/[0.03] px-5 py-3.5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                <span className="text-[13px] font-bold text-orange-400">{row.symbol}</span>
                <span className="text-[13px] font-semibold text-white">{row.name}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{row.spread}</span>
                <span className="text-[13px] tabular-nums text-cyan-400">{row.leverage}</span>
                <span className="text-[13px] tabular-nums text-rose-400">{row.margin}</span>
                <span className="text-[12px] text-slate-400">{row.contract}</span>
                <span className="text-[12px] text-slate-500">{row.min}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-600">
            * 50% margin requirement reflects the ESMA 2:1 leverage cap. Financing charge: 0.04% per day on open positions (long and short).
            No swap differential — flat daily charge applies uniformly.
          </p>
        </div>
      </section>

      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Features</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Trade crypto the institutional way</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.12]">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <Icon size={18} className="text-orange-400" strokeWidth={1.5} />
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
              <span className="font-semibold text-amber-400/80">Cryptocurrency risk disclosure:</span>{" "}
              Cryptocurrency CFDs are extremely high-risk instruments. Prices can move 20–50% in a single day.
              ESMA caps retail crypto leverage at 2:1. Despite leverage limits, you can still lose your entire deposited amount.
              Crypto markets operate 24/7, including periods of very low liquidity when spreads widen significantly.
              Past performance of any cryptocurrency does not indicate future results.
              IGFXPRO does not hold or custody any cryptocurrency on your behalf — all positions are cash-settled CFDs.
            </p>
          </div>
          <div className="text-center">
            <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white">Trade crypto 24/7</h2>
            <p className="mt-3 text-[14px] text-slate-500">Bitcoin, Ethereum, and 8+ altcoins — no wallet, no keys, pure execution.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Open live account <ArrowRight size={15} />
              </Link>
              <Link to="/markets/equities" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-7 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Explore equities →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
