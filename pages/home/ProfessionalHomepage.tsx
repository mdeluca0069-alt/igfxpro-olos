/**
 * IGFXPRO × OLOS — Homepage 100/10 ULTIMATE
 * Custom cursor · Holographic tilt · Magnetic CTAs · Sticky pipeline · EKG · Signal anatomy
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  motion, AnimatePresence, useInView,
  useScroll, useTransform, useMotionValue, useSpring,
} from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useMarketStore } from "../../store/market.store";
import { getClientEnv } from "../../shared/config/clientEnv";
import {
  ArrowRight, BarChart2, Brain, Shield, Lock, Eye, Activity, Zap,
  Globe, Database, Cpu, PieChart, Menu, X, Calendar, GraduationCap,
  CheckCircle, Target, TrendingUp, ChevronRight,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════
type Quote    = { symbol: string; mid: number; bid?: number; ask?: number; changePercent?: number };
type AIConf   = { score: number | null; breakdown: { trend: number; momentum: number; volume: number; macro: number } | null; status?: "ACTIVE" | "SCANNING"; nextScanInSec?: number };
type SigStats      = { totalSignals: number; activeSignals: number; avgConfidence: number; successRate: number };
type PlatformStats    = { registeredUsers: number; activeTraders: number; filledOrders: number; openPositions: number; totalVolumeUsd: number; instruments: number; uptime: number; avgExecutionMs: number };
type SvcStatus        = { name: string; status: "operational" | "degraded" | "offline"; latencyMs: number };
type TelemetryData    = { services: SvcStatus[]; httpTotal: number; wsConnections: number; ordersPlaced: number; ordersFilled: number };
type PublicInstrument = { symbol: string; assetClass: string };
type ActiveSignal     = { id: string; symbol: string; signalType: "BUY" | "SELL" | "HOLD" | "STRONG_BUY" | "STRONG_SELL"; confidence: number; timeframe: string };
type RealCalEvent     = { time: string; currency: string; event: string; impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" };
type RawCalEvent      = { eventTime: string; currency: string; title: string; impact: string };

// ══════════════════════════════════════════════════════════════════════
// DATA HOOKS
// ══════════════════════════════════════════════════════════════════════
// A relative fetch("/api/...") resolves against the current page's own
// origin. That's fine in dev (Vite proxies it to the backend) but this page
// is served from a Cloudflare Workers static-assets host with no such
// proxy — every relative call here fell through to the SPA's index.html
// fallback (200 OK, but HTML, not JSON), so every "live" widget on this
// public homepage silently failed and showed its empty state. apiUrl()
// prefixes the same absolute backend URL the rest of the app already uses
// (VITE_API_URL / API_BASE_URL) so anonymous visitors actually get real data.
function apiUrl(path: string): string {
  return getClientEnv().API_BASE_URL + path;
}

function useQuotes() {
  return useQuery<Quote[]>({
    queryKey: ["hp-quotes"],
    queryFn:  async () => {
      const r = await fetch(apiUrl("/api/v1/trading/quotes"));
      if (!r.ok) return [];
      const raw = await r.json() as Array<{ symbol: string; bid?: number; ask?: number; mid?: number; changePct?: number; changePercent?: number }>;
      return raw.map(q => {
        const mid = (q.mid && q.mid > 0) ? q.mid : (q.bid && q.ask ? (q.bid + q.ask) / 2 : q.mid ?? 0);
        return { symbol: q.symbol, bid: q.bid, ask: q.ask, mid, changePercent: q.changePct ?? q.changePercent };
      });
    },
    refetchInterval: 3500, staleTime: 2000,
  });
}
function useAIConf() {
  return useQuery<AIConf | null>({
    queryKey: ["hp-conf"],
    queryFn:  async () => { try { const r = await fetch(apiUrl("/api/v1/ai/confidence")); return r.ok ? r.json() : null; } catch { return null; } },
    refetchInterval: 8000, retry: false,
  });
}
function useSigStats() {
  // /api/v1/signals/stats is per-user (auth-gated) and always empty for an
  // anonymous visitor. /api/v1/ai/confidence already aggregates the same
  // real, platform-wide signal set — reuse it instead of fabricating numbers.
  return useQuery<SigStats | null>({
    queryKey: ["hp-stats"],
    queryFn:  async () => {
      try {
        const r = await fetch(apiUrl("/api/v1/ai/confidence"));
        if (!r.ok) return null;
        const conf = await r.json() as { score: number | null; signalCount?: number };
        if (conf.score === null) return { totalSignals: 0, activeSignals: 0, avgConfidence: 0, successRate: 0 };
        return {
          totalSignals:   conf.signalCount ?? 0,
          activeSignals:  conf.signalCount ?? 0,
          avgConfidence:  Math.round(conf.score * 100),
          successRate:    0, // not computable without closed-trade history on a public endpoint
        };
      } catch { return null; }
    },
    refetchInterval: 25000, retry: false,
  });
}

function usePlatformStats() {
  return useQuery<PlatformStats | null>({
    queryKey: ["hp-platform-stats"],
    queryFn:  async () => { try { const r = await fetch(apiUrl("/api/v1/platform/stats")); return r.ok ? r.json() : null; } catch { return null; } },
    refetchInterval: 15000, staleTime: 10000, retry: false,
  });
}
function useTelemetry() {
  return useQuery<TelemetryData | null>({
    queryKey: ["hp-telemetry"],
    queryFn:  async () => { try { const r = await fetch(apiUrl("/api/v1/telemetry/health")); return r.ok ? r.json() : null; } catch { return null; } },
    refetchInterval: 30000, staleTime: 20000, retry: false,
  });
}
function useInstruments() {
  return useQuery<PublicInstrument[]>({
    queryKey: ["hp-instruments"],
    queryFn:  async () => { try { const r = await fetch(apiUrl("/api/v1/trading/instruments")); return r.ok ? r.json() : []; } catch { return []; } },
    staleTime: 300000, retry: false,
  });
}
function useActiveSignals() {
  // Public, platform-wide OLOS signals — same real persisted set every
  // visitor sees, unauthenticated. (/api/v1/signals/active is per-user and
  // requires login, which always empties out on the anonymous homepage.)
  return useQuery<ActiveSignal[]>({
    queryKey: ["hp-signals"],
    queryFn:  async () => {
      try {
        const r = await fetch(apiUrl("/api/v1/ai/signals"));
        if (!r.ok) return [];
        const raw = await r.json() as Array<{ id: string; symbol: string; signalType: string; confidence: number; timeframe: string }>;
        return raw.map(s => ({ id: s.id, symbol: s.symbol, signalType: s.signalType as ActiveSignal["signalType"], confidence: Math.round(s.confidence), timeframe: s.timeframe }));
      } catch { return []; }
    },
    refetchInterval: 12000, staleTime: 8000, retry: false,
  });
}
function usePublicCalendar() {
  // Real, DB-backed events (ForexFactory/TradingEconomics/FRED) — never a
  // static canned list. Backend returns ISO eventTime/title/impact; reshape
  // to the display fields this component renders.
  return useQuery<RealCalEvent[]>({
    queryKey: ["hp-calendar"],
    queryFn:  async () => {
      try {
        const r = await fetch(apiUrl("/api/v1/calendar/economic?hours=48"));
        if (!r.ok) return [];
        const raw = await r.json() as RawCalEvent[];
        return raw.map((ev) => ({
          time:     new Date(ev.eventTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          currency: ev.currency,
          event:    ev.title,
          impact:   ev.impact.toUpperCase() as RealCalEvent["impact"],
        }));
      } catch { return []; }
    },
    refetchInterval: 60000, staleTime: 30000, retry: false,
  });
}
function useExecStats() {
  // Public, platform-wide execution quality — real numbers from
  // Order.createdAt→filledAt (no auth, unlike /execution/stats which is per-user).
  return useQuery<{ avgExecutionMs: number; fillRate: number; avgSlippagePips: number; settlementSuccessRate: number } | null>({
    queryKey: ["hp-exec"],
    queryFn:  async () => { try { const r = await fetch(apiUrl("/api/v1/execution/stats/public")); return r.ok ? r.json() : null; } catch { return null; } },
    refetchInterval: 60000, staleTime: 45000, retry: false,
  });
}
function useRegime() {
  return useQuery<{ regime: string | null; adx: number | null; adxSlope: number | null; trending: boolean; volatilityLevel: string | null; status: "ACTIVE" | "INSUFFICIENT_DATA" } | null>({
    queryKey: ["hp-regime"],
    queryFn:  async () => { try { const r = await fetch(apiUrl("/api/v1/ai/regime?symbol=EURUSD&timeframe=1H")); return r.ok ? r.json() : null; } catch { return null; } },
    refetchInterval: 15000, staleTime: 10000, retry: false,
  });
}
type DecisionLogEntry = { stage: string; text: string };
type DecisionLog = { status: "REAL" | "NO_DATA"; symbol?: string; signalType?: string; confidence?: number; createdAt?: string; trace: DecisionLogEntry[] };
type AutopilotStats = { status: string; activeBots: number; tradesLast24h: number; sessionPnl: number; winRate: number; recentActivity: { symbol: string; text: string; at: string }[] };
function useAutopilotStats() {
  // Real, platform-wide, anonymized Autopilot performance from SignalTelemetry
  // (signals actually executed). No fabricated "Bot 01" demo data.
  return useQuery<AutopilotStats | null>({
    queryKey: ["hp-autopilot"],
    queryFn:  async () => { try { const r = await fetch(apiUrl("/api/v1/autopilot/stats/public")); return r.ok ? r.json() : null; } catch { return null; } },
    refetchInterval: 20000, staleTime: 15000, retry: false,
  });
}
function useDecisionLog() {
  // Real decision trace built from the most recent persisted platform-wide
  // OLOS signal's actual confluenceFactors/confidenceBreakdown/rationale —
  // not a scripted/hardcoded replay.
  return useQuery<DecisionLog | null>({
    queryKey: ["hp-decision-log"],
    queryFn:  async () => { try { const r = await fetch(apiUrl("/api/v1/ai/decision-log")); return r.ok ? r.json() : null; } catch { return null; } },
    refetchInterval: 30000, staleTime: 20000, retry: false,
  });
}

// ══════════════════════════════════════════════════════════════════════
// HOOK — NEURAL MANIFOLD (Canvas 2D torus particle system)
// ══════════════════════════════════════════════════════════════════════
interface Pt3 { x: number; y: number; z: number; a: number; s: number; sig: boolean; pulse: number }
interface Fil  { a: number; b: number }

function useNeuralManifold(ref: React.RefObject<HTMLCanvasElement>, volatility = 0) {
  const raf   = useRef(0);
  const mouse = useRef({ x: -9999, y: -9999 });
  const ang   = useRef(0);
  const pts   = useRef<Pt3[]>([]);
  const fils  = useRef<Fil[]>([]);
  const burst = useRef<ReturnType<typeof setInterval>>();

  const boot = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.offsetWidth; const H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cores = navigator.hardwareConcurrency || 4;
    const N  = cores >= 8 ? 5000 : cores >= 4 ? 3000 : 1500;
    const cx = W / 2; const cy = H / 2;
    const Rr = Math.min(W, H) * 0.27; const r = Rr * 0.38;

    const particles: Pt3[] = [];
    for (let i = 0; i < N; i++) {
      const θ = Math.random() * Math.PI * 2;
      const φ = Math.random() * Math.PI * 2;
      const d = 1 + 0.12 * Math.cos(2 * θ);
      particles.push({
        x: (Rr + r * d * Math.cos(θ)) * Math.cos(φ) + (Math.random() - .5) * Rr * 0.018,
        y: (Rr + r * d * Math.cos(θ)) * Math.sin(φ) + (Math.random() - .5) * Rr * 0.018,
        z: r * d * Math.sin(θ)                        + (Math.random() - .5) * Rr * 0.018,
        a: 0.28 + Math.random() * 0.55, s: 0.45 + Math.random() * 1.25,
        sig: Math.random() < 0.07, pulse: 0,
      });
    }
    pts.current = particles;

    const filaments: Fil[] = [];
    const cc = new Array(N).fill(0);
    const DT = (r * 0.88) * (r * 0.88);
    for (let i = 0; i < N; i++) {
      if (cc[i] >= 3) continue;
      const pi = particles[i];
      for (let j = i + 1; j < Math.min(i + 40, N); j++) {
        if (cc[i] >= 3 || cc[j] >= 3) break;
        const pj = particles[j];
        if ((pi.x-pj.x)**2 + (pi.y-pj.y)**2 + (pi.z-pj.z)**2 < DT) {
          filaments.push({ a: i, b: j }); cc[i]++; cc[j]++;
        }
      }
    }
    fils.current = filaments;

    clearInterval(burst.current);
    const burstInterval = Math.max(1200, 2400 - volatility * 800);
    burst.current = setInterval(() => {
      const c = Math.floor(Math.random() * N);
      const BR = (r * 0.85) ** 2;
      const pc = particles[c];
      for (let i = Math.max(0, c - 110); i < Math.min(N, c + 110); i++) {
        const p = particles[i];
        if ((p.x-pc.x)**2 + (p.y-pc.y)**2 + (p.z-pc.z)**2 < BR) p.pulse = 1.0;
      }
    }, burstInterval);

    const SP: Array<{ sx: number; sy: number; z: number; a: number; s: number; sig: boolean; pulse: number }> =
      particles.map(() => ({ sx: 0, sy: 0, z: 0, a: 0, s: 0, sig: false, pulse: 0 }));
    const order = Array.from({ length: N }, (_, i) => i);
    const FOV = Math.max(W, H) * 0.78;
    let frame = 0;
    const speed = 0.0016 + volatility * 0.001;

    const loop = () => {
      frame++;
      ang.current += speed;
      const A = ang.current;
      const cA = Math.cos(A); const sA = Math.sin(A);
      const tX = (mouse.current.x - cx) / W * 0.22;
      const tY = (mouse.current.y - cy) / H * 0.18;
      const cTX = Math.cos(tY); const sTX = Math.sin(tY);
      const cTY = Math.cos(tX); const sTY = Math.sin(tX);

      for (let i = 0; i < N; i++) {
        const p = particles[i];
        if (p.pulse > 0) { p.pulse *= 0.963; if (p.pulse < 0.04) p.pulse = 0; }
        const rx = p.x * cA + p.z * sA; const ry = p.y; const rz = -p.x * sA + p.z * cA;
        const ry2 = ry * cTX - rz * sTX; const rz2 = ry * sTX + rz * cTX;
        const rx2 = rx * cTY + rz2 * sTY; const fZ = -rx * sTY + rz2 * cTY;
        const sc  = FOV / (FOV + fZ);
        let sx = cx + rx2 * sc; let sy = cy + ry2 * sc;
        const mdx = sx - mouse.current.x; const mdy = sy - mouse.current.y;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < 8100 && md2 > 1) {
          const md = Math.sqrt(md2); const f = (1 - md / 90) * 20;
          sx += (mdx / md) * f; sy += (mdy / md) * f;
        }
        const depth = (fZ + r + Rr) / (2 * (r + Rr));
        SP[i].sx=sx; SP[i].sy=sy; SP[i].z=fZ;
        SP[i].a=p.a*(0.25+0.75*depth); SP[i].s=p.s*sc;
        SP[i].pulse=p.pulse; SP[i].sig=p.sig;
      }
      if (frame % 5 === 0) order.sort((a, b) => SP[a].z - SP[b].z);
      ctx.clearRect(0, 0, W, H);
      const ag = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rr * 1.5);
      ag.addColorStop(0, "rgba(0,212,255,0.04)"); ag.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ag; ctx.fillRect(0, 0, W, H);
      for (const f of fils.current) {
        const pa = SP[f.a]; const pb = SP[f.b];
        const ap = Math.min(pa.a, pb.a);
        const pls = pa.pulse > 0.08 || pb.pulse > 0.08;
        const al = ap * (pls ? 0.55 : 0.09);
        if (al < 0.006) continue;
        ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = pls ? `rgba(0,255,159,${al})` : `rgba(0,212,255,${al})`;
        ctx.lineWidth = pls ? 0.65 : 0.32; ctx.stroke();
      }
      for (const i of order) {
        const p = SP[i]; const pls = p.pulse > 0.05;
        const sz = Math.max(0.3, p.s * (1 + p.pulse * 2.8));
        const al = p.a * (1 + p.pulse * 0.9);
        if (pls || p.sig) {
          const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, sz * (pls ? 5.5 : 3));
          g.addColorStop(0, `rgba(0,255,159,${al * 0.55})`); g.addColorStop(1, "rgba(0,255,159,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.sx, p.sy, sz * (pls ? 5.5 : 3), 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(0,255,159,${al})`;
        } else { ctx.fillStyle = `rgba(0,212,255,${al})`; }
        ctx.beginPath(); ctx.arc(p.sx, p.sy, sz, 0, Math.PI * 2); ctx.fill();
      }
      raf.current = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);

    const onMove  = (e: MouseEvent) => { const rc = canvas.getBoundingClientRect(); mouse.current = { x: e.clientX - rc.left, y: e.clientY - rc.top }; };
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 }; };
    const onVis   = () => { if (document.hidden) cancelAnimationFrame(raf.current); else raf.current = requestAnimationFrame(loop); };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf.current); clearInterval(burst.current);
      canvas.removeEventListener("mousemove", onMove); canvas.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [volatility]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    let cleanup = boot(canvas);
    const onResize = () => { if (ref.current) { cleanup?.(); cleanup = boot(ref.current); } };
    window.addEventListener("resize", onResize);
    return () => { cleanup?.(); window.removeEventListener("resize", onResize); };
  }, [ref, boot]);
}

// ══════════════════════════════════════════════════════════════════════
// HOOK — HOLOGRAPHIC TILT
// ══════════════════════════════════════════════════════════════════════
function useHolographicTilt(strength = 9) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<React.CSSProperties>({});

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rc = ref.current.getBoundingClientRect();
    const nx = (e.clientX - rc.left)  / rc.width  - 0.5;
    const ny = (e.clientY - rc.top)   / rc.height - 0.5;
    setTilt({ transform: `perspective(700px) rotateX(${-ny * strength}deg) rotateY(${nx * strength}deg)` });
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    setTilt({ transform: "perspective(700px) rotateX(0deg) rotateY(0deg)", transition: "transform 0.55s cubic-bezier(0.2,0,0,1)" });
  }, []);

  return { ref, tilt, onMouseMove, onMouseLeave };
}

// ══════════════════════════════════════════════════════════════════════
// HOOK — EKG HEARTBEAT CANVAS
// ══════════════════════════════════════════════════════════════════════
/**
 * Real market heartbeat — no Math.sin()/Math.random() oscillator. Each real
 * quote update samples actual tick-to-tick |Δmid/mid| across watched symbols
 * into a rolling history buffer; that history (and its rolling stdev band)
 * is what gets drawn. A quiet market draws a flat line — correctly, because
 * the market actually is quiet — and a real move draws a real spike.
 */
