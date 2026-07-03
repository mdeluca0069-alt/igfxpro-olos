import { ArrowRight, Code, BarChart2, Shield, Bot, Globe } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const OPEN_ROLES = [
  { title: "Senior Backend Engineer — OLOS Core",      dept: "Engineering",  location: "London / Remote",  type: "Full-time", skills: ["Rust", "TypeScript", "PostgreSQL", "Kafka"], desc: "Build and scale the OLOS matching engine and risk systems. Own the core execution pipeline that processes millions of orders per day." },
  { title: "ML Engineer — Signal Generation",           dept: "Quantitative", location: "London",           type: "Full-time", skills: ["Python", "PyTorch", "Time-series ML", "FinRL"], desc: "Develop, train, and deploy new OLOS signal models. Work with financial time-series data, alternative data feeds, and RLHF fine-tuning." },
  { title: "Frontend Engineer — iTrader Terminal",      dept: "Engineering",  location: "London / Remote",  type: "Full-time", skills: ["React", "TypeScript", "TradingView", "WebSocket"], desc: "Build the next generation of iTrader. Real-time charting, OLOS signal overlays, DOM trading, and mobile responsiveness." },
  { title: "Quantitative Researcher — Market Structure",dept: "Quantitative", location: "London",           type: "Full-time", skills: ["Python", "R", "Market microstructure", "Options pricing"], desc: "Research market microstructure, execution quality, and alpha-generating factor models for OLOS enhancement." },
  { title: "Compliance Manager — MiFID II",             dept: "Compliance",   location: "London",           type: "Full-time", skills: ["MiFID II", "AMLD", "ESMA", "FCA"], desc: "Own IGFXPRO's regulatory compliance framework. Maintain MiFID II reporting, ESMA product intervention compliance, and AML programme." },
  { title: "DevOps / SRE Engineer",                     dept: "Infrastructure",location: "Remote",          type: "Full-time", skills: ["Kubernetes", "AWS", "Terraform", "Prometheus"], desc: "Maintain 99.99% uptime for the OLOS infrastructure. Design and operate the resilient, low-latency architecture powering IGFXPRO." },
  { title: "Product Designer — Trading UX",             dept: "Product",      location: "London / Remote",  type: "Full-time", skills: ["Figma", "Trading UX", "Data visualisation", "Design systems"], desc: "Design intuitive trading interfaces that make institutional complexity accessible. Work closely with traders and engineers." },
  { title: "AML Analyst",                               dept: "Compliance",   location: "London",           type: "Full-time", skills: ["AML", "KYC", "Sanctions screening", "Transaction monitoring"], desc: "Conduct client due diligence, monitor transactions for suspicious activity, and manage the AML alert workflow." },
];

const BENEFITS = [
  { icon: Code,      title: "Cutting-edge tech stack",  body: "Work with Rust, TypeScript, Kafka, Kubernetes, PyTorch, and LightweightCharts on problems that matter in real markets." },
  { icon: BarChart2, title: "Direct market impact",     body: "Your code executes on real trades. OLOS signals are acted upon by professionals. You will see your work matter in production." },
  { icon: Shield,    title: "Institutional standards",  body: "Operate to MiFID II, ESMA, and GDPR standards. Build career experience valued by top banks, hedge funds, and regulators." },
  { icon: Bot,       title: "AI-first environment",     body: "OLOS is not a bolt-on. AI is the core product. Deep ML work alongside quant researchers with hedge fund backgrounds." },
  { icon: Globe,     title: "Remote-friendly",          body: "Engineering and product roles can be performed remotely. We have offices in London for those who prefer in-person collaboration." },
  { icon: ArrowRight,title: "Competitive package",      body: "Salary benchmarked to the 75th percentile of London fintech market. Equity participation, pension contribution, and healthcare." },
];

const DEPT_COLORS: Record<string, string> = {
  Engineering:    "text-blue-400 bg-blue-400/10",
  Quantitative:   "text-violet-400 bg-violet-400/10",
  Compliance:     "text-amber-400 bg-amber-400/10",
  Infrastructure: "text-cyan-400 bg-cyan-400/10",
  Product:        "text-emerald-400 bg-emerald-400/10",
};

export default function CareersPage() {
  return (
    <PublicLayout>

      <section className="relative overflow-hidden bg-[#030712] py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.04] blur-[140px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Careers at IGFXPRO</span>
            <h1 className="mt-4 text-[48px] font-bold leading-[1.1] tracking-[-0.03em] text-white">
              Build the operating system<br />
              <span className="text-cyan-400">of institutional trading.</span>
            </h1>
            <p className="mt-6 text-[16px] leading-8 text-slate-400">
              We're a small team building infrastructure that competes with the technology stacks of major banks.
              Every engineer, quant, and compliance professional at IGFXPRO works on problems with direct
              market impact. If you want your work to matter, join us.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {OPEN_ROLES.length} open positions · London & Remote
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Why IGFXPRO</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">What we offer</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
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

      {/* Open roles */}
      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Open Positions</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Join the team</h2>
          </div>
          <div className="space-y-4">
            {OPEN_ROLES.map(({ title, dept, location, type, skills, desc }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.12]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[16px] font-semibold text-white">{title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${DEPT_COLORS[dept] ?? "text-slate-400 bg-slate-400/10"}`}>{dept}</span>
                      <span className="text-[12px] text-slate-500">·</span>
                      <span className="text-[12px] text-slate-500">{location}</span>
                      <span className="text-[12px] text-slate-500">·</span>
                      <span className="text-[12px] text-slate-500">{type}</span>
                    </div>
                  </div>
                  <a
                    href={`mailto:careers@igfxpro.com?subject=${encodeURIComponent("Application: " + title)}`}
                    className="shrink-0 rounded-lg border border-white/[0.1] px-4 py-2 text-[13px] font-medium text-slate-300 transition hover:border-white/[0.2] hover:text-white"
                  >
                    Apply
                  </a>
                </div>
                <p className="mt-4 text-[13px] leading-6 text-slate-500">{desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <span key={skill} className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-mono text-slate-400">{skill}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Speculative */}
      <section className="border-t border-white/[0.04] bg-[#050b14] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="rounded-xl border border-white/[0.06] bg-[#030912] p-8 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div>
              <p className="text-[18px] font-semibold text-white">Don't see a role that fits?</p>
              <p className="mt-2 text-[13px] text-slate-500">
                We hire exceptionally talented people regardless of whether a role is listed.
                If you believe you can make OLOS better, send us your CV and a note on how.
              </p>
            </div>
            <a
              href="mailto:careers@igfxpro.com?subject=Speculative%20Application"
              className="mt-6 shrink-0 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3 text-[13px] font-semibold text-slate-950 transition hover:bg-cyan-300 sm:mt-0"
            >
              Send speculative CV <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
