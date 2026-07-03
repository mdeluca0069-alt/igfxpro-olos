/**
 * IGFXPRO — Platform Services
 * All broker services organized by category.
 * This page is the single catalog — Dashboard shows no service listings.
 */
import { Link } from "react-router-dom";
import {
  Activity, BarChart2, Bot, BookOpen, ChevronRight, Code2,
  Globe, Layers, Lock, Monitor, Radio, Shield,
  Sparkles, Target, Wifi, Zap,
} from "lucide-react";
import { useTier } from "../../app/TierProvider";
import { usePageTitle } from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type Service = {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  href?: string;
  tier: "STANDARD" | "GOLD" | "VIP" | "PLATINUM" | "ENTERPRISE";
  badge?: string;
};

type Category = {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  accent: string;
  services: Service[];
};

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = {
  STANDARD: 0, GOLD: 1, VIP: 2, PLATINUM: 3, ENTERPRISE: 4,
};

const TIER_CLS: Record<string, string> = {
  STANDARD:   "border-slate-600   bg-slate-800   text-slate-400",
  GOLD:       "border-amber-400/30 bg-amber-400/10 text-amber-400",
  VIP:        "border-violet-400/30 bg-violet-400/10 text-violet-400",
  PLATINUM:   "border-cyan-400/30  bg-cyan-400/10  text-cyan-400",
  ENTERPRISE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
};