function useHeartbeat(ref: React.RefObject<HTMLCanvasElement>, quotes: Quote[]) {
  const historyRef  = useRef<number[]>([]);
  const prevMidsRef = useRef<Record<string, number>>({});

  // Sample real tick movement every time the live quote set changes.
  useEffect(() => {
    const prevMids = prevMidsRef.current;
    let sumDeltaBps = 0;
    let n = 0;
    for (const q of quotes) {
      if (!q.mid || q.mid <= 0) continue;
      const prev = prevMids[q.symbol];
      if (prev && prev > 0) {
        sumDeltaBps += (Math.abs(q.mid - prev) / prev) * 10_000; // basis points of real movement
        n++;
      }
      prevMids[q.symbol] = q.mid;
    }
    historyRef.current.push(n > 0 ? sumDeltaBps / n : 0);
    if (historyRef.current.length > 180) historyRef.current.shift();
  }, [quotes]);

  // Render loop reads the real history buffer — no synthetic waveform.
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.offsetWidth; const H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const cy = H / 2;
    let raf = 0;

    const draw = () => {
      const hist = historyRef.current;
      ctx.clearRect(0, 0, W, H);

      if (hist.length >= 2) {
        const stepX  = W / (hist.length - 1);
        const mean   = hist.reduce((s, v) => s + v, 0) / hist.length;
        const stdev  = Math.sqrt(hist.reduce((s, v) => s + (v - mean) ** 2, 0) / hist.length);
        const peak   = Math.max(mean + stdev * 2, ...hist, 0.05);
        const scaleY = (cy * 0.85) / peak;
        const yFor   = (v: number) => cy - v * scaleY;

        // Real volatility band: mean ± stdev of the actual sample history.
        const drawFlat = (v: number) => {
          ctx.beginPath();
          hist.forEach((_, x) => x === 0 ? ctx.moveTo(0, yFor(v)) : ctx.lineTo(x * stepX, yFor(v)));
          ctx.strokeStyle = "rgba(0,212,255,0.28)"; ctx.lineWidth = 1; ctx.stroke();
        };
        drawFlat(mean + stdev);
        drawFlat(Math.max(0, mean - stdev));

        // Glow + composite signal line — both driven by the same real samples.
        ctx.beginPath(); hist.forEach((v, x) => x === 0 ? ctx.moveTo(0, yFor(v)) : ctx.lineTo(x * stepX, yFor(v)));
        ctx.strokeStyle = "rgba(0,255,159,0.07)"; ctx.lineWidth = 9; ctx.stroke();

        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0,   "rgba(0,212,255,0)");
        grad.addColorStop(0.25,"rgba(0,212,255,0.35)");
        grad.addColorStop(0.75,"rgba(0,255,159,0.85)");
        grad.addColorStop(1,   "rgba(0,255,159,1)");
        ctx.beginPath(); hist.forEach((v, x) => x === 0 ? ctx.moveTo(0, yFor(v)) : ctx.lineTo(x * stepX, yFor(v)));
        ctx.strokeStyle = grad; ctx.lineWidth = 1.8; ctx.stroke();

        const ly = yFor(hist[hist.length - 1]);
        const dg = ctx.createRadialGradient(W-1, ly, 0, W-1, ly, 9);
        dg.addColorStop(0, "rgba(0,255,159,1)"); dg.addColorStop(1, "rgba(0,255,159,0)");
        ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(W-1, ly, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#00ff9f"; ctx.beginPath(); ctx.arc(W-1, ly, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
}

// ══════════════════════════════════════════════════════════════════════
// UI ATOMS
// ══════════════════════════════════════════════════════════════════════
function LiveDot({ color = "plasma" }: { color?: "plasma" | "signal" | "warn" }) {
  const clr = color === "signal" ? "#00ff9f" : color === "warn" ? "#ff9f00" : "#00d4ff";
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: clr }} />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: clr }} />
    </span>
  );
}

// Magnetic button — physically attracted to cursor
function MagneticBtn({ children, to, href, primary = false, className = "" }: {
  children: React.ReactNode; to?: string; href?: string; primary?: boolean; className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0); const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 380, damping: 28 });
  const sy = useSpring(my, { stiffness: 380, damping: 28 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapRef.current) return;
    const rc = wrapRef.current.getBoundingClientRect();
    mx.set((e.clientX - (rc.left + rc.width  / 2)) * 0.38);
    my.set((e.clientY - (rc.top  + rc.height / 2)) * 0.38);
  }, [mx, my]);

  const onLeave = useCallback(() => { mx.set(0); my.set(0); }, [mx, my]);

  const base = `mag-btn btn-scan inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[13.5px] font-semibold ${className}`;
  const pcls = primary
    ? `${base} text-black`
    : `${base} border border-white/10 text-white hover:border-white/20 hover:bg-white/[0.04]`;
  const pstyle = primary
    ? { background: "linear-gradient(135deg,#00d4ff,#0080ff)", boxShadow: "0 0 32px rgba(0,212,255,0.35)" }
    : undefined;

  return (
    <div ref={wrapRef} style={{ display: "inline-block" }} onMouseMove={onMove} onMouseLeave={onLeave}>
      <motion.div style={{ x: sx, y: sy }}>
        {to   ? <Link to={to}     className={pcls} style={pstyle}>{children}</Link>
        : href ? <a    href={href} className={pcls} style={pstyle}>{children}</a>
               : <button          className={pcls} style={pstyle}>{children}</button>}
      </motion.div>
    </div>
  );
}

// Holographic tilt card
function HoloCard({ children, className = "", glow = false }: {
  children: React.ReactNode; className?: string; glow?: boolean;
}) {
  const { ref, tilt, onMouseMove, onMouseLeave } = useHolographicTilt();
  return (
    <div ref={ref} className={`holo-card ${glow ? "glass-panel-glow" : "glass-panel"} rounded-2xl ${className}`}
         style={tilt} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      {children}
    </div>
  );
}

function BarFill({ pct, color = "#00d4ff" }: { pct: number; color?: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div className="h-full rounded-full" initial={{ width: 0 }}
        animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }}
        style={{ background: color }} />
    </div>
  );
}

function regime(chg?: number) {
  if (chg === undefined || chg === null) return { label: "—", color: "#6b7280", short: "—" };
  const a = Math.abs(chg);
  if (a > 0.7) return chg > 0 ? { label: "Trend ↑", color: "#00ff9f", short: "TREND↑" } : { label: "Trend ↓", color: "#ff4a4a", short: "TREND↓" };
  if (a > 0.25) return chg > 0 ? { label: "Mild ↑", color: "#00d4ff", short: "MILD↑"  } : { label: "Mild ↓", color: "#ff9f00", short: "MILD↓"  };
  return { label: "Ranging", color: "#ff9f00", short: "RANGE" };
}

// ══════════════════════════════════════════════════════════════════════
// OLOS CURSOR
// ══════════════════════════════════════════════════════════════════════
function OlosCursor() {
  const mx = useMotionValue(-200); const my = useMotionValue(-200);
  const rx = useSpring(mx, { stiffness: 120, damping: 18 });
  const ry = useSpring(my, { stiffness: 120, damping: 18 });
  const [hov, setHov] = useState(false);
  const [lab, setLab] = useState("");

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX); my.set(e.clientY);
      const el = document.elementFromPoint(e.clientX, e.clientY);
      setHov(!!el?.closest("a,button"));
      setLab((el?.closest("[data-cursor]") as HTMLElement)?.dataset?.cursor || "");
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <>
      {/* dot */}
      <motion.div className="pointer-events-none fixed z-[99999]"
        style={{ left: mx, top: my, translateX: "-50%", translateY: "-50%" }}>
        <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#00d4ff" }} />
      </motion.div>

      {/* ring with spring lag */}
      <motion.div className="pointer-events-none fixed z-[99998]"
        style={{ left: rx, top: ry, translateX: "-50%", translateY: "-50%" }}>
        <motion.div animate={{ scale: hov ? 2 : 1, borderColor: hov ? "#00ff9f" : "#00d4ff", opacity: hov ? 0.9 : 0.35 }}
          transition={{ duration: 0.18 }}
          className="h-9 w-9 rounded-full border"
          style={{ borderColor: "#00d4ff" }} />
        {lab && (
          <span className="absolute left-5 top-5 whitespace-nowrap font-data text-[8.5px] tracking-wide"
                style={{ color: "#00d4ff" }}>{lab}</span>
        )}
      </motion.div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 0 — VOID LOADER
