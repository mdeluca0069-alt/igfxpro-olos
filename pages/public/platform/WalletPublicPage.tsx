import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, Landmark, Shield, Zap, Lock, CheckCircle, Clock, RefreshCw } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const DEPOSIT_METHODS = [
  { method: "Bank Transfer (SEPA)",    min: "€100",  max: "€500,000", time: "1–2 business days", fee: "Free",      icon: Landmark },
  { method: "Bank Transfer (SWIFT)",   min: "€500",  max: "€1,000,000",time: "2–4 business days", fee: "€15 flat",  icon: Landmark },
  { method: "Visa / Mastercard",       min: "€10",   max: "€50,000",  time: "Instant",            fee: "Free",      icon: CreditCard },
  { method: "Maestro / Debit Card",    min: "€10",   max: "€25,000",  time: "Instant",            fee: "Free",      icon: CreditCard },
];

const FEATURES = [
  { icon: Shield,    title: "Segregated client funds",  body: "Your funds are held in segregated accounts separate from IGFXPRO's operating capital. Client money is ring-fenced and protected under MiFID II Client Money Rules." },
  { icon: Zap,       title: "Instant card deposits",    body: "Credit and debit card deposits are credited to your trading account instantly. Start trading immediately after deposit confirmation." },
  { icon: Lock,      title: "AML-compliant withdrawals",body: "Withdrawals are returned to the original payment method. This AML requirement ensures funds flow back to their verified source." },
  { icon: Clock,     title: "Fast withdrawal processing",body: "Withdrawal requests are processed within 1 business day. Bank arrival time depends on your bank (1–3 additional days for SEPA, 2–4 for SWIFT)." },
  { icon: RefreshCw, title: "Multi-currency accounts",  body: "Account base currency in EUR, USD, or GBP. IGFXPRO converts deposits in other currencies at the interbank rate + 0.5% conversion fee." },
  { icon: CheckCircle,title: "No hidden fees",          body: "IGFXPRO charges no deposit fees on cards or SEPA transfers. Inactivity fee of €10/month applies after 6 months with no platform login." },
];

export default function WalletPublicPage() {
  return (
    <PublicLayout>

      <section className="relative overflow-hidden bg-[#030712] py-28 lg:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.03] blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Account Funding</span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Deposits and withdrawals.<br />
              <span className="text-cyan-400">Fast and secure.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-8 text-slate-400">
              Fund your IGFXPRO account via bank transfer or card. Minimum deposit €10.
              Client funds are fully segregated under MiFID II. No withdrawal fees.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Open account <ArrowRight size={15} />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Sign in to deposit
              </Link>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "€10",    u: "minimum deposit",   n: "card payments"        },
              { v: "€100",   u: "minimum deposit",   n: "bank transfer"        },
              { v: "1 day",  u: "withdrawal process",n: "business days"        },
              { v: "0",      u: "deposit fees",      n: "SEPA & card"          },
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

      {/* Deposit methods */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Deposit Methods</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">How to fund your account</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/[0.06] bg-white/[0.02] px-6 py-3">
              {["Payment Method", "Minimum", "Maximum", "Processing Time", "Fee"].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{h}</span>
              ))}
            </div>
            {DEPOSIT_METHODS.map(({ method, min, max, time, fee, icon: Icon }, i) => (
              <div key={method} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/[0.03] px-6 py-4 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className="shrink-0 text-slate-500" strokeWidth={1.5} />
                  <span className="text-[13px] font-semibold text-white">{method}</span>
                </div>
                <span className="text-[13px] tabular-nums text-slate-300">{min}</span>
                <span className="text-[13px] tabular-nums text-slate-300">{max}</span>
                <span className="text-[13px] text-slate-400">{time}</span>
                <span className={`text-[13px] font-semibold ${fee === "Free" ? "text-emerald-400" : "text-slate-300"}`}>{fee}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-600">
            * Deposits must originate from accounts in your name (AML policy). Third-party deposits are not accepted.
            Currency conversion applies to non-base-currency deposits at interbank rate + 0.5%.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Security & Features</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Your funds are protected</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
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

      {/* Withdrawal process */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Withdrawal Process</span>
            <h2 className="mt-3 text-[28px] font-bold tracking-[-0.025em] text-white">How withdrawals work</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Submit request",   desc: "Log in → Wallet → Withdraw. Enter amount and confirm your bank details." },
              { step: "02", title: "IGFXPRO reviews",  desc: "Our finance team reviews the request. AML checks completed within 1 business day." },
              { step: "03", title: "Funds dispatched", desc: "Approved withdrawals are sent same day (if submitted before 14:00 UTC)." },
              { step: "04", title: "Bank receipt",     desc: "SEPA: 1–2 days. SWIFT: 2–4 days. Card refunds: 3–5 days depending on issuer." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="rounded-xl border border-white/[0.06] bg-[#030912] p-5">
                <p className="text-[28px] font-bold tabular-nums text-cyan-400/30">{step}</p>
                <p className="mt-2 text-[14px] font-semibold text-white">{title}</p>
                <p className="mt-2 text-[12px] leading-5 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#030712] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8 text-center">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white">Ready to start trading?</h2>
          <p className="mt-3 text-[14px] text-slate-500">Open an account and deposit from €10 with instant card funding.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
              Open account <ArrowRight size={15} />
            </Link>
            <Link to="/platform/academy" className="inline-flex items-center rounded-lg border border-white/10 px-7 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
              Explore Academy →
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
