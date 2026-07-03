import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, BookOpen, Video, Award, TrendingUp, CheckCircle, Bot } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const PATHS = [
  {
    level: "Foundation",
    color: "text-emerald-400 border-emerald-400/20 bg-emerald-400/[0.06]",
    courses: [
      { title: "What is a CFD?",                  duration: "30 min", desc: "How contracts for difference work, the role of leverage, and why CFDs are popular with professional traders." },
      { title: "Reading a price chart",            duration: "45 min", desc: "Candlestick anatomy, timeframes, trend identification, and support/resistance basics." },
      { title: "Risk before leverage",             duration: "45 min", desc: "Position sizing, drawdown limits, and the mathematics of capital preservation in leveraged markets." },
      { title: "The trading plan",                 duration: "40 min", desc: "How to define entry criteria, risk parameters, and review process before placing any trade." },
    ],
  },
  {
    level: "Intermediate",
    color: "text-cyan-400 border-cyan-400/20 bg-cyan-400/[0.06]",
    courses: [
      { title: "Order lifecycle & execution",      duration: "60 min", desc: "From order ticket to fill — matching engines, slippage, partial fills, and the FIX protocol." },
      { title: "Technical analysis toolkit",       duration: "75 min", desc: "RSI, MACD, Bollinger Bands, Fibonacci, Volume Profile — how to combine indicators correctly." },
      { title: "Fundamental analysis for traders", duration: "60 min", desc: "GDP, CPI, NFP, central bank policy — how macro data moves forex and equity markets." },
      { title: "Risk management systems",          duration: "60 min", desc: "Stop-loss placement, take-profit strategy, trailing stops, and the Kelly Criterion." },
    ],
  },
  {
    level: "Advanced",
    color: "text-violet-400 border-violet-400/20 bg-violet-400/[0.06]",
    courses: [
      { title: "OLOS AI playbook",                 duration: "90 min", desc: "Reading OLOS confidence breakdowns, combining AI signals with manual analysis, and configuring Autopilot." },
      { title: "Market microstructure",            duration: "90 min", desc: "Order book dynamics, DOM trading, volume delta, and institutional order flow interpretation." },
      { title: "Algorithmic trading fundamentals", duration: "75 min", desc: "Strategy backtesting, walk-forward analysis, overfitting traps, and performance metrics." },
      { title: "Portfolio-level risk management",  duration: "90 min", desc: "Correlation, drawdown management, position sizing across a multi-asset portfolio." },
    ],
  },
];

const FEATURES = [
  { icon: Video,       title: "HD video lessons",        body: "All courses include professional video instruction with chapter markers, playback speed control, and full-text transcripts." },
  { icon: BookOpen,    title: "Interactive quizzes",     body: "Each module ends with a knowledge check. Pass all quizzes to progress. Failed questions link back to the relevant lesson section." },
  { icon: Award,       title: "Certificates of completion", body: "Complete a full learning path to receive a digital certificate. Certificates include the course syllabus and your completion date." },
  { icon: TrendingUp,  title: "Live market examples",    body: "Lessons use real historical IGFXPRO market data. Charts and order flow examples from real trading sessions." },
  { icon: Bot,         title: "OLOS integration",        body: "Advanced courses include live OLOS signal analysis. Learn to interpret AI confidence breakdowns alongside traditional analysis." },
  { icon: GraduationCap,title: "Structured learning paths",body: "Progress from Foundation through Intermediate to Advanced. Each path builds on the previous. Track your progress across all courses." },
];

export default function AcademyPublicPage() {
  return (
    <PublicLayout>

      <section className="relative overflow-hidden bg-[#030712] py-28 lg:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/[0.04] blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">IGFXPRO Academy</span>
            <h1 className="mt-4 text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[60px]">
              Learn to trade.<br />
              <span className="text-violet-400">Trade what you learn.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-8 text-slate-400">
              Structured education from first principles to advanced algorithmic strategies.
              12 courses across 3 levels. Built by traders who understand both the theory and the live market.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300">
                Start learning free <ArrowRight size={15} />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-3.5 text-[14px] font-medium text-slate-200 transition hover:bg-white/[0.04]">
                Sign in to continue
              </Link>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "12",    u: "courses",        n: "3 learning levels"    },
              { v: "15+",   u: "hours",          n: "of video content"     },
              { v: "Free",  u: "with account",   n: "no subscription fee"  },
              { v: "Cert",  u: "on completion",  n: "per learning path"    },
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

      {/* Learning paths */}
      {PATHS.map(({ level, color, courses }) => (
        <section key={level} className="border-t border-white/[0.04] bg-[#050b14] py-16">
          <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
            <div className="mb-8 flex items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-[12px] font-bold ${color}`}>{level}</span>
              <h2 className="text-[24px] font-bold tracking-[-0.02em] text-white">{level} path</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {courses.map(({ title, duration, desc }) => (
                <div key={title} className="group rounded-xl border border-white/[0.06] bg-[#030912] p-5 transition hover:border-white/[0.12]">
                  <div className="mb-3 flex items-center justify-between">
                    <BookOpen size={16} className="text-slate-600" />
                    <span className="text-[11px] text-slate-600">{duration}</span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">{desc}</p>
                  <div className="mt-5">
                    <Link to="/register" className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 transition group-hover:text-slate-300">
                      Start module <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Features */}
      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Features</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">How the Academy works</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
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
          <div className="rounded-xl border border-white/[0.06] bg-[#030912] p-8 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div>
              <p className="text-[20px] font-bold text-white">Academy is included with every account</p>
              <p className="mt-2 text-[14px] text-slate-500">
                All 12 courses, certificates, and OLOS integration — free with any IGFXPRO account.
                No subscription. No paywalls.
              </p>
              <ul className="mt-4 space-y-2">
                {["Foundation, Intermediate, and Advanced paths", "Certificates of completion", "Live market examples with OLOS signals", "Progress tracking across all courses"].map(item => (
                  <li key={item} className="flex items-center gap-2 text-[13px] text-slate-400">
                    <CheckCircle size={13} className="shrink-0 text-cyan-400/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link to="/register" className="mt-6 shrink-0 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-[14px] font-semibold text-slate-950 transition hover:bg-cyan-300 sm:mt-0">
              Start learning free <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