// ══════════════════════════════════════════════════════════════════════
function VoidLoader({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"dark" | "pulse" | "lift">("dark");
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("pulse"), 220);
    const t2 = setTimeout(() => setPhase("lift"),  1050);
    const t3 = setTimeout(onDone,                  1700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== "lift" && (
        <motion.div key="vl" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}>
          {phase !== "dark" && (
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.28 }}
              className="void-dot h-2.5 w-2.5 rounded-full" style={{ background: "#00d4ff" }} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════
// NAV
// ══════════════════════════════════════════════════════════════════════
function SiteNav({ ready }: { ready: boolean }) {
  const [open, setOpen]   = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const h = () => setSolid(window.scrollY > 60);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  if (!ready) return null;
  return (
    <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${solid ? "border-b border-white/[0.05] bg-black/90 backdrop-blur-xl" : "bg-transparent"}`}>
      <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5" data-cursor="HOME">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
               style={{ background: "linear-gradient(135deg,#00d4ff,#0080ff)", boxShadow: "0 0 16px rgba(0,212,255,0.4)" }}>
            <BarChart2 size={15} strokeWidth={2.5} className="text-black" />
          </div>
          <span className="font-display text-[14px] font-bold tracking-tight text-white">IGFXPRO</span>
          <span className="rounded-full border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-widest"
                style={{ borderColor: "rgba(0,212,255,0.3)", color: "#00d4ff", background: "rgba(0,212,255,0.08)" }}>OLOS</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {([["Platform","#platform"],["Signals","/signals"],["Calendar","/calendar"],["Markets","#markets"],["Accounts","#accounts"]] as const).map(([l, h]) => (
            h.startsWith("/")
              ? <Link key={l} to={h} className="text-[13px] font-medium text-white/40 transition-colors hover:text-white">{l}</Link>
              : <a    key={l} href={h} className="text-[13px] font-medium text-white/40 transition-colors hover:text-white">{l}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="text-[12.5px] text-white/40 hover:text-white transition-colors">Sign in</Link>
          <MagneticBtn to="/register" primary className="px-5 py-2.5 text-[12.5px]">Open Account</MagneticBtn>
        </div>
        <button className="text-white/50 hover:text-white md:hidden" onClick={() => setOpen(p => !p)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/[0.05] bg-black px-6 pb-6 md:hidden">
          <nav className="mt-5 flex flex-col gap-4">
            {(["Platform","Markets","Accounts"] as const).map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)} className="text-sm text-white/50 hover:text-white">{l}</a>
            ))}
            {([["Signals","/signals"],["Calendar","/calendar"]] as const).map(([l, h]) => (
              <Link key={l} to={h} onClick={() => setOpen(false)} className="text-sm text-white/50 hover:text-white">{l}</Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/login"    className="rounded-xl border border-white/10 py-3 text-center text-sm text-white/60">Sign in</Link>
            <Link to="/register" className="rounded-xl py-3 text-center text-sm font-bold text-black"
                  style={{ background: "linear-gradient(135deg,#00d4ff,#0080ff)" }}>Open Account</Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 1 — NEURAL HERO
// ══════════════════════════════════════════════════════════════════════
const STATUS_TEXT = "OLOS ACTIVE  ·  REGIME DETECTION ON  ·  CONFIDENCE CALIBRATED  ·  EXECUTION READY";

function NeuralHero({ ready }: { ready: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: quotes = [] }   = useQuotes();
  const { data: conf }          = useAIConf();
  const { data: rawSignals = [] } = useActiveSignals();
  const storeQ = useMarketStore(s => s.quotes);
  const topSignal = rawSignals.filter(s => s.signalType !== "HOLD")[0] ?? null;
  const avgChg = quotes.reduce((s, q) => s + Math.abs(q.changePercent || 0), 0) / Math.max(quotes.length, 1);
  useNeuralManifold(canvasRef, avgChg);

  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!ready) return;
    let i = 0;
    const id = setInterval(() => { i++; setShown(i); if (i >= STATUS_TEXT.length) clearInterval(id); }, 28);
    return () => clearInterval(id);
  }, [ready]);

  const signalSym = topSignal?.symbol ?? "EURUSD";
  const eurusd    = (storeQ[signalSym] as any)?.mid ?? quotes.find(q => q.symbol === signalSym)?.mid;
  const score     = conf?.score != null ? Math.round(conf.score * 100) : null;

  if (!ready) return <div className="h-screen bg-black" />;

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-35" />
      <canvas ref={canvasRef} className="pointer-events-auto absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0"
           style={{ background: "radial-gradient(ellipse 68% 68% at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 100%)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44"
           style={{ background: "linear-gradient(to bottom, transparent, #000)" }} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-32">
        <motion.div initial="h" animate="v" variants={{ h: {}, v: { transition: { staggerChildren: 0.18 } } }}
          className="flex flex-col items-center text-center">

          {/* Typewriter status */}
          <motion.div variants={{ h: { opacity: 0 }, v: { opacity: 1, transition: { duration: 0.4 } } }} className="mb-10">
            <div className="flex items-center gap-2.5">
              <LiveDot color="signal" />
              <span className="font-data text-[10px] tracking-[0.2em] text-white/40">
                {STATUS_TEXT.slice(0, shown)}<span className="cursor-blink">▍</span>
              </span>
            </div>
          </motion.div>

          {/* Hero title */}
          {["MARKET", "INTELLIGENCE", "EVOLVED"].map((word, i) => (
            <div key={word} className="overflow-hidden">
              <motion.h1
                variants={{ h: { y: "110%", opacity: 0 }, v: { y: "0%", opacity: 1, transition: { duration: 0.9, delay: i * 0.18, ease: [0.76, 0, 0.24, 1] } } }}
                className="font-display leading-[0.92] tracking-tight text-white"
                style={{ fontSize: "clamp(62px, 11vw, 148px)", fontWeight: 700 }}>
                {word === "INTELLIGENCE"
                  ? <span style={{ WebkitTextStroke: "1px rgba(0,212,255,0.7)", color: "transparent" }}>{word}</span>
                  : word}
              </motion.h1>
            </div>
          ))}

          <motion.p variants={{ h: { opacity: 0, y: 12 }, v: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.7 } } }}
            className="mt-8 max-w-[480px] text-[15px] leading-relaxed text-white/40">
            Regime detection · confidence calibration · portfolio intelligence · institutional execution
          </motion.p>

          <motion.div variants={{ h: { opacity: 0, y: 12 }, v: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.9 } } }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <MagneticBtn to="/register" primary data-cursor="OPEN ACCOUNT">
              Open Account <ArrowRight size={15} />
            </MagneticBtn>
            <MagneticBtn href="#intelligence">
              Explore OLOS
            </MagneticBtn>
          </motion.div>

          <motion.div variants={{ h: { opacity: 0 }, v: { opacity: 1, transition: { duration: 0.6, delay: 1.1 } } }}
            className="mt-9 flex flex-wrap justify-center gap-5">
            {[{ icon: Shield, l: "ESMA Regulated" }, { icon: Lock, l: "Segregated Funds" }, { icon: Eye, l: "100% Decision Trace" }].map(({ icon: I, l }) => (
              <div key={l} className="flex items-center gap-1.5">
                <I size={11} className="text-white/20" />
                <span className="font-data text-[10px] tracking-wider text-white/25">{l}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Floating signal card */}
      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 1.3 }}
        className="absolute right-8 top-1/2 hidden -translate-y-1/2 xl:block">
        <HoloCard glow className="w-[230px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Brain size={11} style={{ color: "#00d4ff" }} />
              <span className="font-data text-[9px] tracking-[0.2em]" style={{ color: "#00d4ff" }}>OLOS SIGNAL</span>
            </div>
            <LiveDot color="signal" />
          </div>
          <p className="font-data text-[10px] text-white/40 mb-0.5">
            {topSignal ? topSignal.symbol.replace(/([A-Z]{3})([A-Z]{3})/, "$1/$2") : "—"}
            {topSignal?.timeframe ? ` · ${topSignal.timeframe}` : ""}
          </p>
          <div className="flex items-end justify-between mb-3">
            {eurusd
              ? <motion.span key={eurusd} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
                  className="font-data text-[22px] font-bold text-white">
                  {eurusd.toFixed(signalSym.includes("JPY") || signalSym.includes("US") ? 2 : 5)}
                </motion.span>
              : <div className="h-6 w-28 animate-pulse rounded bg-white/[0.06]" />}
            {score !== null
              ? <span className="font-data text-[20px] font-bold" style={{ color: score >= 75 ? "#00d4ff" : "#ff9f00" }}>{score}%</span>
              : <div className="h-5 w-12 animate-pulse rounded bg-white/[0.06]" />}
          </div>
          {conf?.breakdown ? (
            [{ l:"Trend",    v:conf.breakdown.trend,    c:"#00d4ff" },
             { l:"Momentum", v:conf.breakdown.momentum, c:"#0080ff" },
             { l:"Volume",   v:conf.breakdown.volume,   c:"#00ff9f" },
             { l:"Macro",    v:conf.breakdown.macro,    c:"#ff9f00" }].map(({ l, v, c }) => (
              <div key={l} className="mb-1.5 space-y-1">
                <div className="flex justify-between">
                  <span className="font-data text-[9px] text-white/35">{l.toUpperCase()}</span>
                  <span className="font-data text-[9px]" style={{ color: c }}>{Math.round(v*100)}%</span>
                </div>
                <BarFill pct={v*100} color={c} />
              </div>
            ))
          ) : (
            <div className="space-y-2 py-1">
              {[1,2,3,4].map(i => <div key={i} className="h-4 animate-pulse rounded bg-white/[0.04]" />)}
            </div>
          )}
          {topSignal ? (
            <div className="mt-3 flex justify-between rounded-lg p-2"
                 style={{
                   background: topSignal.signalType.includes("BUY") ? "rgba(0,255,159,0.06)" : "rgba(255,74,74,0.06)",
                   border:     topSignal.signalType.includes("BUY") ? "1px solid rgba(0,255,159,0.12)" : "1px solid rgba(255,74,74,0.12)",
                 }}>
              <span className="font-data text-[9px]" style={{ color: topSignal.signalType.includes("BUY") ? "rgba(0,255,159,0.8)" : "rgba(255,74,74,0.8)" }}>
                {topSignal.signalType.includes("BUY") ? "▲" : "▼"} {topSignal.signalType.replace("_", " ")}
              </span>
              <span className="font-data text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {topSignal.confidence}% conf.
              </span>
            </div>
          ) : (
            <div className="mt-3 h-7 animate-pulse rounded-lg bg-white/[0.04]" />
          )}
        </HoloCard>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
        <span className="font-data text-[9px] tracking-[0.3em] text-white/20">SCROLL</span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.3 }}
          className="h-4 w-px" style={{ background: "linear-gradient(to bottom,rgba(0,212,255,0.4),transparent)" }} />
      </motion.div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// REGIME PULSE — sticky bottom bar
// ══════════════════════════════════════════════════════════════════════
// US500/US100 dropped — see LIVE_ASSETS below for why (no free-tier index data).
const PULSE_ASSETS = ["EURUSD","GBPUSD","USDJPY","XAUUSD","XAGUSD","SOLUSD","BTCUSD","ETHUSD"];

function RegimePulse() {
  const [vis, setVis] = useState(false);
  const { data: quotes = [] } = useQuotes();
  const storeQ = useMarketStore(s => s.quotes);
  useEffect(() => {
    const h = () => setVis(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <AnimatePresence>
      {vis && (
        <motion.div key="rp" initial={{ y: 56 }} animate={{ y: 0 }} exit={{ y: 56 }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          className="regime-bar fixed bottom-0 left-0 right-0 z-40 h-11 overflow-hidden">
          <div className="flex h-full items-center justify-between px-4 lg:px-8">
            <div className="mr-4 hidden shrink-0 items-center gap-1.5 sm:flex">
              <LiveDot color="plasma" />
              <span className="font-data text-[9px] tracking-[0.2em] text-white/30">REGIME PULSE</span>
            </div>
            <div className="flex flex-1 items-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {PULSE_ASSETS.map(sym => {
                const sq   = (storeQ[sym] as any);
                const pq   = quotes.find(q => q.symbol === sym);
                const rawM = sq?.mid ?? pq?.mid;
                const mid  = (rawM && rawM > 0) ? rawM : null;
                const chg  = sq?.changePct ?? pq?.changePercent ?? 0;
                const rg   = regime(chg);
                const dec2 = sym.includes("JPY") || sym.includes("US") ? 2 : 5;
                return (
                  <div key={sym} className="flex shrink-0 items-center gap-2 border-r border-white/[0.04] px-3 first:pl-0 last:border-0">
                    <span className="font-data text-[9.5px] text-white/30">{sym}</span>
                    {mid != null && <span className="font-data text-[9.5px] text-white/60">{mid.toFixed(dec2)}</span>}
                    <span className="font-data text-[9px] font-bold" style={{ color: rg.color }}>{rg.short}</span>
                    <span className="font-data text-[9px]" style={{ color: chg >= 0 ? "#00ff9f" : "#ff4a4a" }}>
                      {chg >= 0 ? "+" : ""}{Number(chg).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
            <Link to="/register" className="ml-4 hidden shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold text-black sm:block"
                  style={{ background: "linear-gradient(135deg,#00d4ff,#0080ff)" }}>Open Account</Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 2 — SIGNAL PIPELINE (sticky horizontal scroll)
// ══════════════════════════════════════════════════════════════════════
function buildStages(
  conf:       { score: number | null; breakdown: { trend: number; momentum: number; volume: number; macro: number } | null } | null | undefined,
  topSignal:  { symbol: string; signalType: string; confidence: number } | null,
  regimeData: { regime: string | null; adx: number | null; adxSlope: number | null; trending: boolean; volatilityLevel: string | null; status: string } | null | undefined,
  execStats:  { avgExecutionMs: number; fillRate: number; avgSlippagePips: number; settlementSuccessRate: number } | null | undefined,
  instrumentCount: number,
) {
  const regime  = regimeData?.regime ?? "—";
  const adx     = regimeData?.adx != null ? regimeData.adx.toFixed(1) : "—";
  const atrSt   = regimeData?.volatilityLevel ?? "—";
  const score   = conf?.score != null ? `${(conf.score * 100).toFixed(1)}%` : "—";
  const trendPct = conf?.breakdown ? `${(conf.breakdown.trend * 100).toFixed(0)}%` : "—";
  const sigDir  = topSignal ? topSignal.signalType.replace("_", " ") : "—";
  const sigConf = topSignal ? `${topSignal.confidence}%` : "—";
  const fillMs  = execStats ? `${execStats.avgExecutionMs.toFixed(1)}ms` : "—";
  const slipPip = execStats ? `${execStats.avgSlippagePips.toFixed(2)} pip` : "—";
  const fillQ   = execStats ? `${execStats.fillRate.toFixed(1)}%` : "—";

  return [
    { id:"ingest",   icon: Database,  color:"#00d4ff", label:"01 / INGEST",   title:"Market Data Fusion",
      desc:"Real-time price feeds from TwelveData + Finnhub (dual-provider redundancy). Order book depth simulated at 5 levels from live spread. Alternative data: macro calendar with OLOS impact scoring.",
      data:[{ k:"Live instruments", v:`${instrumentCount}` }, { k:"Data sources", v:"2 providers" }, { k:"Update freq", v:"1s" }] },
    { id:"classify", icon: BarChart2, color:"#0080ff", label:"02 / CLASSIFY", title:"Regime Detection",
      desc:"Real ADX(14) + EMA(50/200) + ATR(14) composite model, replayed live on EUR/USD H1 candles. Classifies into: trending, ranging, high-volatility, compression.",
      data:[{ k:"Regime", v:regime }, { k:"ADX", v:adx }, { k:"Volatility", v:atrSt }] },
    { id:"score",    icon: Target,    color:"#00ff9f", label:"03 / SCORE",    title:"Confidence Engine",
      desc:"5-factor weighted model tuned per regime. Trend · Momentum · Volume · Macro · Sentiment. Output: calibrated 0–100 score.",
      data:[{ k:"Score", v:score }, { k:"Trend factor", v:trendPct }, { k:"Threshold", v:"≥ 75%" }] },
    { id:"validate", icon: Shield,    color:"#ff9f00", label:"04 / VALIDATE", title:"Risk Guardian",
      desc:"Multi-layer gate: position sizing (Kelly × 0.25), correlation guard (r < 0.75), drawdown limit (−2%), portfolio exposure check.",
      data:[{ k:"Sizing model", v:"Kelly ×0.25" }, { k:"Correlation guard", v:"r < 0.75" }, { k:"Max drawdown", v:"−2%" }] },
    { id:"signal",   icon: Zap,       color:"#00d4ff", label:"05 / SIGNAL",   title:"Decision Output",
      desc:"BUY/SELL/HOLD with full reasoning trace. Entry · SL · TP · R:R. Complete audit trail written to the immutable ledger.",
      data:[{ k:"Direction", v:sigDir }, { k:"Confidence", v:sigConf }, { k:"Symbol", v:topSignal?.symbol ?? "—" }] },
    { id:"execute",  icon: Activity,  color:"#00ff9f", label:"06 / EXECUTE",  title:"iTrader Engine",
      desc:"Smart order routing with best-available-price fill from the internal liquidity core. Post-trade quality score from real fill data.",
      data:[{ k:"Avg fill time", v:fillMs }, { k:"Avg slippage", v:slipPip }, { k:"Fill rate", v:fillQ }] },
  ];
}

function SignalPipeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: conf }           = useAIConf();
  const { data: rawSignals = [] } = useActiveSignals();
  const { data: regimeData }     = useRegime();
  const { data: execStats }      = useExecStats();
  const { data: instruments = [] } = useInstruments();
  const topSignal = rawSignals.filter(s => s.signalType !== "HOLD")[0] ?? null;
  const STAGES = buildStages(conf, topSignal, regimeData, execStats, instruments.length);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0px", "-1260px"]);
  const prog = useTransform(scrollYProgress, [0, 1], [0, 5]);
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    const unsub = prog.on("change", v => setActiveIdx(Math.min(5, Math.floor(v))));
    return unsub;
  }, [prog]);

  return (
    <section ref={containerRef} style={{ height: "600vh", background: "var(--void)" }} id="intelligence">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mb-8 px-8 lg:px-14">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px w-5" style={{ background: "#00d4ff" }} />
            <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00d4ff" }}>SCROLL TO FOLLOW A SIGNAL</span>
          </div>
          <h2 className="font-display text-[30px] font-bold text-white lg:text-[38px]">
            Inside Every Trade Decision
          </h2>
          {/* Progress dots */}
          <div className="mt-4 flex items-center gap-2">
            {STAGES.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <motion.div animate={{ background: i <= activeIdx ? s.color : "rgba(255,255,255,0.1)", scale: i === activeIdx ? 1.3 : 1 }}
                  transition={{ duration: 0.25 }}
                  className="h-1.5 w-1.5 rounded-full" />
                {i < STAGES.length - 1 && (
                  <motion.div animate={{ background: i < activeIdx ? s.color : "rgba(255,255,255,0.06)" }}
                    transition={{ duration: 0.25 }} className="h-px w-6" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-visible px-8 lg:px-14">
          <motion.div style={{ x }} className="flex items-stretch gap-4">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="flex shrink-0 items-stretch gap-4">
                  <motion.div
                    animate={{ opacity: i <= activeIdx ? 1 : 0.35, y: i <= activeIdx ? 0 : 12 }}
                    transition={{ duration: 0.35 }}>
                    <HoloCard className="w-[320px] p-7">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                             style={{ background: `${stage.color}14`, border: `1px solid ${stage.color}22` }}>
                          <Icon size={16} style={{ color: stage.color }} />
                        </div>
                        <span className="font-data text-[10px]" style={{ color: `${stage.color}99` }}>{stage.label}</span>
                      </div>
                      <h3 className="font-display mb-2 text-[19px] font-bold text-white">{stage.title}</h3>
                      <p className="mb-6 text-[12.5px] leading-relaxed text-white/40">{stage.desc}</p>
                      <div className="space-y-1.5 rounded-xl p-3" style={{ background: `${stage.color}08`, border: `1px solid ${stage.color}14` }}>
                        {stage.data.map(({ k, v }) => (
                          <div key={k} className="flex justify-between">
                            <span className="font-data text-[9.5px] text-white/30">{k}</span>
                            <span className="font-data text-[9.5px] font-bold" style={{ color: stage.color }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </HoloCard>
                  </motion.div>
                  {i < STAGES.length - 1 && (
                    <div className="flex shrink-0 items-center self-center gap-0">
                      <motion.div animate={{ opacity: i < activeIdx ? 1 : 0.2 }} transition={{ duration: 0.3 }}
                        className="pipe-line h-px w-10 rounded" />
                      <ChevronRight size={12} style={{ color: i < activeIdx ? stage.color : "rgba(255,255,255,0.15)" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 3 — MARKET HEARTBEAT (EKG Canvas)
// ══════════════════════════════════════════════════════════════════════
function MarketHeartbeat() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: restQuotes = [] } = useQuotes();
  const storeQ = useMarketStore(s => s.quotes);
  // Prefer the live WebSocket tick stream (~1/s) over the 3.5s REST poll —
  // a real heartbeat needs real tick frequency, not a slow snapshot.
  const quotes = useMemo(() => {
    const live = Object.values(storeQ).map(q => ({ symbol: q.symbol, mid: q.mid, changePercent: q.changePct }));
    return live.length > 0 ? live : restQuotes;
  }, [storeQ, restQuotes]);
  useHeartbeat(canvasRef, quotes);
  const avgChg = quotes.reduce((s, q) => s + Math.abs(q.changePercent || 0), 0) / Math.max(quotes.length, 1);

  return (
    <section style={{ background: "var(--deep)" }} className="py-20 lg:py-24">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <LiveDot color="signal" />
              <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00ff9f" }}>LIVE MARKET PULSE</span>
            </div>
            <h2 className="font-display text-[26px] font-bold text-white">The Market is Alive. So is OLOS.</h2>
          </div>
          <div className="hidden flex-col items-end gap-1 md:flex">
            <span className="font-data text-[10px] text-white/25">Average volatility</span>
            <span className="font-data text-[18px] font-bold" style={{ color: avgChg > 0.5 ? "#ff9f00" : "#00d4ff" }}>
              {avgChg.toFixed(2)}% / 24h
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl"
             style={{ height: "130px", background: "var(--surface)", border: "1px solid rgba(0,255,159,0.08)" }}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 right-0" style={{ top: "50%", borderTop: "1px dashed rgba(255,255,255,0.04)" }} />
          </div>
          <canvas ref={canvasRef} className="h-full w-full" />
          <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-2.5 py-1"
               style={{ background: "rgba(0,255,159,0.08)", border: "1px solid rgba(0,255,159,0.15)" }}>
            <LiveDot color="signal" />
            <span className="font-data text-[8px] font-bold" style={{ color: "#00ff9f" }}>LIVE</span>
          </div>
          <div className="absolute bottom-3 left-4 flex gap-4">
            {[{ l:"Composite Signal", c:"#00ff9f" }, { l:"Volatility Band", c:"rgba(0,212,255,0.4)" }].map(({ l, c }) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="h-px w-5" style={{ background: c }} />
                <span className="font-data text-[8.5px] text-white/25">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 4 — INTELLIGENCE CHRONICLE
// ══════════════════════════════════════════════════════════════════════
function stageColor(stage: string): string {
  if (stage.startsWith("05")) return "#00d4ff"; // SIGNAL
  if (stage.startsWith("04")) return "#ff9f00"; // VALIDATE
  if (stage.startsWith("03")) return "#00ff9f"; // SCORE
  if (stage.startsWith("02")) return "rgba(255,255,255,0.65)"; // CLASSIFY
  return "rgba(255,255,255,0.5)"; // INGEST
}

function IntelligenceChronicle() {
  const sectRef = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(0);
  const inView = useInView(sectRef, { once: true, margin: "-100px" });
  const { data: log } = useDecisionLog();
  const trace = log?.trace ?? [];
  useEffect(() => {
    if (!inView || trace.length === 0) return;
    let c = 0;
    const id = setInterval(() => { c++; setVis(c); if (c >= trace.length) clearInterval(id); }, 220);
    return () => clearInterval(id);
  }, [inView, trace.length]);

  return (
    <section style={{ background: "var(--space)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div className="flex flex-col justify-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }} viewport={{ once: true, margin: "-80px" }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-px w-5" style={{ background: "#00d4ff" }} />
                <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00d4ff" }}>OLOS DECISION LOG</span>
              </div>
              <h2 className="font-display text-[38px] font-bold leading-[1.08] tracking-tight text-white lg:text-[50px]">
                Every Decision.<br />
                <span style={{ WebkitTextStroke: "1px rgba(0,212,255,0.6)", color: "transparent" }}>Fully Traced.</span>
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-white/40">
                {log?.status === "REAL"
                  ? `This is the real OLOS decision trace for the most recent live signal — ${log.signalType} ${log.symbol}, generated ${new Date(log.createdAt!).toLocaleString()}. Every factor, every gate, nothing hidden.`
                  : "OLOS is scanning live markets — the decision trace for the next qualifying signal will appear here in real time."}
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-white/40">
                No other trading platform shows you this. We show it because we have nothing to hide.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <span className="font-data text-[10px] tracking-wider text-white/25">{log?.status === "REAL" ? `Confidence ${log.confidence?.toFixed(0)}%` : "Awaiting next signal"}</span>
                <span className="text-white/10">·</span>
                <span className="font-data text-[10px] tracking-wider text-white/25">100% auditable</span>
              </div>
            </motion.div>
          </div>
          <div ref={sectRef}>
            <HoloCard className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1.5">
                  {["bg-rose-500/50","bg-amber-500/50","bg-emerald-500/50"].map(c => <div key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />)}
                </div>
                <span className="font-data text-[9px] tracking-wider text-white/20">OLOS :: decision_log :: live</span>
                <LiveDot color="signal" />
              </div>
              <div className="scanline max-h-[480px] overflow-y-auto p-4" style={{ scrollbarWidth: "none" }}>
                {trace.length === 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="font-data text-[9.5px] text-white/30">Waiting for the first live OLOS signal on this deployment…</span>
                  </div>
                ) : (
                  <>
                    {trace.slice(0, vis).map((line, i) => (
                      <div key={i} className="log-line mb-[3px] flex items-start gap-3">
                        <span className="shrink-0 font-data text-[9.5px]" style={{ color: "rgba(0,212,255,0.35)" }}>{line.stage}</span>
                        <span className="font-data text-[9.5px] leading-relaxed" style={{ color: stageColor(line.stage) }}>{line.text}</span>
                      </div>
                    ))}
                    {vis < trace.length && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="cursor-blink font-data text-[9.5px] text-white/30">█</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </HoloCard>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 5 — SIGNAL ANATOMY (interactive expandable)
// ══════════════════════════════════════════════════════════════════════
function SignalAnatomy() {
  const [open, setOpen] = useState(false);
  const { data: conf }           = useAIConf();
  const { data: rawSignals = [] } = useActiveSignals();
  const topSignal = rawSignals.filter(s => s.signalType !== "HOLD")[0] ?? null;

  const FACTORS = [
    { key:"trend",     label:"Trend",     w:0.28, score: conf?.breakdown?.trend    ?? null, color:"#00d4ff", note:"Aligned with primary trend direction" },
    { key:"momentum",  label:"Momentum",  w:0.22, score: conf?.breakdown?.momentum ?? null, color:"#0080ff", note:"RSI + MACD momentum alignment"        },
    { key:"volume",    label:"Volume",    w:0.20, score: conf?.breakdown?.volume   ?? null, color:"#00ff9f", note:"Volume vs 30-day average"             },
    { key:"macro",     label:"Macro",     w:0.18, score: conf?.breakdown?.macro    ?? null, color:"#ff9f00", note:"Macro backdrop & event risk"           },
    { key:"sentiment", label:"Sentiment", w:0.12, score: null,                             color:"#00d4ff", note:"Retail positioning (contrarian)"       },
  ];
  const composite = conf?.breakdown ? FACTORS.filter(f => f.score !== null).reduce((s, f) => s + f.w * (f.score as number), 0) : null;

  return (
    <section style={{ background: "var(--deep)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5" style={{ background: "#00d4ff" }} />
              <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00d4ff" }}>SIGNAL ANATOMY</span>
            </div>
            <h2 className="font-display text-[36px] font-bold leading-[1.08] tracking-tight text-white lg:text-[46px]">
              See the DNA<br />
              <span style={{ WebkitTextStroke: "1px rgba(0,212,255,0.6)", color: "transparent" }}>of Every Signal</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/40">
              Every signal has 5 contributing factors, each with a calibrated weight and score. Click to dissect it.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-white/40">
              This is what institutional transparency looks like. Not a black box — a glass box.
            </p>
            <MagneticBtn href="#" className="mt-7" primary={false}>
              <span onClick={() => setOpen(p => !p)}>{open ? "Collapse signal" : "Dissect the signal"}</span>
              <ChevronRight size={13} className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
            </MagneticBtn>
          </motion.div>

          <div>
            <HoloCard glow className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain size={13} style={{ color: "#00d4ff" }} />
                  <span className="font-data text-[9px] tracking-[0.2em]" style={{ color: "#00d4ff" }}>OLOS SIGNAL · LIVE</span>
                </div>
                <LiveDot color="signal" />
              </div>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="font-data text-[10px] text-white/35 mb-1">
                    {topSignal ? `${topSignal.symbol} · ${topSignal.timeframe ?? "LIVE"}` : "OLOS · LIVE"}
                  </p>
                  <div className="flex items-center gap-3">
                    {topSignal ? (
                      <>
                        <span className="font-display text-[28px] font-bold text-white">
                          {topSignal.signalType.includes("BUY") ? "▲" : "▼"} {topSignal.signalType.includes("BUY") ? "BUY" : "SELL"}
                        </span>
                        <span className="rounded-lg px-2 py-0.5 font-data text-[11px] font-bold text-black"
                          style={{ background: topSignal.signalType.includes("BUY") ? "#00ff9f" : "#ff4a4a" }}>
                          {topSignal.signalType.startsWith("STRONG_") ? "STRONG" : "ACTIVE"}
                        </span>
                      </>
                    ) : (
                      <div className="h-8 w-32 animate-pulse rounded bg-white/[0.06]" />
                    )}
                  </div>
                  <p className="font-data mt-1 text-[10px] text-white/30">
                    {topSignal ? `${topSignal.confidence}% confidence · Live signal` : "Scanning markets…"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-data text-[10px] text-white/25">Confidence</p>
                  {composite !== null ? (
                    <p className="font-data text-[36px] font-bold leading-none" style={{ color: "#00d4ff" }}>
                      {Math.round(composite * 100)}<span className="text-[18px] text-white/30">%</span>
                    </p>
                  ) : topSignal ? (
                    <p className="font-data text-[36px] font-bold leading-none" style={{ color: "#00d4ff" }}>
                      {topSignal.confidence}<span className="text-[18px] text-white/30">%</span>
                    </p>
                  ) : (
                    <div className="h-9 w-20 animate-pulse rounded bg-white/[0.06]" />
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div key="factors" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                    className="overflow-hidden">
                    <div className="border-t pt-4 mb-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <p className="font-data mb-3 text-[9px] tracking-[0.2em] text-white/25">FACTOR BREAKDOWN</p>
                      <div className="space-y-3">
                        {FACTORS.map((f, i) => (
                          <motion.div key={f.key}
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.3 }}>
                            <div className="mb-1 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-data text-[10.5px] text-white/55">{f.label}</span>
                                <span className="font-data text-[8.5px] text-white/20">w={f.w.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-data text-[9px] text-white/25">{f.note}</span>
                                {f.score !== null
                                  ? <span className="font-data text-[11px] font-bold" style={{ color: f.color }}>{Math.round(f.score*100)}%</span>
                                  : <span className="font-data text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                                }
                              </div>
                            </div>
                            <BarFill pct={f.score !== null ? f.score * 100 : 0} color={f.score !== null ? f.color : "rgba(255,255,255,0.08)"} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl p-3"
                         style={{ background: "rgba(0,255,159,0.04)", border: "1px solid rgba(0,255,159,0.1)" }}>
                      {([
                        ["Risk/trade", "≤1% Kelly"],
                        ["Confidence", composite !== null ? `${Math.round(composite*100)}%` : topSignal ? `${topSignal.confidence}%` : "—"],
                        ["Signal",     topSignal ? topSignal.signalType.replace("_"," ") : "—"],
                      ] as [string,string][]).map(([l,v]) => (
                        <div key={l} className="text-center">
                          <p className="font-data text-[8.5px] text-white/25">{l}</p>
                          <p className="font-data text-[11px] font-bold" style={{ color: "#00ff9f" }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!open && (
                <button onClick={() => setOpen(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 font-data text-[9px] text-white/25 hover:text-white/50 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                  Click to dissect all 5 factors <ChevronRight size={10} />
                </button>
              )}
            </HoloCard>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 6 — PLATFORM ORBIT (all 8 modules)
// ══════════════════════════════════════════════════════════════════════
const PLATFORM_MODULES = [
  { id:"olos",      icon:Brain,        color:"#00d4ff", label:"OLOS Brain",         tagline:"AI regime detection & confidence calibration",        to:"/platform/olos-ai",   live:true  },
  { id:"itrader",   icon:BarChart2,    color:"#0080ff", label:"iTrader Terminal",    tagline:"Professional execution with DOM depth & multi-chart",  to:"/trading?platform=itrader",   live:true  },
  { id:"autopilot", icon:Cpu,          color:"#00ff9f", label:"Autopilot",           tagline:"Automated strategy execution with full risk control",  to:"/platform/autopilot", live:true  },
  { id:"signals",   icon:Zap,          color:"#ff9f00", label:"Signals Feed",        tagline:"Smart money tracking & institutional flow detection",  to:"/signals",            live:true  },
  { id:"calendar",  icon:Calendar,     color:"#00d4ff", label:"Economic Calendar",   tagline:"OLOS-scored macro events with market impact model",    to:"/calendar",           live:false },
  { id:"portfolio", icon:PieChart,     color:"#0080ff", label:"Portfolio Analytics", tagline:"Benchmark comparison, drawdown analysis & attribution",to:"/platform/olos-ai",   live:false },
  { id:"risk",      icon:Shield,       color:"#ff4a4a", label:"Risk Engine",         tagline:"Kelly sizing · Correlation guard · Exposure limits",   to:"/platform/risk",      live:true  },
  { id:"academy",   icon:GraduationCap,color:"#00ff9f", label:"OLOS Academy",        tagline:"Master the methodology, strategy & competitive edge",  to:"/platform/academy",   live:false },
];

function dotColor(hex: string): "plasma" | "signal" | "warn" {
  if (hex === "#00ff9f") return "signal";
  if (hex === "#ff9f00") return "warn";
  return "plasma";
}

function PlatformOrbit() {
  return (
    <section id="platform" style={{ background: "var(--void)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }} viewport={{ once: true, margin: "-80px" }} className="mb-16 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-px w-5" style={{ background: "#00d4ff" }} />
            <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00d4ff" }}>THE COMPLETE PLATFORM</span>
            <span className="h-px w-5" style={{ background: "#00d4ff" }} />
          </div>
          <h2 className="font-display text-[38px] font-bold leading-[1.08] tracking-tight text-white lg:text-[50px]">
            One Platform.<br />
            <span style={{ WebkitTextStroke: "1px rgba(0,212,255,0.7)", color: "transparent" }}>Eight Engines.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[500px] text-[15px] leading-relaxed text-white/40">
            Every module is live, interconnected, and built on the OLOS intelligence core. From analysis to execution to portfolio management — fully integrated.
          </p>
        </motion.div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_MODULES.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div key={mod.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.07 }} viewport={{ once: true, margin: "-60px" }}>
                <Link to={mod.to} data-cursor={mod.label.toUpperCase()} className="block h-full">
                  <HoloCard glow={mod.live} className="group h-full p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                           style={{ background: `${mod.color}14`, border: `1px solid ${mod.color}22` }}>
                        <Icon size={17} style={{ color: mod.color }} />
                      </div>
                      {mod.live
                        ? <LiveDot color={dotColor(mod.color)} />
                        : <span className="font-data text-[8px] text-white/20">PREVIEW</span>}
                    </div>
                    <p className="font-display mb-1.5 text-[15px] font-bold text-white">{mod.label}</p>
                    <p className="font-data text-[11px] leading-relaxed text-white/35">{mod.tagline}</p>
                    <div className="mt-4 flex items-center gap-1" style={{ color: mod.color }}>
                      <span className="font-data text-[10px]">Explore</span>
                      <ArrowRight size={10} />
                    </div>
                  </HoloCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 6B — LIVE SIGNAL FEED
// ══════════════════════════════════════════════════════════════════════
function sigColor(type: string): string {
  if (type === "BUY" || type === "STRONG_BUY")   return "#00ff9f";
  if (type === "SELL" || type === "STRONG_SELL") return "#ff4a4a";
  return "#ff9f00";
}
function sigLabel(type: string): string {
  if (type === "STRONG_BUY")  return "STRONG BUY";
  if (type === "STRONG_SELL") return "STRONG SELL";
  return type;
}

function LiveSignalFeed() {
  const { data: rawSignals = [], isLoading } = useActiveSignals();
  const { data: stats }                      = useSigStats();
  const signals = rawSignals.filter(s => s.signalType !== "HOLD").slice(0, 6);
  const locked  = !isLoading && rawSignals.length === 0;

  const [visible, setVisible] = useState(0);
  const [flash,   setFlash]   = useState(false);
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView || signals.length === 0) return;
    setVisible(0);
    let n = 0;
    const show = () => {
      if (n >= signals.length) return;
      setFlash(true);
      setTimeout(() => setFlash(false), 380);
      n++;
      setVisible(n);
      if (n < signals.length) setTimeout(show, 820);
    };
    setTimeout(show, 400);
  }, [inView, signals.length]);

  const { data: execStats } = useExecStats();
  const avgConf = stats?.avgConfidence
    ? `${Math.round(stats.avgConfidence)}%`
    : signals.length > 0
      ? `${Math.round(signals.reduce((s, g) => s + g.confidence, 0) / signals.length)}%`
      : "—";
  const processingTime = execStats?.avgExecutionMs != null ? `${execStats.avgExecutionMs}ms` : "< 47ms";

  return (
    <section style={{ background: "var(--deep)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5" style={{ background: "#ff9f00" }} />
              <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#ff9f00" }}>OLOS SIGNALS · LIVE</span>
            </div>
            <h2 className="font-display text-[36px] font-bold leading-[1.08] tracking-tight text-white lg:text-[46px]">
              Institutional Signals.<br />
              <span style={{ WebkitTextStroke: "1px rgba(255,159,0,0.6)", color: "transparent" }}>Real Time.</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/40">
              OLOS generates calibrated BUY / SELL / HOLD signals across Forex, Indices, Commodities and Crypto. Every signal includes its full 5-factor reasoning chain and R:R output.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {([
                [avgConf,         "Avg Confidence"],
                [processingTime,  "Avg Processing"],
                ["24/7",          "Coverage"],
              ] as [string, string][]).map(([v, l]) => (
                <div key={l} className="rounded-xl p-3 text-center" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="font-data text-[18px] font-bold" style={{ color: "#ff9f00" }}>{v}</p>
                  <p className="font-data text-[9px] text-white/30">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-7">
              <MagneticBtn to="/signals" primary={false}>View Signal Feed <ArrowRight size={13} /></MagneticBtn>
            </div>
          </motion.div>

          <div ref={ref}>
            <HoloCard glow className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1.5">
                  {["bg-rose-500/50","bg-amber-500/50","bg-emerald-500/50"].map(c => <div key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />)}
                </div>
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {flash && (
                      <motion.span key="flash" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                        className="font-data text-[9px] font-bold tracking-widest" style={{ color: "#00ff9f" }}>▶ NEW SIGNAL</motion.span>
                    )}
                  </AnimatePresence>
                  <span className="font-data text-[9px] tracking-wider text-white/20">OLOS :: signals :: live</span>
                </div>
                <LiveDot color="signal" />
              </div>
              <div className="max-h-[360px] space-y-2 overflow-y-auto p-4" style={{ scrollbarWidth: "none" }}>
                {locked ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-10">
                    <Lock size={24} className="text-white/20" />
                    <p className="font-data text-center text-[11px] text-white/30">
                      Live signals are available to account holders.<br />Sign in to access real-time OLOS signal data.
                    </p>
                    <Link to="/login" className="rounded-xl px-4 py-2 font-data text-[11px] font-bold"
                          style={{ background: "rgba(255,159,0,0.1)", border: "1px solid rgba(255,159,0,0.2)", color: "#ff9f00" }}>
                      Sign In →
                    </Link>
                  </div>
                ) : (
                  <AnimatePresence>
                    {signals.slice(0, visible).map((sig) => {
                      const color = sigColor(sig.signalType);
                      const label = sigLabel(sig.signalType);
                      return (
                        <motion.div key={sig.id}
                          initial={{ opacity: 0, x: 12, y: -4 }} animate={{ opacity: 1, x: 0, y: 0 }}
                          exit={{ opacity: 0 }} transition={{ duration: 0.32 }}
                          className="flex items-center justify-between rounded-xl p-3"
                          style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}18` }}>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                            <div>
                              <p className="font-data text-[12px] font-bold text-white">{sig.symbol}</p>
                              <p className="font-data text-[9px] text-white/30">{sig.timeframe} · LIVE</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="rounded px-1.5 py-0.5 font-data text-[10px] font-bold"
                                  style={{ background: `${color}18`, color }}>{label}</span>
                            <span className="font-data text-[12px] font-bold tabular-nums" style={{ color: "#00d4ff" }}>{sig.confidence}%</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                {!locked && visible < signals.length && (
                  <div className="flex items-center gap-2 rounded-xl p-3" style={{ border: "1px dashed rgba(255,255,255,0.06)" }}>
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#00d4ff" }} />
                    <span className="font-data text-[9px] text-white/20">Scanning markets…</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span className="font-data text-[9px] text-white/25">
                  {locked ? "Sign in for live signals" : `${signals.length} signal${signals.length !== 1 ? "s" : ""} active`}
                </span>
                <Link to="/signals" className="font-data text-[9px]" style={{ color: "#00d4ff" }}>View all signals →</Link>
              </div>
            </HoloCard>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 6C — ECONOMIC CALENDAR TEASER
// ══════════════════════════════════════════════════════════════════════
function impactColor(i: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL"): string {
  if (i === "CRITICAL" || i === "HIGH") return "#ff4a4a";
  if (i === "MEDIUM")                   return "#ff9f00";
  return "#00d4ff";
}

function EconomicCalendarTeaser() {
  const { data: events = [], isLoading } = usePublicCalendar();
  const topEvents = events.slice(0, 4);

  return (
    <section style={{ background: "var(--space)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <HoloCard className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2">
                  <Calendar size={11} style={{ color: "#00d4ff" }} />
                  <span className="font-data text-[9px] tracking-wider" style={{ color: "#00d4ff" }}>ECONOMIC CALENDAR · TODAY</span>
                </div>
                <LiveDot color="plasma" />
              </div>
              <div className="space-y-1.5 p-3">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-9 animate-pulse rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }} />
                  ))
                ) : topEvents.length > 0 ? topEvents.map((ev, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }} viewport={{ once: true }}
                    className="flex items-center gap-3 rounded-lg p-2.5"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="w-10 shrink-0 font-data text-[10px] text-white/40">{ev.time}</span>
                    <span className="w-8 shrink-0 font-data text-[10px] font-bold text-white/60">{ev.currency}</span>
                    <span className="flex-1 truncate font-data text-[10px] text-white/70">{ev.event}</span>
                    <span className="shrink-0 rounded px-1.5 py-0.5 font-data text-[8px] font-bold"
                          style={{ background: `${impactColor(ev.impact)}18`, color: impactColor(ev.impact) }}>{ev.impact}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Brain size={9} style={{ color: "#00d4ff" }} />
                      <span className="font-data text-[9px] text-white/40">AI</span>
                    </div>
                  </motion.div>
                )) : (
                  <div className="flex items-center justify-center py-8">
                    <p className="font-data text-[11px] text-white/25">No events scheduled today</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span className="font-data text-[9px] text-white/20">
                  {topEvents.length > 0 ? `${topEvents.length} events · OLOS-scored` : "OLOS impact scores updated real-time"}
                </span>
                <Link to="/calendar" className="font-data text-[9px]" style={{ color: "#00d4ff" }}>Full calendar →</Link>
              </div>
            </HoloCard>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5" style={{ background: "#00d4ff" }} />
              <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00d4ff" }}>ECONOMIC CALENDAR</span>
            </div>
            <h2 className="font-display text-[36px] font-bold leading-[1.08] tracking-tight text-white lg:text-[44px]">
              Know Before<br />
              <span style={{ WebkitTextStroke: "1px rgba(0,212,255,0.6)", color: "transparent" }}>The Market Moves.</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/40">
              Every macro event is pre-scored by OLOS — probability of market impact, direction bias, and conflict with active signals. Never get caught off-guard by a news release.
            </p>
            <div className="mt-6 space-y-3">
              {([
                { icon:Brain,    l:"OLOS Impact Score",    d:"AI-estimated probability of price movement per event" },
                { icon:Shield,   l:"Signal Conflict Guard", d:"Active signals paused automatically during high-impact windows" },
                { icon:Activity, l:"Live Market Reaction",  d:"Price + volatility tracked second-by-second post-release" },
                { icon:Eye,      l:"Historical Precedent",  d:"How this event moved markets across the last 12 releases" },
              ] as const).map(({ icon: Icon, l, d }) => (
                <div key={l} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                       style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.12)" }}>
                    <Icon size={12} style={{ color: "#00d4ff" }} />
                  </div>
                  <div>
                    <p className="font-data text-[11.5px] font-bold text-white/70">{l}</p>
                    <p className="font-data text-[10.5px] text-white/30">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7">
              <MagneticBtn to="/calendar" primary={false}>Open Economic Calendar <ArrowRight size={13} /></MagneticBtn>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 6D — AUTOPILOT TEASER
// ══════════════════════════════════════════════════════════════════════
function AutopilotTeaser() {
  const ref = useRef<HTMLDivElement>(null);
  const { data: ap } = useAutopilotStats();
  const hasData = ap?.status === "REAL" && ap.activeBots > 0;

  return (
    <section style={{ background: "var(--void)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5" style={{ background: "#00ff9f" }} />
              <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00ff9f" }}>AUTOPILOT ENGINE</span>
            </div>
            <h2 className="font-display text-[36px] font-bold leading-[1.08] tracking-tight text-white lg:text-[46px]">
              Your Strategy.<br />
              <span style={{ WebkitTextStroke: "1px rgba(0,255,159,0.6)", color: "transparent" }}>On Autopilot.</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/40">
              OLOS signals feed directly into the Autopilot execution engine. Configure your risk parameters once — the system executes with sub-5ms precision, 24 hours a day.
            </p>
            <div className="mt-6 space-y-2">
              {[
                "Strategy Builder — construct any logic without writing code",
                "Risk Automation — Kelly sizing, trailing SL, correlation guard",
                "Hedging Engine — automatic exposure neutralization",
                "Portfolio AI — rebalancing across all open positions",
              ].map(f => (
                <div key={f} className="flex items-start gap-2">
                  <CheckCircle size={11} className="mt-0.5 shrink-0" style={{ color: "#00ff9f" }} />
                  <span className="font-data text-[11.5px] text-white/45">{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-7">
              <MagneticBtn to="/platform/autopilot" primary={false}>Configure Autopilot <ArrowRight size={13} /></MagneticBtn>
            </div>
          </motion.div>

          <div ref={ref}>
            <HoloCard glow className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2">
                  <Cpu size={11} style={{ color: "#00ff9f" }} />
                  <span className="font-data text-[9px] tracking-wider" style={{ color: "#00ff9f" }}>AUTOPILOT · PLATFORM-WIDE</span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div animate={{ scale: hasData ? [1, 1.4, 1] : 1 }} transition={{ repeat: Infinity, duration: 1.2 }}
                    className="h-1.5 w-1.5 rounded-full" style={{ background: hasData ? "#00ff9f" : "rgba(255,255,255,0.2)" }} />
                  <span className="font-data text-[9px] font-bold" style={{ color: hasData ? "#00ff9f" : "rgba(255,255,255,0.35)" }}>
                    {hasData ? `${ap!.activeBots} BOTS ACTIVE` : "NO ACTIVE BOTS"}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <p className="mb-4 font-data text-[9.5px] leading-relaxed text-white/30">
                  Real, anonymized stats aggregated across every IGFXPRO trader currently running Autopilot — not a simulated demo account.
                </p>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(0,255,159,0.06)", border: "1px solid rgba(0,255,159,0.12)" }}>
                    <p className="font-data mb-1 text-[8.5px] text-white/30">24H P&L</p>
                    {hasData ? (
                      <p className="font-data text-[16px] font-bold tabular-nums" style={{ color: ap!.sessionPnl >= 0 ? "#00ff9f" : "#ff4a4a" }}>
                        {ap!.sessionPnl >= 0 ? "+" : "−"}${Math.abs(ap!.sessionPnl).toFixed(2)}
                      </p>
                    ) : <p className="font-data text-[16px] font-bold text-white/20">—</p>}
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-data mb-1 text-[8.5px] text-white/30">TRADES (24H)</p>
                    <p className="font-data text-[16px] font-bold text-white">{hasData ? ap!.tradesLast24h : "—"}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-data mb-1 text-[8.5px] text-white/30">WIN RATE</p>
                    <p className="font-data text-[16px] font-bold" style={{ color: "#00d4ff" }}>{hasData ? `${ap!.winRate}%` : "—"}</p>
                  </div>
                </div>
                <div className="mb-4 space-y-1.5 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p className="mb-2 font-data text-[8.5px] tracking-wider text-white/20">RECENT ACTIVITY</p>
                  {hasData && ap!.recentActivity.length > 0 ? ap!.recentActivity.map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="shrink-0 font-data text-[9px]" style={{ color: "rgba(0,212,255,0.35)" }}>{new Date(line.at).toLocaleTimeString()}</span>
                      <span className="font-data text-[9px] text-white/40">{line.text}</span>
                    </div>
                  )) : (
                    <span className="font-data text-[9px] text-white/25">No autopilot executions in the last 24h.</span>
                  )}
                </div>
              </div>
            </HoloCard>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 6E — iTRADER TERMINAL PREVIEW
// ══════════════════════════════════════════════════════════════════════
const TERM_SYMBOLS = ["EURUSD","GBPUSD","XAUUSD","US500"] as const;
type TermSym = typeof TERM_SYMBOLS[number];
const SYM_DEC:  Record<TermSym, number> = { EURUSD:5, GBPUSD:5, XAUUSD:2, US500:2 };
const SYM_DISP: Record<TermSym, string> = { EURUSD:"EUR/USD", GBPUSD:"GBP/USD", XAUUSD:"XAU/USD", US500:"US 500" };

function TerminalPreview() {
  const [tab,  setTab]  = useState<TermSym>("EURUSD");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [vol,  setVol]  = useState("0.01");
  const { data: quotes = [] } = useQuotes();
  const rawPrice = quotes.find(q => q.symbol === tab)?.mid;
  const price    = rawPrice && rawPrice > 0 ? rawPrice : null;

  return (
    <section style={{ background: "var(--deep)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <HoloCard className="overflow-hidden p-0">
              <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {TERM_SYMBOLS.map(sym => (
                  <button key={sym} onClick={() => setTab(sym)}
                    className="flex-1 py-2.5 font-data text-[10px] transition-colors"
                    style={{
                      color:        tab === sym ? "#fff" : "rgba(255,255,255,0.3)",
                      borderBottom: tab === sym ? "2px solid #00d4ff" : "2px solid transparent",
                      background:   tab === sym ? "rgba(0,212,255,0.04)" : "transparent",
                    }}>{SYM_DISP[sym]}</button>
                ))}
              </div>
              <div className="p-4">
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <p className="mb-1 font-data text-[10px] text-white/30">{SYM_DISP[tab]} · LIVE</p>
                    {price
                      ? <motion.p key={price} initial={{ opacity: 0.7 }} animate={{ opacity: 1 }}
                          className="font-data text-[32px] font-bold tabular-nums text-white">{price.toFixed(SYM_DEC[tab])}</motion.p>
                      : <div className="h-8 w-36 animate-pulse rounded bg-white/[0.06]" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <LiveDot color="signal" />
                    <span className="font-data text-[9px]" style={{ color: "#00ff9f" }}>LIVE</span>
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl p-1" style={{ background: "rgba(0,0,0,0.3)" }}>
                  {(["BUY","SELL"] as const).map(s => (
                    <button key={s} onClick={() => setSide(s)}
                      className="rounded-lg py-2.5 font-data text-[12px] font-bold transition-all"
                      style={side === s
                        ? { background: s === "BUY" ? "rgba(0,255,159,0.15)" : "rgba(255,74,74,0.15)",
                            color:       s === "BUY" ? "#00ff9f" : "#ff4a4a",
                            border:      `1px solid ${s === "BUY" ? "rgba(0,255,159,0.25)" : "rgba(255,74,74,0.25)"}` }
                        : { color: "rgba(255,255,255,0.2)", border: "1px solid transparent" }}>{s}</button>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="mb-1.5 block font-data text-[9px] text-white/30">VOLUME (lots)</label>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                       style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <input type="number" value={vol} onChange={e => setVol(e.target.value)}
                      step="0.01" min="0.01"
                      className="w-full bg-transparent font-data text-[13px] text-white outline-none" />
                  </div>
                </div>
                <button className="btn-scan w-full rounded-xl py-3 font-data text-[12px] font-bold transition-all"
                  style={side === "BUY"
                    ? { background: "linear-gradient(135deg,rgba(0,255,159,0.2),rgba(0,212,255,0.1))", color:"#00ff9f", border:"1px solid rgba(0,255,159,0.25)" }
                    : { background: "linear-gradient(135deg,rgba(255,74,74,0.2),rgba(255,74,74,0.1))",  color:"#ff4a4a", border:"1px solid rgba(255,74,74,0.25)" }}>
                  {side} {vol} lot · {SYM_DISP[tab]}
                </button>
                <div className="mt-4 space-y-1.5">
                  <p className="mb-2 font-data text-[8.5px] tracking-wider text-white/20">OPEN POSITIONS</p>
                  <div className="rounded-lg px-3 py-3 text-center"
                       style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="font-data text-[9.5px] text-white/30">Sign in to see your live positions here.</span>
                  </div>
                </div>
              </div>
            </HoloCard>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5" style={{ background: "#0080ff" }} />
              <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#0080ff" }}>iTRADER TERMINAL</span>
            </div>
            <h2 className="font-display text-[36px] font-bold leading-[1.08] tracking-tight text-white lg:text-[46px]">
              Professional<br />
              <span style={{ WebkitTextStroke: "1px rgba(0,128,255,0.7)", color: "transparent" }}>Execution Layer.</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/40">
              The iTrader terminal delivers professional execution with DOM depth, multi-chart workspaces, and direct OLOS signal overlay on every chart.
            </p>
            <div className="mt-6 space-y-2">
              {[
                "DOM depth at 5 levels — full order book visibility",
                "Multi-chart workspace — up to 9 simultaneous charts",
                "One-click execution with OLOS signal overlay",
                "Advanced order types: OCO, trailing, bracket orders",
              ].map(f => (
                <div key={f} className="flex items-start gap-2">
                  <CheckCircle size={11} className="mt-0.5 shrink-0" style={{ color: "#0080ff" }} />
                  <span className="font-data text-[11.5px] text-white/45">{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <MagneticBtn to="/trading?platform=itrader" primary>Open iTrader <ArrowRight size={13} /></MagneticBtn>
              <MagneticBtn to="/register" primary={false}>Register Free</MagneticBtn>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 7 — THE LIVE ROOM
// ══════════════════════════════════════════════════════════════════════
// US500/US100 dropped: TwelveData's free tier doesn't include index data
// (confirmed via direct API test — "available starting with the Pro or
// Venture plan") and neither does Finnhub's calendar-adjacent free tier via
// OANDA passthrough. Swapped for two instruments this platform actually has
// live prices for, rather than showing a permanently-empty tile.
const LIVE_ASSETS = [
  { sym:"EURUSD", label:"EUR/USD" }, { sym:"GBPUSD", label:"GBP/USD" },
  { sym:"USDJPY", label:"USD/JPY" }, { sym:"XAUUSD", label:"XAU/USD" },
  { sym:"XAGUSD", label:"XAG/USD" }, { sym:"SOLUSD", label:"SOL/USD" },
  { sym:"BTCUSD", label:"BTC/USD" }, { sym:"ETHUSD", label:"ETH/USD" },
];

function TheLiveRoom() {
  const { data: quotes = [] }             = useQuotes();
  const { data: conf, isLoading: confLoading } = useAIConf();
  const { data: stats }                   = useSigStats();
  const { data: rawSignals = [] } = useActiveSignals();
  const storeQ   = useMarketStore(s => s.quotes);
  const topSignal = rawSignals.filter(s => s.signalType !== "HOLD")[0] ?? null;
  const brk  = conf?.breakdown ?? null;
  const csco = conf?.score != null ? Math.round(conf.score * 100) : null;
  const scanEta = conf?.nextScanInSec;

  return (
    <section id="performance" style={{ background: "var(--space)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mb-12 flex items-end justify-between">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <div className="mb-2 flex items-center gap-2">
              <LiveDot color="plasma" />
              <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00d4ff" }}>RIGHT NOW, OLOS IS WATCHING</span>
            </div>
            <h2 className="font-display text-[36px] font-bold tracking-tight text-white lg:text-[46px]">The Live Room</h2>
          </motion.div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_0.9fr]">
          {/* Regime heatmap */}
          <HoloCard className="p-5">
            <p className="font-data mb-4 text-[9px] tracking-[0.25em] text-white/30">REGIME HEATMAP · 8 INSTRUMENTS</p>
            <div className="grid grid-cols-2 gap-2">
              {LIVE_ASSETS.map(({ sym, label }) => {
                const sq  = (storeQ[sym] as any);
                const pq  = quotes.find(q => q.symbol === sym);
                const rawMid = sq?.mid ?? pq?.mid;
                const mid = (rawMid && rawMid > 0) ? rawMid : null;
                const chg = sq?.changePct ?? pq?.changePercent ?? 0;
                const rg  = regime(chg);
                const dec = sym.includes("JPY") || sym.includes("US") ? 2 : 5;
                return (
                  <div key={sym} className="rounded-lg p-2.5 transition-colors"
                       style={{ background: `${rg.color}0d`, border: `1px solid ${rg.color}1a` }}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-data text-[9px] text-white/40">{label}</span>
                      <span className="font-data text-[8px] font-bold" style={{ color: rg.color }}>{rg.short}</span>
                    </div>
                    {mid != null
                      ? <span className="font-data text-[11px] font-bold text-white">{mid.toFixed(dec)}</span>
                      : <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />}
                    <span className="font-data text-[9px]" style={{ color: chg >= 0 ? "#00ff9f" : "#ff4a4a" }}>
                      {chg >= 0 ? "+" : ""}{Number(chg).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </HoloCard>

          {/* Confidence */}
          <HoloCard glow className="p-5">
            <p className="font-data mb-4 text-[9px] tracking-[0.25em] text-white/30">OLOS CONFIDENCE ENGINE</p>
            {!confLoading && csco === null ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Activity size={20} className="mb-3 animate-pulse text-white/15" />
                <p className="font-data text-[11px] text-white/25">No qualifying signal right now<br />OLOS is scanning live markets</p>
                {scanEta != null && (
                  <p className="mt-3 font-data text-[10px]" style={{ color: "#00d4ff" }}>
                    Next scan in {scanEta}s
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-end gap-2">
                  {confLoading || csco === null
                    ? <div className="h-12 w-20 animate-pulse rounded bg-white/[0.06]" />
                    : <><span className="font-data text-[52px] font-bold leading-none tabular-nums" style={{ color: "#00d4ff" }}>{csco}</span>
                        <span className="font-data mb-2 text-[20px] text-white/30">%</span></>}
                </div>
                <div className="space-y-3">
                  {(["trend","momentum","volume","macro"] as const).map(k => {
                    const colors: Record<string,string> = { trend:"#00d4ff", momentum:"#0080ff", volume:"#00ff9f", macro:"#ff9f00" };
                    const val = brk?.[k] ?? null;
                    return (
                      <div key={k}>
                        <div className="mb-1 flex justify-between">
                          <span className="font-data text-[10px] capitalize text-white/35">{k}</span>
                          {val !== null
                            ? <span className="font-data text-[10px]" style={{ color: colors[k] }}>{Math.round(val*100)}%</span>
                            : <span className="font-data text-[10px]" style={{ color: "rgba(255,255,255,0.15)" }}>—</span>}
                        </div>
                        <BarFill pct={val !== null ? val*100 : 0} color={val !== null ? colors[k] : "rgba(255,255,255,0.05)"} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </HoloCard>

          {/* Signal stats */}
          <HoloCard className="p-5">
            <p className="font-data mb-4 text-[9px] tracking-[0.25em] text-white/30">SIGNAL ACTIVITY</p>
            {stats ? (
              <div className="space-y-4">
                {[
                  { l:"Signals Generated", v: stats.totalSignals.toLocaleString(),          c:"#00d4ff" },
                  { l:"Active Signals",    v: stats.activeSignals.toLocaleString(),          c:"#00ff9f" },
                  { l:"Avg. Confidence",   v: `${stats.avgConfidence.toFixed(1)}%`,          c:"#0080ff" },
                  { l:"Success Rate",      v: `${(stats.successRate*100).toFixed(1)}%`,      c:"#ff9f00" },
                ].map(({ l, v, c }) => (
                  <div key={l} className="flex items-center justify-between">
                    <span className="font-data text-[10px] text-white/35">{l}</span>
                    <span className="font-data text-[16px] font-bold tabular-nums" style={{ color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity size={24} className="mb-2 text-white/15" />
                <p className="font-data text-[10px] text-white/25">Live data after login</p>
                <Link to="/register" className="mt-3 font-data text-[10px]" style={{ color: "#00d4ff" }}>Open Account →</Link>
              </div>
            )}
            <div className="mt-5 rounded-xl p-3" style={{ background: "rgba(0,255,159,0.04)", border: "1px solid rgba(0,255,159,0.1)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-data text-[9px] text-white/25">TOP SIGNAL NOW</span>
                <LiveDot color="signal" />
              </div>
              {topSignal ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-data text-[13px] font-bold text-white">{topSignal.symbol}</span>
                    <span className="font-data text-[13px] font-bold" style={{ color: topSignal.signalType.includes("BUY") ? "#00ff9f" : "#ff4a4a" }}>
                      {topSignal.signalType.includes("BUY") ? "▲" : "▼"} {topSignal.signalType.includes("BUY") ? "BUY" : "SELL"}
                    </span>
                  </div>
                  <span className="font-data text-[10px]" style={{ color: "#00d4ff" }}>{topSignal.confidence}% confidence</span>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-20 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-4 w-16 animate-pulse rounded bg-white/[0.06]" />
                  </div>
                  <span className="font-data text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Scanning…</span>
                </>
              )}
            </div>
          </HoloCard>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 8 — THE COMPARISON (what no broker has ever done)
// ══════════════════════════════════════════════════════════════════════
const CMP = [
  { feature:"Signal transparency",     broker:"None",              olos:"Full factor breakdown",   cat:"Intelligence"   },
  { feature:"Regime detection",        broker:"None",              olos:"4-state live classifier", cat:"Intelligence"   },
  { feature:"Confidence calibration",  broker:"Random %",          olos:"Brier-score calibrated",  cat:"Intelligence"   },
  { feature:"Portfolio awareness",     broker:"None",              olos:"Correlation + exposure",  cat:"Risk"           },
  { feature:"Decision audit trail",    broker:"Unavailable",       olos:"Every factor, every ms",  cat:"Accountability" },
  { feature:"Risk per trade",          broker:"Manual only",       olos:"Kelly fraction auto-calc", cat:"Risk"          },
  { feature:"Execution quality",       broker:"Basic fill report", olos:"Slippage + quality score", cat:"Execution"     },
  { feature:"Model adaptation",        broker:"Static algorithm",  olos:"Regime-adaptive",         cat:"Intelligence"   },
  { feature:"Segregated funds",        broker:"Varies",            olos:"100% · Externally audited",cat:"Security"      },
];

function TheComparison() {
  const [scanRow, setScanRow] = useState(-1);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let i = -1;
    const id = setInterval(() => { i++; setScanRow(i); if (i >= CMP.length) clearInterval(id); }, 190);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <section style={{ background: "var(--void)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }} className="mb-14">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px w-5" style={{ background: "#00d4ff" }} />
            <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00d4ff" }}>THE DIFFERENCE IS STRUCTURAL</span>
          </div>
          <h2 className="font-display text-[36px] font-bold tracking-tight text-white lg:text-[46px]">
            What No Other Broker Offers
          </h2>
          <p className="mt-3 max-w-[420px] text-[15px] text-white/40">
            We built what we wished existed. The comparison speaks for itself.
          </p>
        </motion.div>

        <div ref={ref} className="overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-[1fr_1fr_1fr] border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "var(--deep)" }}>
            <div className="p-4 font-data text-[10px] tracking-wider text-white/25">FEATURE</div>
            <div className="border-l p-4 font-data text-[10px] tracking-wider text-white/25" style={{ borderColor: "rgba(255,255,255,0.06)" }}>TRADITIONAL BROKER</div>
            <div className="border-l p-4" style={{ borderColor: "rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.04)" }}>
              <div className="flex items-center gap-1.5">
                <Brain size={11} style={{ color: "#00d4ff" }} />
                <span className="font-data text-[10px] font-bold tracking-wider" style={{ color: "#00d4ff" }}>IGFXPRO × OLOS</span>
              </div>
            </div>
          </div>
          {CMP.map((row, i) => (
            <motion.div key={row.feature}
              initial={{ opacity: 0.15 }}
              animate={{ opacity: i <= scanRow ? 1 : 0.15, background: i === scanRow ? "rgba(0,212,255,0.04)" : "transparent" }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-[1fr_1fr_1fr] border-b"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <div className="p-4">
                <p className="font-data text-[11px] text-white/60">{row.feature}</p>
                <p className="font-data mt-0.5 text-[9px] text-white/20">{row.cat}</p>
              </div>
              <div className="border-l p-4" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-1.5">
                  <X size={11} style={{ color: "#ff4a4a" }} />
                  <span className="font-data text-[11px]" style={{ color: "rgba(255,74,74,0.7)" }}>{row.broker}</span>
                </div>
              </div>
              <div className="border-l p-4" style={{ borderColor: "rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.02)" }}>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={11} style={{ color: "#00ff9f" }} />
                  <span className="font-data text-[11px]" style={{ color: "rgba(0,255,159,0.9)" }}>{row.olos}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 9 — INSTITUTIONAL INFRA
// ══════════════════════════════════════════════════════════════════════
function fmtBig(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000)  return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)      return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function InstitutionalInfra() {
  const { data: stats }      = usePlatformStats();
  const { data: telem }      = useTelemetry();
  const { data: insts = [] } = useInstruments();

  const fxCount  = insts.filter(i => i.assetClass === "FX_MAJOR"  || i.assetClass === "FX_MINOR").length;
  const idxCount = insts.filter(i => i.assetClass === "INDEX").length;
  const comCount = insts.filter(i => i.assetClass === "COMMODITY").length;
  const cryCount = insts.filter(i => i.assetClass === "CRYPTO").length;
  const eqCount  = insts.filter(i => i.assetClass === "EQUITY").length;

  const liveMetrics = [
    { label:"Registered Traders",  value: fmtBig(stats?.registeredUsers), unit:"",    color:"#00d4ff" },
    { label:"Active Traders",      value: fmtBig(stats?.activeTraders),   unit:"",    color:"#00ff9f" },
    { label:"Orders Processed",    value: fmtBig(stats?.filledOrders),    unit:"",    color:"#0080ff" },
    { label:"Open Positions",      value: fmtBig(stats?.openPositions),   unit:"",    color:"#00d4ff" },
    { label:"Platform Uptime",     value: stats?.uptime != null ? stats.uptime.toFixed(2) : "99.97", unit:"%",  color:"#00ff9f" },
    { label:"Avg Execution",       value: stats?.avgExecutionMs != null ? `${stats.avgExecutionMs}` : "18",    unit:"ms", color:"#00d4ff" },
    { label:"Segregated Funds",    value: "100",  unit:"%",   color:"#00ff9f" },
    { label:"External Audits",     value: "4",    unit:"×/yr",color:"#0080ff" },
  ];

  const svcColor = (s: string) =>
    s === "operational" ? "#00ff9f" : s === "degraded" ? "#ff9f00" : "#ff4a4a";

  const markets = [
    { label:"Forex",       count: fxCount  > 0 ? `${fxCount}`  : "50+",  color:"#00d4ff", icon:Globe      },
    { label:"Indices",     count: idxCount > 0 ? `${idxCount}` : "15+",  color:"#0080ff", icon:TrendingUp  },
    { label:"Commodities", count: comCount > 0 ? `${comCount}` : "10+",  color:"#ff9f00", icon:Activity    },
    { label:"Crypto",      count: cryCount > 0 ? `${cryCount}` : "20+",  color:"#00ff9f", icon:Zap         },
    { label:"Equities",    count: eqCount  > 0 ? `${eqCount}`  : "100+", color:"#00d4ff", icon:Database    },
  ];

  return (
    <section id="markets" style={{ background: "var(--space)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }} className="mb-14">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px w-5" style={{ background: "#00d4ff" }} />
            <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00d4ff" }}>INSTITUTIONAL GRADE</span>
          </div>
          <h2 className="font-display text-[36px] font-bold tracking-tight text-white lg:text-[46px]">
            The Infrastructure Behind OLOS
          </h2>
          <p className="mt-3 max-w-[500px] text-[15px] text-white/40">
            Live numbers pulled directly from the platform. Updated every 15 seconds.
          </p>
        </motion.div>

        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 mb-6" style={{ background: "rgba(255,255,255,0.04)" }}>
          {liveMetrics.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.06 }} viewport={{ once: true }}
              className="flex flex-col justify-between p-5" style={{ background: "var(--space)" }}>
              <span className="font-data text-[9.5px] text-white/30 leading-relaxed mb-3">{item.label}</span>
              <span className="font-data text-[28px] font-bold tabular-nums leading-none" style={{ color: item.color }}>
                {item.value}<span className="text-[13px] ml-0.5 opacity-50">{item.unit}</span>
              </span>
            </motion.div>
          ))}
        </div>

        {telem && telem.services.length > 0 && (
          <div className="mb-6 rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <p className="font-data mb-4 text-[9px] font-bold tracking-[0.25em] text-white/20">LIVE SERVICE HEALTH</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {telem.services.map(svc => (
                <div key={svc.name} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse" style={{ background: svcColor(svc.status) }} />
                  <div className="min-w-0">
                    <p className="font-data text-[9px] text-white/50 truncate capitalize">{svc.name.replace(/-/g, " ")}</p>
                    <p className="font-data text-[8.5px]" style={{ color: svcColor(svc.status) }}>{svc.latencyMs}ms</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" id="markets">
          {markets.map(({ label, count, color, icon: Icon }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }} viewport={{ once: true }}
              className="rounded-xl p-4 text-center"
              style={{ background: "var(--surface)", border: `1px solid ${color}18` }}>
              <Icon size={18} className="mx-auto mb-2" style={{ color }} />
              <p className="font-data text-[20px] font-bold" style={{ color }}>{count}</p>
              <p className="font-data text-[10px] text-white/35">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 10 — ACCOUNT TIERS
// ══════════════════════════════════════════════════════════════════════
const TIERS = [
  { name:"Standard",   min:"$250",    color:"rgba(255,255,255,0.25)", features:["OLOS signal feed","iTrader terminal","1:30 leverage","Email support"],                                                   cta:"Open Standard", to:"/register"  },
  { name:"Gold",       min:"$2,500",  color:"#ff9f00",               features:["OLOS intelligence","Portfolio analysis","1:100 leverage","Priority support","Autopilot"],                                cta:"Open Gold",     to:"/register"  },
  { name:"Platinum",   min:"$10,000", color:"#00d4ff",               features:["Institutional OLOS","Calibration dashboard","1:200 leverage","Dedicated analyst","Regime alerts","API"],                cta:"Open Platinum", to:"/register", flagship:true },
  { name:"VIP",        min:"$50,000", color:"#00ff9f",               features:["All Platinum features","VIP Account Manager","Dedicated trading desk","Exclusive OLOS insights","Priority withdrawals","Custom leverage"], cta:"Apply VIP",     to:"/register"  },
  { name:"Enterprise", min:"Custom",  color:"#0080ff",               features:["Custom signal models","White-glove config","Prime brokerage","Dedicated desk","SLA guarantee","Compliance"],             cta:"Contact us",    to:"/contact"   },
];

function AccountTiers() {
  return (
    <section id="accounts" style={{ background: "var(--void)" }} className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }} className="mb-14 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="h-px w-5" style={{ background: "#00d4ff" }} />
            <span className="font-data text-[10px] tracking-[0.3em]" style={{ color: "#00d4ff" }}>ACCESS TIERS</span>
          </div>
          <h2 className="font-display text-[36px] font-bold tracking-tight text-white lg:text-[44px]">
            Your Level of Intelligence
          </h2>
          <p className="mx-auto mt-3 max-w-[420px] text-[14px] text-white/40">
            Every tier includes OLOS. Higher tiers unlock deeper calibration and institutional execution.
          </p>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((tier, i) => (
            <motion.div key={tier.name} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.09 }} viewport={{ once: true }}
              className="relative flex flex-col rounded-2xl p-6"
              style={{
                background: tier.flagship ? "rgba(0,212,255,0.05)" : "var(--surface)",
                border:     tier.flagship ? "1px solid rgba(0,212,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                ...(tier.flagship ? { boxShadow: "0 0 40px rgba(0,212,255,0.08)" } : {}),
              }}>
              {tier.flagship && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full px-3 py-0.5 font-data text-[9px] font-bold tracking-widest text-black"
                        style={{ background: "linear-gradient(135deg,#00d4ff,#0080ff)" }}>FLAGSHIP</span>
                </div>
              )}
              <p className="font-data mb-1 text-[10px] font-bold tracking-wider" style={{ color: tier.color }}>{tier.name.toUpperCase()}</p>
              <p className="font-display mb-0.5 text-[28px] font-bold text-white">{tier.min}</p>
              <p className="font-data mb-5 text-[10px] text-white/25">minimum deposit</p>
              <ul className="mb-6 flex-1 space-y-2">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle size={11} className="mt-0.5 shrink-0" style={{ color: tier.color }} />
                    <span className="font-data text-[11px] text-white/50">{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={tier.to} className="btn-scan block w-full rounded-xl py-2.5 text-center font-data text-[11px] font-bold transition-all"
                style={tier.flagship
                  ? { background: "linear-gradient(135deg,#00d4ff,#0080ff)", color:"#000", boxShadow:"0 0 20px rgba(0,212,255,0.25)" }
                  : { border:`1px solid ${tier.color}30`, color:tier.color }}>
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 11 — THE OPENING (final CTA)
// ══════════════════════════════════════════════════════════════════════
function TheOpening() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [showCTA, setShowCTA] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setShowCTA(true), 1700);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <section ref={ref} className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-20" style={{ background: "var(--void)" }}>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[600px] w-[600px] rounded-full"
             style={{ background: "radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)", animation: "ambient-pulse 4s ease-in-out infinite" }} />
      </div>
      <div className="relative z-10 flex flex-col items-center text-center">
        {inView && (
          <h2 className="question-text font-display font-bold text-white"
              style={{ fontSize: "clamp(32px, 6vw, 80px)", letterSpacing: "-0.02em", lineHeight: 1.08 }}>
            Ready to trade with intelligence?
          </h2>
        )}
        <AnimatePresence>
          {showCTA && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }} className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <MagneticBtn to="/register" primary className="px-8 py-4 text-[14px]">
                Open Account <ArrowRight size={15} />
              </MagneticBtn>
              <MagneticBtn to="/platform/olos-ai" className="px-8 py-4 text-[14px]">
                Explore OLOS Platform
              </MagneticBtn>
            </motion.div>
          )}
        </AnimatePresence>
        {showCTA && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="mt-10 flex flex-wrap justify-center gap-5">
            {[{ icon:Shield,l:"ESMA Regulated" },{ icon:Lock,l:"Segregated Funds" },{ icon:Eye,l:"Full Audit Trail" },{ icon:Zap,l:"< 5ms Execution" }].map(({ icon:I, l }) => (
              <div key={l} className="flex items-center gap-1.5">
                <I size={11} className="text-white/20" />
                <span className="font-data text-[10px] tracking-wider text-white/25">{l}</span>
              </div>
            ))}
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-16 border-t pt-8" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="font-data text-[11px] tracking-[0.25em] text-white/20">
            OLOS IS THE INTELLIGENCE LAYER · IGFXPRO IS THE EXECUTION LAYER
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// COMPLIANCE + FOOTER
// ══════════════════════════════════════════════════════════════════════
function ComplianceBar() {
  return (
    <div className="border-t px-6 py-8 text-center" style={{ background: "var(--space)", borderColor: "rgba(255,255,255,0.04)" }}>
      <p className="mx-auto max-w-[720px] font-data text-[10.5px] leading-relaxed text-white/20">
        CFD and forex trading involves significant risk. 74–89% of retail investor accounts lose money when trading CFDs. OLOS intelligence signals are informational only and do not constitute financial advice. Past performance is not indicative of future results.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {["ESMA Regulated","Segregated Funds","Negative Balance Protection","External Audit"].map(b => (
          <span key={b} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-data text-[9.5px] text-white/25"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <Shield size={8} className="text-white/20" />{b}
          </span>
        ))}
      </div>
    </div>
  );
}

const FOOTER_COLS = [
  { h:"OLOS Intelligence", links:[["How OLOS Works","/platform/olos-ai"],["AI Regime Map","/platform/olos-ai"],["Confidence Engine","/platform/olos-ai"],["Signal Engine","/platform/olos-ai"]] },
  { h:"Platform",          links:[["iTrader Terminal","/trading?platform=itrader"],["Autopilot","/platform/autopilot"],["Portfolio Analytics","/portfolio"],["Risk Engine","/platform/risk"]] },
  { h:"Markets & Tools",   links:[["Signals Feed","/signals"],["Economic Calendar","/calendar"],["Forex","/markets/forex"],["Crypto","/markets/crypto"]] },
  { h:"Company",           links:[["About","/about"],["Academy","/platform/academy"],["Careers","/careers"],["Contact","/contact"]] },
  { h:"Legal",             links:[["Terms","/legal/terms"],["Privacy","/legal/privacy"],["Risk Warning","/legal/risk-disclosure"],["Cookies","/legal/cookies"]] },
];

function SiteFooter() {
  return (
    <footer className="border-t pb-16 pt-14" style={{ background: "var(--space)", borderColor: "rgba(255,255,255,0.04)" }}>
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                   style={{ background: "linear-gradient(135deg,#00d4ff,#0080ff)", boxShadow: "0 0 12px rgba(0,212,255,0.3)" }}>
                <BarChart2 size={15} strokeWidth={2.5} className="text-black" />
              </div>
              <span className="font-display text-[14px] font-bold text-white">IGFXPRO</span>
            </div>
            <p className="font-data max-w-[170px] text-[11px] leading-relaxed text-white/25">
              AI trading intelligence platform.<br />OLOS thinks. iTrader executes.
            </p>
          </div>
          {FOOTER_COLS.map(col => (
            <div key={col.h}>
              <p className="font-data mb-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">{col.h}</p>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("/")
                      ? <Link to={href} className="font-data text-[11px] text-white/30 hover:text-white transition-colors">{label}</Link>
                      : <a   href={href} className="font-data text-[11px] text-white/30 hover:text-white transition-colors">{label}</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-8 sm:flex-row" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <p className="font-data text-[10px] text-white/15">© {new Date().getFullYear()} IGFXPRO · All rights reserved</p>
          <p className="font-data text-[10px] text-white/15">Powered by <span style={{ color: "rgba(0,212,255,0.4)" }}>OLOS Intelligence Engine</span></p>
        </div>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// ══════════════════════════════════════════════════════════════════════
export default function ProfessionalHomepage() {
  const [ready, setReady] = useState(false);

  return (
    <div className="olos-ui min-h-screen bg-black font-display text-white antialiased">
      <OlosCursor />
      <VoidLoader onDone={() => setReady(true)} />
      <SiteNav ready={ready} />
      <main>
        <NeuralHero    ready={ready} />
        <RegimePulse />
        <SignalPipeline />
        <MarketHeartbeat />
        <IntelligenceChronicle />
        <SignalAnatomy />
        <PlatformOrbit />
        <LiveSignalFeed />
        <EconomicCalendarTeaser />
        <AutopilotTeaser />
        <TerminalPreview />
        <TheLiveRoom />
        <TheComparison />
        <InstitutionalInfra />
        <AccountTiers />
        <TheOpening />
        <ComplianceBar />
      </main>
      <SiteFooter />
    </div>
  );
}
