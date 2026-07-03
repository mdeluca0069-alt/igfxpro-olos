/**
 * IGFXPRO × OLOS — Client Dashboard · COMMAND CENTER EDITION
 *
 * Living intelligence briefing. Every metric breathes.
 * EKG heartbeat · Holographic cards · OLOS brain omnipresent
 * Never seen before. Never equaled.
 */
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  motion, useInView,
} from "framer-motion";
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight,
  BarChart2, BookOpen, Brain, CheckCircle, ChevronRight, Clock,
  Database, DollarSign, Radio, Server, Shield, Sparkles,
  Target, TrendingDown, TrendingUp, Wifi, Zap,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { useWalletStore }    from "../../store/wallet.store";
import { useTradingStore }   from "../../store/trading.store";
import { useSignalStore }    from "../../store/signal.store";
import { useMarketStore }    from "../../store/market.store";
import { usePortfolioStore } from "../../store/portfolio.store";
import { useAuthStore }      from "../../store/auth.store";
import { apiGet }            from "../../shared/lib/apiHelpers";
import { money2, number }    from "../../shared/utils/format";
import { usePageTitle }      from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────
type ServiceStatus = "operational" | "degraded" | "offline";
type LedgerRow  = { id: string; type: string; amount: number; status: string; reference: string; note: string; createdAt: string };
type AuditRow   = { id: string; actor: string; action: string; entity: string; createdAt: string };
type ExecStats  = { avgExecutionMs: number; fillRate: number; avgSlippagePips: number; rejectedCount: number; settlementSuccessRate: number; riskEngineStatus: ServiceStatus };
type RiskSnap   = { riskScore: number; marginLevelPct: number; leverage: number; marginUtilization: number; concentrationRisk: number; varEstimate: number; maxDrawdown: number; stopOutDistance: number };
type ComplianceData = { kycStatus: string; amlStatus: string; documentStatus: string; sanctionsScreening: string; pepScreening: string; auditTrailStatus: string };
type InfraHealth = { matchingEngine: ServiceStatus; websocket: ServiceStatus; marketFeed: ServiceStatus; settlementEngine: ServiceStatus; ledger: ServiceStatus; database: ServiceStatus };
type PortfolioPerf  = { dailyPnl: number; weeklyPnl: number; monthlyPnl: number; allTimePnl: number };
type RecentOrder = { id: string; symbol: string; side: "BUY" | "SELL"; quantity: number; price: number; status: "filled" | "cancelled" | "pending" | "rejected"; createdAt: string };
type ActivityTab = "orders" | "deposits" | "withdrawals" | "audit";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function classifyAsset(s: string) {
  if (/^(BTC|ETH|LTC|XRP|SOL|ADA|DOGE)/i.test(s)) return "Crypto";
  if (/^(XAU|XAG|XPT)/i.test(s))                   return "Metals";
  if (/^(US|UK|DE|JP|NAS|SP|DAX|CAC|NI)/i.test(s)) return "Indices";
  if (/^(USOIL|UKOIL|NG|OIL)/i.test(s))            return "Energy";
  return "Forex";
}

// ─── HOOK — EKG HEARTBEAT CANVAS ─────────────────────────────────────────────
function useEKG(ref: React.RefObject<HTMLCanvasElement>, amplitude = 1) {
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.offsetWidth; const H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const cy = H / 2;
    const amp = cy * Math.min(0.78, 0.28 + amplitude * 0.12);
    const history: number[] = new Array(W).fill(cy);
    let t = 0; let raf = 0;
    const loop = () => {
      t += 0.055;
      const base = Math.sin(t) * amp * 0.55;
      const harm = Math.sin(t * 2.8 + 1.3) * amp * 0.22;
      const spk  = Math.sin(t * 0.6) > 0.92 ? Math.sin(t * 18) * amp * 1.6 : 0;
      const noise = (Math.random() - 0.5) * amp * 0.05;
      history.shift(); history.push(cy + base + harm + spk + noise);
      ctx.clearRect(0, 0, W, H);
      // glow layer
      ctx.beginPath(); history.forEach((y, x) => x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = "rgba(0,255,159,0.06)"; ctx.lineWidth = 8; ctx.stroke();
      // main gradient line
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0,    "rgba(0,212,255,0)");
      g.addColorStop(0.25, "rgba(0,212,255,0.3)");
      g.addColorStop(0.75, "rgba(0,255,159,0.8)");
      g.addColorStop(1,    "rgba(0,255,159,1)");
      ctx.beginPath(); history.forEach((y, x) => x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.stroke();
      // lead dot
      const ly = history[history.length - 1];
      const dg = ctx.createRadialGradient(W-1, ly, 0, W-1, ly, 8);
      dg.addColorStop(0, "rgba(0,255,159,1)"); dg.addColorStop(1, "rgba(0,255,159,0)");
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(W-1, ly, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#00ff9f"; ctx.beginPath(); ctx.arc(W-1, ly, 2.5, 0, Math.PI * 2); ctx.fill();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [amplitude]);
}

// ─── HOOK — HOLOGRAPHIC TILT ──────────────────────────────────────────────────
function useHoloTilt(strength = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<React.CSSProperties>({});
  const onMove  = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rc = ref.current.getBoundingClientRect();
    const nx = (e.clientX - rc.left) / rc.width  - 0.5;
    const ny = (e.clientY - rc.top)  / rc.height - 0.5;
    setTilt({ transform: `perspective(700px) rotateX(${-ny * strength}deg) rotateY(${nx * strength}deg)` });
  }, [strength]);
  const onLeave = useCallback(() => {
    setTilt({ transform: "perspective(700px) rotateX(0deg) rotateY(0deg)", transition: "transform 0.5s cubic-bezier(0.2,0,0,1)" });
  }, []);
  return { ref, tilt, onMove, onLeave };
}

// ─── HOOK — NUMBER COUNT-UP ───────────────────────────────────────────────────
function useCountUp(target: number, duration = 900, decimals = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Number((ease * target).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, decimals]);
  return val;
}

// ─── Live dot ─────────────────────────────────────────────────────────────────
function LiveDot({ color = "#00d4ff" }: { color?: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

// ─── Fade-in section ──────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 22 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label, icon: Icon, color = "#00d4ff", action }: {
  label: string; icon?: React.ElementType; color?: string; action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-5 w-0.5 rounded-full" style={{ background: `linear-gradient(to bottom, ${color}, transparent)` }} />
        {Icon && <Icon size={13} style={{ color }} />}
        <span className="font-data text-[10px] uppercase tracking-[0.28em]" style={{ color: "rgba(255,255,255,0.4)" }}>
          {label}
        </span>
      </div>
      {action}
    </div>
  );
}

// ─── Glass section wrapper ────────────────────────────────────────────────────
function GlassCard({ children, className = "", glow = false, accent }: {
  children: React.ReactNode; className?: string; glow?: boolean; accent?: string;
}) {
  return (
    <div className={`glass-panel${glow ? "-glow" : ""} relative overflow-hidden rounded-2xl ${className}`}>
      {accent && <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />}
      {children}
    </div>
  );
}

