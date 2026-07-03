import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, Bot, Globe, Lock, CheckCircle } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const MILESTONES = [
  { year: "2020", event: "IGFXPRO founded", detail: "Founded in London with a mission to build institutional-grade trading infrastructure accessible to professional traders worldwide." },
  { year: "2021", event: "OLOS v1 launched", detail: "First iteration of the OLOS intelligence layer deployed. Initial signal models covering EUR/USD, GBP/USD, and XAU/USD." },
  { year: "2022", event: "ESMA compliance framework", detail: "Full MiFID II compliance framework implemented. ESMA leverage caps enforced across all retail accounts." },
  { year: "2023", event: "iTrader terminal released", detail: "iTrader web terminal launched with Level 2 DOM, LightweightCharts v5 integration, and OLOS signal overlays." },
  { year: "2024", event: "OLOS v3 — 12 AI models", detail: "OLOS expanded to 12 concurrent AI models covering all asset classes. Autopilot launched with governance framework." },
  { year: "2025", event: "Institutional platform", detail: "Full institutional stack available: multi-tenant infrastructure, AML screening, KYC portal, compliance audit trail, and OLOS v4." },
];

const PRINCIPLES = [
  { icon: Shield,    title: "Compliance first",       body: "Every component is designed with regulatory compliance as a first-class requirement. ESMA, MiFID II, and GDPR are not afterthoughts." },
  { icon: Zap,       title: "Speed as a feature",     body: "Sub-5ms execution through the OLOS engine. Latency is a competitive advantage. We invest in infrastructure to maintain it." },
  { icon: Bot,       title: "AI with accountability", body: "OLOS signals are fully explainable. Confidence scores, factor breakdowns, and decision traces. No black-box AI." },
  { icon: Globe,     title: "Global reach",           body: "10,000+ instruments across 6 asset classes. 60+ currency pairs, 20+ indices, major commodities, crypto, and equities." },
  { icon: Lock,      title: "Security by design",     body: "TLS 1.3, RS256 JWT, httpOnly cookies, memory-only access tokens, zero-trust internal architecture." },
  { icon: CheckCircle,title: "Client protection",    body: "Negative balance protection, segregated client funds, ESMA leverage caps, and transparent pricing. Clients come first." },
];

const TEAM = [
  { name: "Alessandro M.",   role: "Chief Executive Officer",        background: "Former VP at Goldman Sachs Electronic Trading. 15 years in institutional FX infrastructure." },
  { name: "Dr. Sarah K.",    role: "Chief Technology Officer",       background: "PhD in Machine Learning (UCL). Built AI systems at Citadel. Led OLOS architecture design." },
  { name: "Marco D.",        role: "Chief Risk Officer",             background: "20 years in FX risk management at Deutsche Bank and Barclays. ESMA framework architect." },
  { name: "Isabelle F.",     role: "Head of Compliance",            background: "Former FCA examiner. MiFID II and AMLD specialist. Leads regulatory relationships." },
  { name: "Thomas H.",       role: "Head of Quantitative Research", background: "Quant researcher. Built signal generation models for hedge funds. Designed OLOS signal engine." },
  { name: "Priya N.",        role: "Head of Product",               background: "Former product lead at Interactive Brokers. Designed iTrader terminal UX/UX architecture." },
];

export default function AboutPage() {
  return (
    <PublicLayout>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#030712] py-28 lg:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.04] blur-[140px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">About IGFXPRO</span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Built by traders.<br />
              <span className="text-cyan-400">Governed by intelligence.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-8 text-slate-400">
              IGFXPRO was founded with a single conviction: the technology gap between institutional and professional
              retail traders should not exist. OLOS is our answer — an operating system that brings institutional
              intelligence, speed, and governance to every trade.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "2020",     u: "Founded",           n: "London, UK" },
              { v: "10,000+",  u: "Instruments",       n: "across 6 asset classes" },
              { v: "12",       u: "AI models",         n: "in OLOS v4 production" },
              { v: "< 5ms",    u: "Execution",         n: "OLOS matching engine" },
            ].map(({ v, u, n }) => (
              <div key={n} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-5">
                <p className="text-[26px] font-bold tabular-nums tracking-[-0.03em] text-white">{v}</p>
                <p className="mt-0.5 text-[13px] font-medium text-slate-300">{u}</p>
                <p className="mt-1 text-[11px] text-slate-600">{n}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Our Mission</span>
              <h2 className="mt-4 text-[36px] font-bold leading-[1.15] tracking-[-0.025em] text-white">
                Democratise institutional infrastructure — without compromising compliance.
              </h2>
              <p className="mt-5 text-[15px] leading-8 text-slate-400">
                Institutional brokers spend hundreds of millions building proprietary risk engines, AI signal systems,
                and compliance infrastructure. IGFXPRO makes that infrastructure available to professional traders
                through one unified platform — governed by OLOS.
              </p>
              <p className="mt-4 text-[14px] leading-7 text-slate-500">
                We believe that access to institutional-grade technology should not be reserved for tier-1 banks.
                Any professional trader, regardless of account size, deserves execution quality, risk transparency,
                and AI intelligence that was previously available only to hedge funds and market makers.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { label: "Regulatory framework", value: "ESMA / MiFID II" },
                { label: "Data protection",       value: "GDPR + UK GDPR" },
                { label: "Client funds",          value: "Fully segregated" },
                { label: "Order execution",       value: "OLOS principal" },
                { label: "AI transparency",       value: "100% explainable" },
                { label: "Audit trail",           value: "Microsecond precision" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#030912] px-5 py-3.5">
                  <span className="text-[13px] text-slate-400">{label}</span>
                  <span className="text-[13px] font-semibold text-cyan-400">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Our Principles</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">What we stand for</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
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

      {/* Timeline */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">History</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Our journey</h2>
          </div>
          <div className="relative">
            <div className="absolute left-[68px] top-0 h-full w-px bg-white/[0.06]" />
            <div className="space-y-8">
              {MILESTONES.map(({ year, event, detail }) => (
                <div key={year} className="flex gap-8">
                  <div className="relative z-10 flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-[#030912] text-[13px] font-bold text-cyan-400">
                    {year}
                  </div>
                  <div className="pt-1.5">
                    <p className="text-[15px] font-semibold text-white">{event}</p>
                    <p className="mt-1.5 text-[13px] leading-6 text-slate-500">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Leadership</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">The team behind OLOS</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map(({ name, role, background }) => (
              <div key={name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[15px] font-bold text-slate-300">
                  {name[0]}
                </div>
                <p className="text-[15px] font-semibold text-white">{name}</p>
                <p className="mt-0.5 text-[12px] font-medium text-cyan-400/80">{role}</p>
                <p className="mt-3 text-[12px] leading-5 text-slate-500">{background}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.04] bg-[#050b14] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8 text-center">
          <h2 className="text-[32px] font-bold tracking-[-0.02em] text-white">Ready to trade with OLOS?</h2>
          <p className="mt-4 text-[15px] text-slate-500">Join professionals who trust IGFXPRO for institutional execution.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
              Open live account <ArrowRight size={15} />
            </Link>
            <Link to="/contact" className="inline-flex items-center rounded-lg border border-white/10 px-7 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
              Contact us →
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