// ─── Service catalogue ────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id:      "trading",
    label:   "Trading",
    desc:    "Execution platforms and live market infrastructure",
    icon:    BarChart2,
    accent:  "text-cyan-400",
    services: [
      {
        id:    "itrader",
        label: "iTrader Terminal",
        desc:  "Proprietary execution terminal — chart, order ticket, L2 book, OLOS overlay, live positions.",
        icon:  BarChart2,
        href:  "/trading?platform=itrader",
        tier:  "STANDARD",
        badge: "LIVE",
      },
      {
        id:    "mt5",
        label: "MT5 Bridge",
        desc:  "MetaTrader 5 with supervised OLOS autopilot, hedge tools and multi-account management.",
        icon:  Monitor,
        href:  "/trading?platform=mt5",
        tier:  "PLATINUM",
        badge: "AI",
      },
      {
        id:    "market-data",
        label: "Live Market Data",
        desc:  "TwelveData feed across 19 instruments — FX, indices, commodities, crypto, equities.",
        icon:  Radio,
        href:  "/overview",
        tier:  "STANDARD",
        badge: "LIVE",
      },
      {
        id:    "depth",
        label: "Market Depth L2",
        desc:  "10-level order book and DOM depth chart with real-time bid/ask pressure visualization.",
        icon:  Layers,
        href:  "/trading",
        tier:  "GOLD",
      },
    ],
  },
  {
    id:      "olos",
    label:   "OLOS AI",
    desc:    "12-engine institutional AI orchestrator",
    icon:    Bot,
    accent:  "text-violet-400",
    services: [
      {
        id:    "signals",
        label: "OLOS Signals",
        desc:  "Confidence-weighted signals with entry, SL, TP levels and market regime classification.",
        icon:  Sparkles,
        href:  "/olos-ai",
        tier:  "VIP",
        badge: "AI",
      },
      {
        id:    "autopilot",
        label: "OLOS Autopilot",
        desc:  "Supervised AI execution with confidence gate, event lock window, full audit trail.",
        icon:  Bot,
        href:  "/olos-ai",
        tier:  "PLATINUM",
        badge: "AI",
      },
      {
        id:    "intelligence",
        label: "OLOS Intelligence",
        desc:  "12-model command center: regime, sentiment, flow, macro, momentum, pattern, liquidity.",
        icon:  Activity,
        href:  "/olos-ai",
        tier:  "VIP",
        badge: "AI",
      },
    ],
  },
  {
    id:      "risk",
    label:   "Risk",
    desc:    "ESMA-compliant protection and risk infrastructure",
    icon:    Shield,
    accent:  "text-emerald-400",
    services: [
      {
        id:    "governor",
        label: "Risk Governor",
        desc:  "Real-time margin monitoring, warning system, kill switch and stop-out enforcement.",
        icon:  Shield,
        href:  "/risk",
        tier:  "STANDARD",
        badge: "LIVE",
      },
      {
        id:    "margin",
        label: "Margin Controls",
        desc:  "ESMA leverage caps by asset class, pre-trade margin calculator, margin level gauge.",
        icon:  Target,
        href:  "/risk",
        tier:  "STANDARD",
      },
      {
        id:    "protection",
        label: "Protection Systems",
        desc:  "Negative balance protection (NBP), stop-out automation, drawdown guard, event shields.",
        icon:  Zap,
        href:  "/risk",
        tier:  "STANDARD",
      },
    ],
  },
  {
    id:      "developer",
    label:   "Developer",
    desc:    "Programmatic access and connectivity",
    icon:    Code2,
    accent:  "text-amber-400",
    services: [
      {
        id:    "rest-api",
        label: "Enterprise REST API",
        desc:  "Full broker REST API with JWT authentication, rate limiting and comprehensive endpoint coverage.",
        icon:  Code2,
        tier:  "ENTERPRISE",
      },
      {
        id:    "websocket",
        label: "WebSocket Feed",
        desc:  "Real-time market quotes, execution events, risk alerts and OLOS signals over WebSocket.",
        icon:  Wifi,
        tier:  "ENTERPRISE",
      },
      {
        id:    "fix",
        label: "FIX Connectivity",
        desc:  "FIX 4.4 protocol access for institutional order routing and execution infrastructure.",
        icon:  Globe,
        tier:  "ENTERPRISE",
      },
    ],
  },
  {
    id:      "education",
    label:   "Education",
    desc:    "Trading knowledge and professional development",
    icon:    BookOpen,
    accent:  "text-pink-400",
    services: [
      {
        id:    "academy",
        label: "IGFXPRO Academy",
        desc:  "Structured trading education: technical analysis, OLOS AI playbook, risk management.",
        icon:  BookOpen,
        href:  "/academy",
        tier:  "STANDARD",
      },
      {
        id:    "learning",
        label: "Learning Center",
        desc:  "Video courses, interactive quizzes, certification paths and live webinar library.",
        icon:  Activity,
        href:  "/academy",
        tier:  "STANDARD",
      },
    ],
  },
];

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({ svc, userTier }: { svc: Service; userTier: string }) {
  const unlocked = (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[svc.tier] ?? 0);
  const Icon     = svc.icon;
  const tierCls  = TIER_CLS[svc.tier] ?? TIER_CLS.STANDARD;

  const inner = (
    <div className={`group flex items-start gap-4 rounded-xl border p-4 transition ${
      unlocked
        ? "border-slate-800/60 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40 cursor-pointer"
        : "border-slate-800/30 bg-slate-950/20 opacity-50 cursor-default"
    }`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
        unlocked ? "bg-slate-800 group-hover:bg-slate-700" : "bg-slate-900"
      } transition`}>
        {unlocked
          ? <Icon size={16} className="text-slate-300" />
          : <Lock size={12} className="text-slate-600" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[13px] font-semibold ${unlocked ? "text-white" : "text-slate-600"}`}>
            {svc.label}
          </span>
          {svc.badge && unlocked && (
            <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold text-cyan-400">
              {svc.badge}
            </span>
          )}
          {!unlocked && (
            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${tierCls}`}>
              {svc.tier}+
            </span>
          )}
        </div>
        <p className={`text-[11px] leading-5 ${unlocked ? "text-slate-500" : "text-slate-700"}`}>
          {svc.desc}
        </p>
      </div>

      {unlocked && <ChevronRight size={14} className="mt-0.5 shrink-0 text-slate-700 transition group-hover:text-slate-400" />}
    </div>
  );

  if (unlocked && svc.href) {
    return <Link to={svc.href}>{inner}</Link>;
  }
  return <div>{inner}</div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PlatformServicesPage() {
  usePageTitle("Platform Services");
  const { tier } = useTier();

  const unlockedTotal = CATEGORIES.flatMap((c) => c.services)
    .filter((s) => (TIER_RANK[tier] ?? 0) >= (TIER_RANK[s.tier] ?? 0)).length;
  const total = CATEGORIES.flatMap((c) => c.services).length;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1100px] space-y-8 p-5">

        {/* Header */}
        <div className="border-b border-slate-800/60 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600">
            IGFXPRO · Broker services
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Platform Services</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            {unlockedTotal} of {total} services available on your <span className="font-bold text-white">{tier}</span> tier
          </p>
        </div>

        {/* Categories */}
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const unlockedInCat = cat.services.filter(
            (s) => (TIER_RANK[tier] ?? 0) >= (TIER_RANK[s.tier] ?? 0)
          ).length;

          return (
            <section key={cat.id}>
              {/* Category header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800">
                  <CatIcon size={15} className={cat.accent} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-white">{cat.label}</h2>
                  <p className="text-[11px] text-slate-500">
                    {cat.desc} · {unlockedInCat}/{cat.services.length} unlocked
                  </p>
                </div>
              </div>

              {/* Service grid */}
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {cat.services.map((svc) => (
                  <ServiceCard key={svc.id} svc={svc} userTier={tier} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Upgrade notice */}
        {(TIER_RANK[tier] ?? 0) < TIER_RANK.ENTERPRISE && (
          <div className="rounded-2xl border border-slate-800/60 bg-[#07111e] p-5 text-center">
            <p className="text-sm font-bold text-white">Unlock more services</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Upgrade your tier to access PLATINUM, ENTERPRISE and developer services.
            </p>
            <Link to="/dashboard"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/8 px-4 py-2 text-[12px] font-bold text-cyan-300 transition hover:bg-cyan-400/14">
              View tier options <ChevronRight size={11} />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