// ─── Animated number ──────────────────────────────────────────────────────────
function AnimNum({ value, prefix = "", suffix = "", decimals = 0, color }: {
  value: number; prefix?: string; suffix?: string; decimals?: number; color?: string;
}) {
  const v = useCountUp(value, 1100, decimals);
  return (
    <span style={{ color }}>
      {prefix}{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
const BOOT_TEXT = "OLOS ACTIVE  ·  REGIME DETECTION ON  ·  CONFIDENCE CALIBRATED  ·  EXECUTION READY  ·  PORTFOLIO ONLINE";

function HeroBanner({
  equity, dailyPnl, riskScore, topSignal, connected,
}: {
  equity: number; dailyPnl: number; riskScore: number | undefined;
  topSignal: any; connected: boolean;
}) {
  const ekgRef = useRef<HTMLCanvasElement>(null);
  useEKG(ekgRef, Math.abs(dailyPnl) / Math.max(equity, 1) * 100);

  const [shown, setShown] = useState(0);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => { i++; setShown(i); if (i >= BOOT_TEXT.length) clearInterval(id); }, 26);
    return () => clearInterval(id);
  }, []);

  const pnlUp = dailyPnl >= 0;

  return (
    <section className="relative overflow-hidden rounded-2xl">
      {/* EKG canvas */}
      <canvas ref={ekgRef} className="absolute inset-0 h-full w-full opacity-30" style={{ pointerEvents: "none" }} />

      {/* Grid texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(0,212,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,1) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Radial ambient */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(0,212,255,0.04) 0%, transparent 70%)" }} />

      <div className="relative z-10 px-7 py-10">
        {/* Typewriter status */}
        <div className="mb-8 flex items-center gap-2.5">
          <LiveDot color="#00ff9f" />
          <span className="font-data text-[9.5px] tracking-[0.22em]" style={{ color: "rgba(0,255,159,0.5)" }}>
            {BOOT_TEXT.slice(0, shown)}<span className="animate-pulse">▍</span>
          </span>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1fr_auto]">
          {/* Left: equity hero */}
          <div>
            <p className="font-data mb-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.25)" }}>
              Total Portfolio Equity
            </p>
            <div className="flex flex-wrap items-end gap-5">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
                <p className="font-display font-bold leading-none text-white" style={{ fontSize: "clamp(36px, 5vw, 72px)" }}>
                  {equity > 0
                    ? <AnimNum value={equity} prefix="$" decimals={2} color="#ffffff" />
                    : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                  }
                </p>
              </motion.div>

              {dailyPnl !== 0 && (
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                  className="mb-2 flex items-center gap-2 rounded-xl border px-3 py-2"
                  style={{ borderColor: pnlUp ? "rgba(0,255,159,0.25)" : "rgba(255,74,74,0.25)", background: pnlUp ? "rgba(0,255,159,0.06)" : "rgba(255,74,74,0.06)" }}>
                  {pnlUp ? <TrendingUp size={14} style={{ color: "#00ff9f" }} /> : <TrendingDown size={14} style={{ color: "#ff4a4a" }} />}
                  <span className="font-data text-[13px] font-bold" style={{ color: pnlUp ? "#00ff9f" : "#ff4a4a" }}>
                    {pnlUp ? "+" : ""}{money2(dailyPnl)} today
                  </span>
                </motion.div>
              )}
            </div>

            {/* Quick action bar */}
            <div className="mt-7 flex flex-wrap gap-3">
              {[
                { label: "Trade Now", to: "/trading", icon: Zap, primary: true },
                { label: "Deposit",   to: "/wallet",  icon: ArrowUpRight, primary: false },
                { label: "Autopilot", to: "/autopilot", icon: Sparkles, primary: false },
                { label: "Signals",   to: "/signals", icon: Brain, primary: false },
              ].map(({ label, to, icon: Icon, primary }) => (
                <Link key={label} to={to}
                  className="btn-scan inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-semibold transition-all"
                  style={primary
                    ? { background: "linear-gradient(135deg,#00d4ff,#0080ff)", color: "#000", boxShadow: "0 0 24px rgba(0,212,255,0.3)" }
                    : { border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.03)" }}>
                  <Icon size={13} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: OLOS confidence card */}
          <HoloConfidence riskScore={riskScore} topSignal={topSignal} connected={connected} />
        </div>
      </div>
    </section>
  );
}

// ─── OLOS confidence mini-card ────────────────────────────────────────────────
function HoloConfidence({ riskScore, topSignal, connected }: { riskScore: number | undefined; topSignal: any; connected: boolean }) {
  const { ref, tilt, onMove, onLeave } = useHoloTilt(7);
  const conf = topSignal?.confidence ?? 0;

  return (
    <div ref={ref} style={tilt} onMouseMove={onMove} onMouseLeave={onLeave} className="hidden xl:block">
      <GlassCard glow className="w-[200px] p-5" accent="#00d4ff">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Brain size={11} style={{ color: "#00d4ff" }} />
            <span className="font-data text-[9px] tracking-[0.2em]" style={{ color: "#00d4ff" }}>OLOS AI</span>
          </div>
          <LiveDot color={connected ? "#00ff9f" : "#ff4a4a"} />
        </div>

        {/* Confidence arc */}
        <div className="mb-4 flex flex-col items-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="#00d4ff" strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - conf / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease" }} />
            </svg>
            <span className="font-data text-[20px] font-bold text-white">{conf > 0 ? `${Math.round(conf)}%` : "—"}</span>
          </div>
          <p className="font-data text-[9px] tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>AI CONFIDENCE</p>
        </div>

        {topSignal && (
          <div className="mb-3 rounded-xl p-2.5"
            style={{ background: topSignal.signalType === "BUY" ? "rgba(0,255,159,0.06)" : "rgba(255,74,74,0.06)", border: `1px solid ${topSignal.signalType === "BUY" ? "rgba(0,255,159,0.2)" : "rgba(255,74,74,0.2)"}` }}>
            <p className="font-data text-[10px] font-bold" style={{ color: topSignal.signalType === "BUY" ? "#00ff9f" : "#ff4a4a" }}>
              ▲ {topSignal.symbol} {topSignal.signalType}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px]">
            <span className="font-data" style={{ color: "rgba(255,255,255,0.3)" }}>Risk score</span>
            <span className="font-data font-bold" style={{ color: riskScore !== undefined ? (riskScore > 70 ? "#ff4a4a" : riskScore > 40 ? "#ff9f00" : "#00ff9f") : "rgba(255,255,255,0.3)" }}>
              {riskScore ?? "—"}/100
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── OLOS PULSE BAR ───────────────────────────────────────────────────────────
function OlosPulseBar({
  connected, riskScore, topSignal, autopilot, execMs,
}: {
  connected: boolean; riskScore: number | undefined; topSignal: any; autopilot: any; execMs: number | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0 overflow-hidden rounded-xl border"
      style={{ borderColor: "rgba(0,212,255,0.12)", background: "rgba(0,10,20,0.9)", backdropFilter: "blur(12px)" }}>
      {[
        {
          content: (
            <div className="flex items-center gap-2">
              <LiveDot color={connected ? "#00ff9f" : "#ff4a4a"} />
              <span className="font-data text-[9px] tracking-[0.2em]" style={{ color: "rgba(0,212,255,0.7)" }}>OLOS</span>
              <span className="font-data text-[9px] font-bold" style={{ color: connected ? "#00ff9f" : "#ff4a4a" }}>
                {connected ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          ),
        },
        {
          content: (
            <div className="flex items-center gap-2">
              <Brain size={10} style={{ color: "#00d4ff" }} />
              <span className="font-data text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>AI Confidence</span>
              <span className="font-data text-[10px] font-bold" style={{ color: (topSignal?.confidence ?? 0) > 70 ? "#00ff9f" : "#ff9f00" }}>
                {topSignal ? `${Math.round(topSignal.confidence)}%` : "—"}
              </span>
            </div>
          ),
        },
        {
          content: (
            <div className="flex items-center gap-2">
              <Zap size={10} style={{ color: "#00d4ff" }} />
              <span className="font-data text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>Exec Speed</span>
              <span className="font-data text-[10px] font-bold" style={{ color: execMs !== undefined ? (execMs < 50 ? "#00ff9f" : execMs < 150 ? "#ff9f00" : "#ff4a4a") : "rgba(255,255,255,0.25)" }}>
                {execMs !== undefined ? `${execMs}ms` : "—"}
              </span>
            </div>
          ),
        },
        {
          content: (
            <div className="flex items-center gap-2">
              <Shield size={10} style={{ color: "#00d4ff" }} />
              <span className="font-data text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>Risk</span>
              <span className="font-data text-[10px] font-bold" style={{ color: riskScore !== undefined ? (riskScore > 70 ? "#ff4a4a" : riskScore > 40 ? "#ff9f00" : "#00ff9f") : "rgba(255,255,255,0.25)" }}>
                {riskScore !== undefined ? `${riskScore}/100` : "—"}
              </span>
            </div>
          ),
        },
        {
          content: (
            <div className="flex items-center gap-2">
              <Sparkles size={10} style={{ color: "#a78bfa" }} />
              <span className="font-data text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>Autopilot</span>
              <span className="font-data text-[10px] font-bold" style={{ color: autopilot?.enabled ? "#00ff9f" : "rgba(255,255,255,0.25)" }}>
                {autopilot?.enabled ? "ACTIVE" : "OFF"}
              </span>
            </div>
          ),
        },
        {
          content: (
            <div className="flex items-center gap-2">
              <Target size={10} style={{ color: "#00d4ff" }} />
              <span className="font-data text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>Top Signal</span>
              <span className="font-data text-[10px] font-bold" style={{ color: topSignal ? (topSignal.signalType === "BUY" ? "#00ff9f" : "#ff4a4a") : "rgba(255,255,255,0.25)" }}>
                {topSignal ? `${topSignal.symbol} ${topSignal.signalType}` : "Scanning…"}
              </span>
            </div>
          ),
        },
      ].map((item, i) => (
        <div key={i} className="flex items-center border-r px-4 py-2.5 last:border-0"
          style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          {item.content}
        </div>
      ))}
    </div>
  );
}

// ─── Account stat card (holographic) ─────────────────────────────────────────
function AccountCard({
  label, value, sub, accent = "#00d4ff", icon: Icon, large = false, loading = false,
}: {
  label: string; value: React.ReactNode; sub?: string; accent?: string;
  icon?: React.ElementType; large?: boolean; loading?: boolean;
}) {
  const { ref, tilt, onMove, onLeave } = useHoloTilt(6);
  return (
    <div ref={ref} style={tilt} onMouseMove={onMove} onMouseLeave={onLeave}>
      <GlassCard accent={accent} className={`p-5 ${large ? "h-full" : ""}`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-data text-[9px] uppercase tracking-[0.25em]" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</span>
          {Icon && <Icon size={12} style={{ color: accent, opacity: 0.6 }} />}
        </div>
        {loading ? (
          <div className="h-8 w-32 animate-pulse rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
        ) : (
          <div className="font-data text-[22px] font-bold leading-none text-white">{value}</div>
        )}
        {sub && !loading && (
          <p className="mt-2 font-data text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>{sub}</p>
        )}
      </GlassCard>
    </div>
  );
}

// ─── Execution quality metric ─────────────────────────────────────────────────
function ExecMetric({ label, value, quality, bar, loading }: {
  label: string; value: string; quality?: "good" | "warn" | "bad" | "neutral"; bar?: number; loading?: boolean;
}) {
  const col = quality === "good" ? "#00ff9f" : quality === "warn" ? "#ff9f00" : quality === "bad" ? "#ff4a4a" : "rgba(255,255,255,0.6)";
  const barCol = quality === "good" ? "#00ff9f" : quality === "warn" ? "#ff9f00" : "#ff4a4a";
  return (
    <GlassCard className="p-4">
      <div className="absolute inset-y-0 left-0 w-0.5 rounded-full" style={{ background: col }} />
      <p className="font-data mb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</p>
      {loading ? <div className="h-6 w-20 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
        : <p className="font-data text-[18px] font-bold leading-none" style={{ color: col }}>{value}</p>}
      {bar !== undefined && !loading && (
        <div className="mt-3 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div className="h-full rounded-full" initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ background: barCol }} />
        </div>
      )}
    </GlassCard>
  );
}

// ─── Risk metric card ─────────────────────────────────────────────────────────
function RiskMetricCard({ label, value, valueColor, bar, barColor, loading }: {
  label: string; value: string; valueColor?: string; bar?: number; barColor?: string; loading?: boolean;
}) {
  return (
    <GlassCard className="p-4">
      <p className="font-data mb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</p>
      {loading
        ? <div className="h-6 w-20 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
        : <p className="font-data text-[18px] font-bold leading-none" style={{ color: valueColor ?? "white" }}>{value}</p>}
      {bar !== undefined && !loading && (
        <div className="mt-3 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div className="h-full rounded-full" initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{ background: barColor ?? "#00d4ff" }} />
        </div>
      )}
    </GlassCard>
  );
}

// ─── Allocation donut ─────────────────────────────────────────────────────────
const ALLOC_COLORS = ["#00d4ff", "#00ff9f", "#a78bfa", "#fb923c", "#ff4a4a", "#94a3b8"];

function AllocationDonut({ positions }: { positions: any[] }) {
  const data = useMemo(() => {
    const g: Record<string, number> = {};
    for (const pos of positions) {
      const cls = classifyAsset(pos.symbol);
      g[cls] = (g[cls] ?? 0) + Math.abs(pos.marginUsed ?? 1);
    }
    return Object.entries(g).map(([name, value]) => ({ name, value }));
  }, [positions]);

  if (!data.length) return (
    <div className="flex h-[130px] flex-col items-center justify-center gap-2">
      <BarChart2 size={20} style={{ color: "rgba(255,255,255,0.1)" }} />
      <p className="font-data text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>No open positions</p>
    </div>
  );

  return (
    <div>
      <ResponsiveContainer width="100%" height={130}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={56} dataKey="value" paddingAngle={3}>
            {data.map((_, i) => <Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} strokeWidth={0} />)}
          </Pie>
          <ReTooltip contentStyle={{ background: "#0a1220", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "8px", fontSize: "11px", color: "#e2e8f0" }} formatter={(v: number) => [money2(v), ""]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
            <span className="font-data text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Positions table ──────────────────────────────────────────────────────────
function PositionsTable({ positions, openPnL }: { positions: any[]; openPnL: number }) {
  if (!positions.length) return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.1)" }}>
        <BarChart2 size={20} style={{ color: "rgba(0,212,255,0.4)" }} />
      </div>
      <p className="font-data text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>No open positions</p>
      <Link to="/trading" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors hover:opacity-80" style={{ color: "#00d4ff" }}>
        Open Terminal <ArrowRight size={11} />
      </Link>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {["Symbol", "Side", "Qty", "Entry", "Mark", "P&L", "Margin"].map(h => (
              <th key={h} className="pb-3 pr-5 pt-1 text-left font-data text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.2)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => {
            const up = pos.pnl >= 0;
            return (
              <tr key={pos.id} className="transition" style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                <td className="py-3 pr-5 font-data text-[13px] font-bold text-white">{pos.symbol}</td>
                <td className="pr-5">
                  <span className="rounded-md px-2.5 py-1 font-data text-[10px] font-bold" style={{
                    background: pos.side === "BUY" ? "rgba(0,255,159,0.1)" : "rgba(255,74,74,0.1)",
                    color:      pos.side === "BUY" ? "#00ff9f"              : "#ff4a4a",
                  }}>{pos.side}</span>
                </td>
                <td className="pr-5 font-data text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{number(pos.quantity, 0)}</td>
                <td className="pr-5 font-data text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{number(pos.entryPrice, 5)}</td>
                <td className="pr-5 font-data text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{number(pos.markPrice ?? pos.entryPrice, 5)}</td>
                <td className="pr-5 font-data text-[13px] font-bold" style={{ color: up ? "#00ff9f" : "#ff4a4a" }}>
                  {up ? "+" : ""}{money2(pos.pnl)}
                </td>
                <td className="font-data text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{money2(pos.marginUsed)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <td colSpan={4} className="py-3 font-data text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>Total unrealized P&amp;L</td>
            <td /><td className="py-3 font-data text-[13px] font-bold" style={{ color: openPnL >= 0 ? "#00ff9f" : "#ff4a4a" }}>{openPnL >= 0 ? "+" : ""}{money2(openPnL)}</td><td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Compliance item ──────────────────────────────────────────────────────────
function CompliancePill({ label, status }: { label: string; status: string }) {
  const ok   = ["verified", "clear", "complete", "active"];
  const warn = ["pending", "review"];
  const col  = ok.includes(status) ? { text: "#00ff9f", bg: "rgba(0,255,159,0.08)", border: "rgba(0,255,159,0.2)" }
             : warn.includes(status) ? { text: "#ff9f00", bg: "rgba(255,159,0,0.08)", border: "rgba(255,159,0,0.2)" }
             : { text: "#ff4a4a", bg: "rgba(255,74,74,0.08)", border: "rgba(255,74,74,0.2)" };
  return (
    <div className="rounded-xl p-4" style={{ background: col.bg, border: `1px solid ${col.border}` }}>
      <p className="font-data mb-1.5 text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</p>
      <span className="font-data text-[11px] font-bold uppercase" style={{ color: col.text }}>{status}</span>
    </div>
  );
}

// ─── Service status card ──────────────────────────────────────────────────────
function ServiceStatus({ label, status, icon: Icon, loading }: {
  label: string; status?: "operational" | "degraded" | "offline"; icon?: React.ElementType; loading?: boolean;
}) {
  const s   = status ?? "operational";
  const col = s === "operational" ? "#00ff9f" : s === "degraded" ? "#ff9f00" : "#ff4a4a";
  return (
    <GlassCard className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon size={12} style={{ color: "rgba(255,255,255,0.3)" }} />}
        <span className="font-data text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      </div>
      {loading ? <div className="h-3 w-16 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.05)" }} /> : (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: col }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: col }} />
          </span>
          <span className="font-data text-[10px] font-bold capitalize" style={{ color: col }}>{s}</span>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Activity feed ────────────────────────────────────────────────────────────
function ActivityFeed({
  orders, deposits, withdrawals, auditRows,
}: {
  orders: RecentOrder[]; deposits: LedgerRow[]; withdrawals: LedgerRow[]; auditRows: AuditRow[];
}) {
  const [tab, setTab] = useState<ActivityTab>("orders");

  const TABS: { key: ActivityTab; label: string; count?: number }[] = [
    { key: "orders",      label: "Orders",      count: orders.length      },
    { key: "deposits",    label: "Deposits",    count: deposits.length    },
    { key: "withdrawals", label: "Withdrawals", count: withdrawals.length },
    { key: "audit",       label: "Audit",       count: auditRows.length   },
  ];

  const thCls = "pb-3 pr-5 text-left font-data text-[9px] uppercase tracking-[0.22em]";
  const thStyle = { color: "rgba(255,255,255,0.2)" };
  const trStyle = { borderBottom: "1px solid rgba(255,255,255,0.025)" };

  return (
    <GlassCard className="p-5">
      {/* Tab strip */}
      <div className="mb-5 flex gap-0 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex shrink-0 items-center gap-2 border-b-2 px-4 pb-3 pt-1 font-data text-[11px] font-bold transition-all"
            style={{
              borderColor:  tab === t.key ? "#00d4ff"                  : "transparent",
              color:        tab === t.key ? "white"                    : "rgba(255,255,255,0.3)",
            }}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="rounded-full px-1.5 py-0.5 font-data text-[9px]"
                style={{ background: tab === t.key ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.05)", color: tab === t.key ? "#00d4ff" : "rgba(255,255,255,0.3)" }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        orders.length === 0
          ? <p className="py-10 text-center font-data text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>No recent orders</p>
          : <table className="w-full">
              <thead><tr>{["ID", "Symbol", "Side", "Qty", "Price", "Status", "Time"].map(h => <th key={h} className={thCls} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {orders.slice(0, 8).map(o => (
                  <tr key={o.id} style={trStyle}>
                    <td className="py-2.5 pr-5 font-data text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{o.id.slice(-8).toUpperCase()}</td>
                    <td className="pr-5 font-data text-[12px] font-bold text-white">{o.symbol}</td>
                    <td className="pr-5"><span className="font-data text-[10px] font-bold" style={{ color: o.side === "BUY" ? "#00ff9f" : "#ff4a4a" }}>{o.side}</span></td>
                    <td className="pr-5 font-data text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{number(o.quantity, 0)}</td>
                    <td className="pr-5 font-data text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{number(o.price, 5)}</td>
                    <td className="pr-5"><span className="font-data text-[10px] font-bold capitalize" style={{ color: o.status === "filled" ? "#00ff9f" : o.status === "cancelled" ? "rgba(255,255,255,0.3)" : o.status === "rejected" ? "#ff4a4a" : "#ff9f00" }}>{o.status}</span></td>
                    <td className="font-data text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{fmtTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
      )}

      {tab === "deposits" && (
        deposits.length === 0
          ? <p className="py-10 text-center font-data text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>No recent deposits</p>
          : <table className="w-full">
              <thead><tr>{["Reference", "Amount", "Status", "Time"].map(h => <th key={h} className={thCls} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {deposits.slice(0, 8).map(d => (
                  <tr key={d.id} style={trStyle}>
                    <td className="py-2.5 pr-5 font-data text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{d.reference.slice(-12).toUpperCase()}</td>
                    <td className="pr-5 font-data text-[12px] font-bold" style={{ color: "#00ff9f" }}>+{money2(Number(d.amount))}</td>
                    <td className="pr-5"><span className="font-data text-[10px] font-bold capitalize" style={{ color: d.status === "COMPLETED" ? "#00ff9f" : d.status === "PENDING_ADMIN" ? "#ff9f00" : "#ff4a4a" }}>{d.status.replace("_"," ").toLowerCase()}</span></td>
                    <td className="font-data text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{fmtTime(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
      )}

      {tab === "withdrawals" && (
        withdrawals.length === 0
          ? <p className="py-10 text-center font-data text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>No recent withdrawals</p>
          : <table className="w-full">
              <thead><tr>{["Reference", "Amount", "Status", "Time"].map(h => <th key={h} className={thCls} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {withdrawals.slice(0, 8).map(w => (
                  <tr key={w.id} style={trStyle}>
                    <td className="py-2.5 pr-5 font-data text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{w.reference.slice(-12).toUpperCase()}</td>
                    <td className="pr-5 font-data text-[12px] font-bold" style={{ color: "#ff4a4a" }}>-{money2(Math.abs(Number(w.amount)))}</td>
                    <td className="pr-5"><span className="font-data text-[10px] font-bold capitalize" style={{ color: w.status === "COMPLETED" ? "#00ff9f" : w.status === "PENDING_ADMIN" ? "#ff9f00" : "#ff4a4a" }}>{w.status.replace("_"," ").toLowerCase()}</span></td>
                    <td className="font-data text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{fmtTime(w.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
      )}

      {tab === "audit" && (
        auditRows.length === 0
          ? <p className="py-10 text-center font-data text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>No recent audit events</p>
          : <table className="w-full">
              <thead><tr>{["Action", "Entity", "Time"].map(h => <th key={h} className={thCls} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {auditRows.slice(0, 8).map(a => (
                  <tr key={a.id} style={trStyle}>
                    <td className="py-2.5 pr-5 font-data text-[11px] text-white">{a.action}</td>
                    <td className="pr-5 font-data text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{a.entity}</td>
                    <td className="font-data text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{fmtTime(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
      )}
    </GlassCard>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DashboardHome() {
  usePageTitle("Dashboard — IGFXPRO");

  useAuthStore(s => s.principal);
  const balance        = useWalletStore(s => s.balance);
  const fetchBalance   = useWalletStore(s => s.fetchBalance);
  const positions      = useTradingStore(s => s.positions);
  const fetchPositions = usePortfolioStore(s => s.fetchPositions);
  const topSignal      = useSignalStore(s => s.getTopSignal());
  const connected      = useMarketStore(s => s.connected);

  useEffect(() => {
    void fetchBalance();
    void fetchPositions();
  }, [fetchBalance, fetchPositions]);

  const { data: perf,       isLoading: perfLoading    } = useQuery<PortfolioPerf>({ queryKey: ["dashboard-perf"],    queryFn: () => apiGet("/api/v1/trading/audit/stats"),          staleTime: 30_000 });
  const { data: risk,       isLoading: riskLoading     } = useQuery<RiskSnap>     ({ queryKey: ["risk-snapshot"],     queryFn: () => apiGet("/api/v1/risk/snapshot"),                staleTime: 15_000, refetchInterval: 30_000 });
  const { data: exec,       isLoading: execLoading     } = useQuery<ExecStats>    ({ queryKey: ["exec-stats"],        queryFn: () => apiGet("/api/v1/execution/stats"),              staleTime: 60_000 });
  const { data: compliance                              } = useQuery<ComplianceData>({ queryKey: ["compliance-status"], queryFn: () => apiGet("/api/v1/compliance/status"),           staleTime: 120_000 });
  const { data: infra,      isLoading: infraLoading    } = useQuery<InfraHealth>   ({ queryKey: ["infra-health"],     queryFn: () => apiGet("/api/v1/health"),                       staleTime: 15_000, refetchInterval: 30_000 });
  const { data: autopilot                               } = useQuery<{ enabled: boolean; mode: string; minConfidence: number }>({ queryKey: ["autopilot"], queryFn: () => apiGet("/api/v1/autopilot/config"), staleTime: 60_000 });
  const { data: recentOrders                            } = useQuery<RecentOrder[]>({ queryKey: ["recent-orders"],    queryFn: () => apiGet("/api/v1/trading/orders?limit=8"),        staleTime: 30_000 });
  const { data: ledgerData                              } = useQuery<{ entries: LedgerRow[] }>({ queryKey: ["ledger-recent"], queryFn: () => apiGet("/api/v1/wallet/ledger?limit=50&orderBy=desc"), staleTime: 30_000 });
  const { data: auditData                               } = useQuery<{ entries: AuditRow[] }>({ queryKey: ["audit-recent"],  queryFn: () => apiGet("/api/v1/admin/compliance/audit?limit=20"),   staleTime: 60_000 });

  const deposits    = (ledgerData?.entries ?? []).filter(e => e.type === "DEPOSIT_REQUEST" || e.type === "ADMIN_CAPITAL_ALLOCATION");
  const withdrawals = (ledgerData?.entries ?? []).filter(e => e.type === "WITHDRAW_REQUEST");
  const auditRows   = auditData?.entries ?? [];

  // Derived
  const equity    = balance?.equity    ?? 0;
  const avail     = balance?.available ?? 0;
  const freeM     = balance?.freeMargin ?? 0;
  const marginU   = balance?.marginUsed  ?? 0;
  const marginLvl = marginU > 0 ? (equity / marginU) * 100 : Infinity;
  const openPnL   = positions.reduce((s, p) => s + (p.pnl ?? 0), 0);
  const dailyPnl  = perf?.dailyPnl   ?? 0;
  const monthlyPnl = perf?.monthlyPnl ?? 0;

  const marginLvlDisplay = Number.isFinite(marginLvl) ? `${number(Math.min(marginLvl, 9999), 0)}%` : "∞";
  const marginLvlColor   = !Number.isFinite(marginLvl) || marginLvl > 500 ? "#00ff9f" : marginLvl > 200 ? "#00d4ff" : marginLvl > 120 ? "#ff9f00" : "#ff4a4a";

  const exposureByAsset = useMemo(() => {
    const g: Record<string, number> = {};
    for (const pos of positions) {
      const cls = classifyAsset(pos.symbol);
      g[cls] = (g[cls] ?? 0) + Math.abs(pos.marginUsed ?? 0);
    }
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [positions]);

  const largestPos = useMemo(
    () => positions.reduce<any | null>((best, p) => !best || Math.abs(p.pnl ?? 0) > Math.abs(best.pnl ?? 0) ? p : best, null),
    [positions]
  );

  return (
    <div className="min-h-screen" style={{ background: "#000" }}>
      {/* Global ambient grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.018]"
        style={{ backgroundImage: "linear-gradient(rgba(0,212,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <main className="relative mx-auto max-w-[1680px] space-y-5 p-4 md:p-6">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* HERO — PORTFOLIO COMMAND                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <HeroBanner
            equity={equity}
            dailyPnl={dailyPnl}
            riskScore={risk?.riskScore}
            topSignal={topSignal}
            connected={connected}
          />
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OLOS PULSE BAR                                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <OlosPulseBar
            connected={connected}
            riskScore={risk?.riskScore}
            topSignal={topSignal}
            autopilot={autopilot}
            execMs={exec?.avgExecutionMs}
          />
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ACCOUNT METRICS — 8 holographic cards                      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Reveal>
          <SectionLabel label="Account Health" icon={DollarSign} color="#00d4ff"
            action={<Link to="/wallet" className="flex items-center gap-1 font-data text-[10px] transition-opacity hover:opacity-80" style={{ color: "rgba(0,212,255,0.6)" }}>Wallet <ChevronRight size={10} /></Link>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            <AccountCard label="Total Equity"  value={balance ? <AnimNum value={equity}  prefix="$" decimals={2} color="#ffffff" /> : "—"} sub="Net Asset Value"   accent="#00d4ff"  icon={TrendingUp}  loading={!balance} />
            <AccountCard label="Balance"       value={balance ? <AnimNum value={avail}   prefix="$" decimals={2} color="#e2e8f0" /> : "—"} sub="Available"         accent="#0080ff"                     loading={!balance} />
            <AccountCard label="Free Margin"   value={balance ? <AnimNum value={freeM}   prefix="$" decimals={2} color="#e2e8f0" /> : "—"} sub="Unallocated"       accent="#0060cc"                     loading={!balance} />
            <AccountCard label="Used Margin"   value={marginU > 0 ? <AnimNum value={marginU} prefix="$" decimals={2} color={marginU > 0 ? "#ff9f00" : "#555"} /> : "—"} sub="Locked" accent={marginU > 0 ? "#ff9f00" : "#333"} loading={!balance} />
            <AccountCard label="Margin Level"  value={balance ? <span style={{ color: marginLvlColor }}>{marginLvlDisplay}</span> : "—"} sub="50% ESMA stop-out" accent={marginLvlColor} loading={!balance} />
            <AccountCard label="Daily P&L"     value={perfLoading ? "—" : <span style={{ color: dailyPnl  >= 0 ? "#00ff9f" : "#ff4a4a" }}>{dailyPnl  >= 0 ? "+" : ""}<AnimNum value={dailyPnl}   prefix="$" decimals={2} /></span>} sub="Today"            accent={dailyPnl  >= 0 ? "#00ff9f" : "#ff4a4a"} loading={perfLoading} />
            <AccountCard label="Monthly P&L"   value={perfLoading ? "—" : <span style={{ color: monthlyPnl >= 0 ? "#00ff9f" : "#ff4a4a" }}>{monthlyPnl >= 0 ? "+" : ""}<AnimNum value={monthlyPnl} prefix="$" decimals={2} /></span>} sub="MTD"              accent={monthlyPnl >= 0 ? "#00ff9f" : "#ff4a4a"} loading={perfLoading} />
            <AccountCard label="Risk Score"    value={risk ? <span style={{ color: (risk.riskScore) > 70 ? "#ff4a4a" : (risk.riskScore) > 40 ? "#ff9f00" : "#00ff9f" }}>{risk.riskScore}/100</span> : "—"} sub="Composite"         accent={(risk?.riskScore ?? 0) > 70 ? "#ff4a4a" : (risk?.riskScore ?? 0) > 40 ? "#ff9f00" : "#00ff9f"} icon={Shield} loading={riskLoading} />
          </div>
        </Reveal>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* EXECUTION QUALITY                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Reveal delay={0.05}>
          <SectionLabel label="Execution Quality" icon={Zap} color="#00ff9f"
            action={<Link to="/analytics" className="flex items-center gap-1 font-data text-[10px] transition-opacity hover:opacity-80" style={{ color: "rgba(0,255,159,0.6)" }}>Analytics <ChevronRight size={10} /></Link>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <ExecMetric label="Avg Execution Speed" value={exec ? `${exec.avgExecutionMs}ms` : "—"} quality={exec ? (exec.avgExecutionMs < 50 ? "good" : exec.avgExecutionMs < 150 ? "warn" : "bad") : "neutral"} bar={exec ? Math.max(0, 100 - exec.avgExecutionMs / 2) : undefined} loading={execLoading} />
            <ExecMetric label="Order Fill Rate"     value={exec ? `${exec.fillRate.toFixed(1)}%` : "—"}               quality={exec ? (exec.fillRate > 98 ? "good" : exec.fillRate > 95 ? "warn" : "bad") : "neutral"}                 bar={exec?.fillRate} loading={execLoading} />
            <ExecMetric label="Avg Slippage"        value={exec ? `${exec.avgSlippagePips.toFixed(1)} pips` : "—"}    quality={exec ? (exec.avgSlippagePips < 0.5 ? "good" : exec.avgSlippagePips < 1.5 ? "warn" : "bad") : "neutral"} loading={execLoading} />
            <ExecMetric label="Rejected Orders"     value={exec ? `${exec.rejectedCount}` : "—"}                      quality={exec ? (exec.rejectedCount === 0 ? "good" : exec.rejectedCount < 5 ? "warn" : "bad") : "neutral"}       loading={execLoading} />
            <ExecMetric label="Settlement Rate"     value={exec ? `${exec.settlementSuccessRate.toFixed(1)}%` : "—"}  quality={exec ? (exec.settlementSuccessRate > 99 ? "good" : exec.settlementSuccessRate > 97 ? "warn" : "bad") : "neutral"} bar={exec?.settlementSuccessRate} loading={execLoading} />
            <GlassCard className="p-4">
              <div className="absolute inset-y-0 left-0 w-0.5 rounded-full" style={{ background: exec?.riskEngineStatus === "operational" ? "#00ff9f" : exec?.riskEngineStatus === "degraded" ? "#ff9f00" : "#ff4a4a" }} />
              <p className="font-data mb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.25)" }}>Risk Engine</p>
              {execLoading ? <div className="h-6 w-20 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.04)" }} /> : (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ background: exec?.riskEngineStatus === "operational" ? "#00ff9f" : "#ff9f00" }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ background: exec?.riskEngineStatus === "operational" ? "#00ff9f" : "#ff9f00" }} />
                  </span>
                  <span className="font-data text-[15px] font-bold capitalize"
                    style={{ color: exec?.riskEngineStatus === "operational" ? "#00ff9f" : exec?.riskEngineStatus === "degraded" ? "#ff9f00" : "#ff4a4a" }}>
                    {exec?.riskEngineStatus ?? "Operational"}
                  </span>
                </div>
              )}
            </GlassCard>
          </div>
        </Reveal>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PORTFOLIO INTELLIGENCE                                      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Reveal delay={0.05}>
          <SectionLabel label="Portfolio Intelligence" icon={BarChart2} color="#00d4ff"
            action={<Link to="/portfolio" className="flex items-center gap-1 font-data text-[10px] transition-opacity hover:opacity-80" style={{ color: "rgba(0,212,255,0.6)" }}>Portfolio <ChevronRight size={10} /></Link>} />
          <div className="grid gap-4 xl:grid-cols-[1fr_240px]">
            {/* Positions */}
            <GlassCard className="p-5" accent="#00d4ff">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-data text-[10px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.3)" }}>Open Positions</span>
                  <span className="rounded-md px-2 py-0.5 font-data text-[10px] font-bold" style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff" }}>{positions.length}</span>
                </div>
                {positions.length > 0 && (
                  <span className="flex items-center gap-1.5 font-data text-[13px] font-bold" style={{ color: openPnL >= 0 ? "#00ff9f" : "#ff4a4a" }}>
                    {openPnL >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {openPnL >= 0 ? "+" : ""}{money2(openPnL)} unrealized
                  </span>
                )}
              </div>
              <PositionsTable positions={positions} openPnL={openPnL} />
            </GlassCard>

            {/* Right col */}
            <div className="space-y-3">
              <GlassCard className="p-4" accent="#00d4ff">
                <p className="font-data mb-3 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.25)" }}>Portfolio Allocation</p>
                <AllocationDonut positions={positions} />
              </GlassCard>

              <GlassCard className="p-4">
                <p className="font-data mb-3 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.25)" }}>Exposure by Class</p>
                {exposureByAsset.length === 0
                  ? <p className="py-3 text-center font-data text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>—</p>
                  : <div className="space-y-2.5">
                      {exposureByAsset.slice(0, 4).map(([cls, val]) => {
                        const total = exposureByAsset.reduce((s, [, v]) => s + v, 0);
                        const pct   = total > 0 ? (val / total) * 100 : 0;
                        return (
                          <div key={cls}>
                            <div className="mb-1.5 flex justify-between">
                              <span className="font-data text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{cls}</span>
                              <span className="font-data text-[10px] font-bold" style={{ color: "#00d4ff" }}>{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                              <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }}
                                style={{ background: "linear-gradient(90deg,#0080ff,#00d4ff)" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>}
              </GlassCard>

              {largestPos && (
                <GlassCard className="p-4">
                  <p className="font-data mb-3 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.25)" }}>Largest Position</p>
                  <div className="space-y-2">
                    {[
                      { l: "Symbol", v: <span className="font-data font-bold text-white">{largestPos.symbol}</span> },
                      { l: "Side",   v: <span className="font-data font-bold" style={{ color: largestPos.side === "BUY" ? "#00ff9f" : "#ff4a4a" }}>{largestPos.side}</span> },
                      { l: "P&L",    v: <span className="font-data font-bold" style={{ color: (largestPos.pnl ?? 0) >= 0 ? "#00ff9f" : "#ff4a4a" }}>{(largestPos.pnl ?? 0) >= 0 ? "+" : ""}{money2(largestPos.pnl ?? 0)}</span> },
                      { l: "Margin", v: <span className="font-data" style={{ color: "rgba(255,255,255,0.4)" }}>{money2(largestPos.marginUsed)}</span> },
                    ].map(({ l, v }) => (
                      <div key={l} className="flex items-center justify-between">
                        <span className="font-data text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>{l}</span>
                        <span className="text-[11px]">{v}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        </Reveal>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OLOS INTELLIGENCE                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Reveal delay={0.05}>
          <SectionLabel label="OLOS Intelligence" icon={Brain} color="#a78bfa"
            action={<Link to="/olos-ai" className="flex items-center gap-1 font-data text-[10px] transition-opacity hover:opacity-80" style={{ color: "rgba(167,139,250,0.7)" }}>Full AI Center <ChevronRight size={10} /></Link>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">

            {/* Market Regime */}
            <GlassCard className="p-4" accent="#a78bfa">
              <p className="font-data mb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(167,139,250,0.5)" }}>Market Regime</p>
              <p className="font-data text-[16px] font-bold" style={{ color: "#a78bfa" }}>{(topSignal as any)?.regime ?? "Trending"}</p>
              <p className="mt-1.5 font-data text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>OLOS classification</p>
            </GlassCard>

            {/* AI Confidence */}
            <GlassCard className="p-4" accent="#00d4ff">
              <p className="font-data mb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(0,212,255,0.5)" }}>AI Confidence</p>
              <p className="font-data text-[22px] font-bold leading-none" style={{ color: topSignal ? ((topSignal.confidence ?? 0) > 70 ? "#00ff9f" : "#ff9f00") : "rgba(255,255,255,0.2)" }}>
                {topSignal ? `${topSignal.confidence.toFixed(0)}%` : "—"}
              </p>
              {topSignal && (
                <div className="mt-2.5 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                    animate={{ width: `${topSignal.confidence}%` }} transition={{ duration: 1.2 }}
                    style={{ background: "linear-gradient(90deg,#0080ff,#00d4ff,#00ff9f)" }} />
                </div>
              )}
            </GlassCard>

            {/* Top Signal */}
            <GlassCard className="p-4" accent={topSignal ? (topSignal.signalType === "BUY" ? "#00ff9f" : "#ff4a4a") : "#333"}>
              <p className="font-data mb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.25)" }}>Top Signal</p>
              {topSignal ? (
                <>
                  <p className="font-data text-[15px] font-bold text-white">{topSignal.symbol} <span style={{ color: topSignal.signalType === "BUY" ? "#00ff9f" : "#ff4a4a" }}>{topSignal.signalType}</span></p>
                  <Link to={`/trading?symbol=${topSignal.symbol}`} className="mt-1.5 block font-data text-[9px] font-bold transition-opacity hover:opacity-70" style={{ color: "#00d4ff" }}>Trade now →</Link>
                </>
              ) : <p className="font-data text-[13px]" style={{ color: "rgba(255,255,255,0.2)" }}>Scanning…</p>}
            </GlassCard>

            {/* Risk Alerts */}
            <GlassCard className="p-4" accent={(risk?.riskScore ?? 0) > 70 ? "#ff4a4a" : (risk?.riskScore ?? 0) > 40 ? "#ff9f00" : "#00ff9f"}>
              <p className="font-data mb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.25)" }}>Risk Level</p>
              <p className="font-data text-[18px] font-bold" style={{ color: (risk?.riskScore ?? 0) > 70 ? "#ff4a4a" : (risk?.riskScore ?? 0) > 40 ? "#ff9f00" : "#00ff9f" }}>
                {(risk?.riskScore ?? 0) > 70 ? "High" : (risk?.riskScore ?? 0) > 40 ? "Medium" : "Low"}
              </p>
              <p className="mt-1.5 font-data text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>Composite risk index</p>
            </GlassCard>

            {/* Macro Events */}
            <GlassCard className="p-4" accent="#ff9f00">
              <p className="font-data mb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,159,0,0.5)" }}>Macro Events</p>
              <AlertTriangle size={18} style={{ color: "rgba(255,159,0,0.6)" }} />
              <Link to="/calendar" className="mt-2 block font-data text-[11px] font-bold text-white transition-opacity hover:opacity-70">Economic Calendar →</Link>
            </GlassCard>

            {/* Autopilot */}
            <GlassCard className="p-4" accent={autopilot?.enabled ? "#00ff9f" : "#a78bfa"} glow={!!autopilot?.enabled}>
              <p className="font-data mb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.25)" }}>Autopilot</p>
              <div className="flex items-center gap-2">
                {autopilot?.enabled ? <Radio size={14} style={{ color: "#00ff9f" }} className="animate-pulse" /> : <Sparkles size={14} style={{ color: "#a78bfa" }} />}
                <span className="font-data text-[16px] font-bold" style={{ color: autopilot?.enabled ? "#00ff9f" : "rgba(255,255,255,0.3)" }}>
                  {autopilot?.enabled ? "Active" : "Inactive"}
                </span>
              </div>
              {autopilot?.enabled
                ? <p className="mt-1.5 font-data text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>{autopilot.mode} · {Math.round(autopilot.minConfidence * 100)}% min</p>
                : <Link to="/autopilot" className="mt-1.5 block font-data text-[9px] font-bold transition-opacity hover:opacity-70" style={{ color: "#00d4ff" }}>Configure →</Link>}
            </GlassCard>
          </div>
        </Reveal>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* RISK SENTINEL                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Reveal delay={0.05}>
          <SectionLabel label="Risk Sentinel" icon={Shield} color="#ff9f00"
            action={<Link to="/risk" className="flex items-center gap-1 font-data text-[10px] transition-opacity hover:opacity-80" style={{ color: "rgba(255,159,0,0.6)" }}>Risk Center <ChevronRight size={10} /></Link>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <RiskMetricCard label="Current Leverage"    value={risk ? `${risk.leverage.toFixed(1)}:1` : "—"}                  valueColor={(risk?.leverage ?? 0) > 100 ? "#ff4a4a" : (risk?.leverage ?? 0) > 50 ? "#ff9f00" : "white"}                            loading={riskLoading} />
            <RiskMetricCard label="Margin Utilization"  value={risk ? `${risk.marginUtilization.toFixed(1)}%` : "—"}          valueColor={(risk?.marginUtilization ?? 0) > 80 ? "#ff4a4a" : (risk?.marginUtilization ?? 0) > 60 ? "#ff9f00" : "#00ff9f"}        bar={risk?.marginUtilization} barColor={(risk?.marginUtilization ?? 0) > 80 ? "#ff4a4a" : "#ff9f00"} loading={riskLoading} />
            <RiskMetricCard label="Concentration Risk"  value={risk ? `${risk.concentrationRisk.toFixed(0)}%` : "—"}          valueColor={(risk?.concentrationRisk ?? 0) > 40 ? "#ff4a4a" : (risk?.concentrationRisk ?? 0) > 25 ? "#ff9f00" : "white"}          bar={risk?.concentrationRisk} barColor={(risk?.concentrationRisk ?? 0) > 40 ? "#ff4a4a" : "#ff9f00"} loading={riskLoading} />
            <RiskMetricCard label="VaR Estimate (95%)"  value={risk ? money2(risk.varEstimate) : "—"}                         valueColor="#ff9f00"                                                                                                                loading={riskLoading} />
            <RiskMetricCard label="Max Drawdown"        value={risk ? `-${risk.maxDrawdown.toFixed(2)}%` : "—"}              valueColor={(risk?.maxDrawdown ?? 0) > 20 ? "#ff4a4a" : (risk?.maxDrawdown ?? 0) > 10 ? "#ff9f00" : "rgba(255,255,255,0.6)"}       loading={riskLoading} />
            <RiskMetricCard label="Stop-Out Distance"   value={risk ? `${risk.stopOutDistance.toFixed(1)}%` : "—"}            valueColor={(risk?.stopOutDistance ?? 100) < 20 ? "#ff4a4a" : (risk?.stopOutDistance ?? 100) < 50 ? "#ff9f00" : "#00ff9f"}         loading={riskLoading} />
          </div>
        </Reveal>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* COMPLIANCE                                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Reveal delay={0.05}>
          <SectionLabel label="Compliance Status" icon={CheckCircle} color="#00ff9f"
            action={<Link to="/compliance" className="flex items-center gap-1 font-data text-[10px] transition-opacity hover:opacity-80" style={{ color: "rgba(0,255,159,0.6)" }}>Compliance <ChevronRight size={10} /></Link>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <CompliancePill label="KYC Status"          status={compliance?.kycStatus          ?? "pending"} />
            <CompliancePill label="AML Status"          status={compliance?.amlStatus          ?? "pending"} />
            <CompliancePill label="Document Status"     status={compliance?.documentStatus     ?? "pending"} />
            <CompliancePill label="Sanctions Screening" status={compliance?.sanctionsScreening ?? "pending"} />
            <CompliancePill label="PEP Screening"       status={compliance?.pepScreening       ?? "pending"} />
            <CompliancePill label="Audit Trail"         status={compliance?.auditTrailStatus   ?? "active"}  />
          </div>
        </Reveal>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* INFRASTRUCTURE                                              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Reveal delay={0.05}>
          <SectionLabel label="Platform Infrastructure" icon={Server} color="#00d4ff" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <ServiceStatus label="Matching Engine"   status={infra?.matchingEngine   ?? "operational"}                          loading={infraLoading} icon={Zap}      />
            <ServiceStatus label="WebSocket"         status={connected ? (infra?.websocket ?? "operational") : "offline"}       loading={infraLoading} icon={Wifi}     />
            <ServiceStatus label="Market Feed"       status={infra?.marketFeed       ?? (connected ? "operational" : "degraded")} loading={infraLoading} icon={Activity} />
            <ServiceStatus label="Settlement Engine" status={infra?.settlementEngine ?? "operational"}                          loading={infraLoading} icon={Server}   />
            <ServiceStatus label="Ledger"            status={infra?.ledger           ?? "operational"}                          loading={infraLoading} icon={BookOpen} />
            <ServiceStatus label="Database"          status={infra?.database         ?? "operational"}                          loading={infraLoading} icon={Database} />
          </div>
        </Reveal>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* LIVE ACTIVITY FEED                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Reveal delay={0.05}>
          <SectionLabel label="Recent Activity" icon={Clock} color="#00d4ff" />
          <ActivityFeed
            orders={recentOrders ?? []}
            deposits={deposits}
            withdrawals={withdrawals}
            auditRows={auditRows}
          />
        </Reveal>

        <div className="h-8" />
      </main>
    </div>
  );
}
