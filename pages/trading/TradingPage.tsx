/**
 * IGFXPRO — iTrader Terminal v3 · Apex Edition
 * Ultra-professional trading terminal with OLOS AI
 * iTrader + OLOS | MT5 + OLOS Autopilot
 */
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, BarChart2, BookOpen,
  ChevronDown, Clock, Lock, Monitor, Shield, ShieldAlert,
  Sparkles, Target, Zap, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Cpu, Radio, CheckCircle2,
  XCircle, LayoutGrid, Brain, Layers,
} from "lucide-react";
import { OrderConfirmDialog, type OrderDraft } from "../../components/trading/OrderConfirmDialog";
import { TradingChart, type Timeframe } from "../../components/realtime/LightweightCharts";
import OrderBook       from "../../components/trading/OrderBook";
import DepthChart      from "../../components/charts/DepthChart";
import { useMarketStore }  from "../../store/market.store";
import { useTradingStore } from "../../store/trading.store";
import { useRiskStore }    from "../../store/risk.store";
import { useFeatureFlags } from "../../app/FeatureFlagProvider";
import { useSignalStore }  from "../../store/signal.store";
import { useTier }         from "../../app/TierProvider";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { money, money2, number, priceDigits, countdown } from "../../shared/utils/format";
import { useToast }               from "../../components/ui/Toast";
import { useKeyboardShortcuts }   from "../../hooks/useKeyboardShortcuts";
import { usePageTitle }           from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────
type IndicatorSnapshot = {
  symbol: string; timeframe: string; rsi: number;
  macd: { value: number; signal: number; histogram: number; bias: string };
  ema: { ema20: number; ema50: number; trend: string };
  vwap: number;
  bollinger: { upper: number; middle: number; lower: number; bandwidthPct: number };
  smartMoney: { bias: string; orderBlock: string; liquiditySweep: string; volumeProfile: string };
};
type AutopilotConfig = {
  enabled: boolean; mode: string; minConfidence: number; tier: string;
  allowedSymbols: string[];
  // Absent until the autopilot engine actually makes a decision for this
  // user — true for every account today, not an error state.
  lastDecision?: { symbol: string; action: string; reason: string };
};
// Real shape from GET /api/v1/calendar/economic (lowercase impact, eventTime
// ISO, title not event) — countdown is derived client-side, never fabricated.
type RawCalendarEvent = { title: string; impact: string; eventTime: string };
type CalendarEvent    = { event: string; impact: string; countdownSeconds: number };
type OrderAck       = { id: string; clientOrderId?: string; symbol: string; side: "BUY" | "SELL"; type: string; quantity: number; status: string; averageFillPrice?: number; marginRequired: number; notional: number; rejectionReason?: string; createdAt: string };
type RiskSnap       = { riskScore: number; marginLevelPct: number; stopOutLevelPct: number; negativeBalanceProtection: boolean; alerts: string[] };
type Position       = { id: string; symbol: string; side: "BUY" | "SELL"; quantity: number; entryPrice: number; markPrice?: number; pnl?: number; marginUsed: number };

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMEFRAMES: Timeframe[] = ["1M", "5M", "15M", "1H", "4H", "1D"];
const TIER_RANK: Record<string, number> = { STANDARD: 0, GOLD: 1, VIP: 2, PLATINUM: 3, ENTERPRISE: 4 };
const QUICK_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "ETHUSD", "US500", "AAPL"];
const LIVE_SYMBOLS  = new Set(QUICK_SYMBOLS);
const AI_MODELS = ["Regime", "Confidence", "Sentiment", "Flow", "Risk", "Scenario", "Macro", "Liquidity", "Momentum", "Volume", "Pattern", "ML Alpha"];

// ─── Tier lock ────────────────────────────────────────────────────────────────
function TierLock({ required, children }: { required: string; children: React.ReactNode }) {
  const { tier } = useTier();
  if ((TIER_RANK[tier] ?? 0) >= (TIER_RANK[required] ?? 0)) return <>{children}</>;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-950/60">
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
          <Lock size={15} className="text-amber-400" />
        </div>
        <p className="text-[11px] font-black text-amber-300">{required}+ required</p>
        <Link to="/dashboard" className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black text-amber-300 hover:bg-amber-400/20 transition">
          Upgrade tier
        </Link>
      </div>
    </div>
  );
}

// ─── Symbol quote strip ───────────────────────────────────────────────────────
function QuoteStrip({ symbol, onSelect }: { symbol: string; onSelect: (s: string) => void }) {
  const quotes = useMarketStore(s => s.quotes);
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {QUICK_SYMBOLS.map(sym => {
        const q      = quotes[sym];
        const active = sym === symbol;
        const up     = (q?.changePct ?? 0) >= 0;
        const isLive = LIVE_SYMBOLS.has(sym);
        return (
          <button key={sym} onClick={() => onSelect(sym)}
            className={`relative flex shrink-0 flex-col items-start overflow-hidden rounded-xl border px-3.5 py-2.5 transition-all duration-200 ${
              active
                ? "border-cyan-400/40 bg-gradient-to-b from-cyan-400/[0.1] to-cyan-400/[0.03] shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                : "border-slate-800/80 bg-gradient-to-b from-white/[0.02] to-transparent hover:border-slate-700 hover:from-white/[0.04]"
            }`}>
            {active && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0" />}
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black ${active ? "text-cyan-300" : "text-slate-400"}`}>{sym}</span>
              {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
            </div>
            {q ? (
              <>
                <span className={`mt-0.5 font-mono text-[14px] font-black tabular-nums ${active ? "text-white" : "text-slate-200"}`}>
                  {number(q.mid, priceDigits(sym))}
                </span>
                <span className={`mt-0.5 flex items-center gap-0.5 text-[9px] font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
                  {up ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
                  {Math.abs(q.changePct ?? 0).toFixed(2)}%
                </span>
              </>
            ) : (
              <div className="mt-1 space-y-1">
                <div className="h-3 w-14 animate-pulse rounded bg-slate-800" />
                <div className="h-2 w-8 animate-pulse rounded bg-slate-800" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── OLOS signal banner ───────────────────────────────────────────────────────
function OlosSignalBadge({ symbol }: { symbol: string }) {
  const signal = useSignalStore(s => s.signals.find(sg => sg.symbol === symbol && sg.status === "ACTIVE"));
  if (!signal) return null;

  const isBuy = signal.signalType === "BUY";
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={`relative mx-4 mt-3 overflow-hidden rounded-xl border px-5 py-3.5 ${
        isBuy
          ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.07] to-emerald-500/[0.02]"
          : "border-rose-500/30 bg-gradient-to-r from-rose-500/[0.07] to-rose-500/[0.02]"
      }`}>
      <div className={`absolute inset-y-0 left-0 w-0.5 ${isBuy ? "bg-emerald-400" : "bg-rose-400"}`} />
      <div className="flex items-center gap-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${isBuy ? "border-emerald-500/30 bg-emerald-500/15" : "border-rose-500/30 bg-rose-500/15"}`}>
          <Brain size={15} className={isBuy ? "text-emerald-400" : "text-rose-400"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[12px] font-black ${isBuy ? "text-emerald-300" : "text-rose-300"}`}>
              OLOS {signal.signalType} Signal
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${isBuy ? "border-emerald-500/30 bg-emerald-400/10 text-emerald-300" : "border-rose-500/30 bg-rose-400/10 text-rose-300"}`}>
              {number(signal.confidence, 0)}% confidence
            </span>
          </div>
          {signal.entryPrice > 0 && (
            <div className="mt-1 flex flex-wrap gap-4 text-[10px]">
              <span className="text-slate-500">Entry <span className="font-mono font-bold text-slate-300">{number(signal.entryPrice, priceDigits(symbol))}</span></span>
              {signal.stopLoss > 0 && <span className="text-slate-500">SL <span className="font-mono font-bold text-rose-400">{number(signal.stopLoss, priceDigits(symbol))}</span></span>}
              {(signal.targetLevels?.[0] ?? 0) > 0 && <span className="text-slate-500">TP <span className="font-mono font-bold text-emerald-400">{number(signal.targetLevels[0], priceDigits(symbol))}</span></span>}
            </div>
          )}
        </div>
        {/* Confidence bar vertical */}
        <div className="shrink-0">
          <div className="h-12 w-3 overflow-hidden rounded-full border border-white/[0.06] bg-slate-900">
            <div className={`w-full rounded-full transition-all duration-700 ${isBuy ? "bg-gradient-to-t from-emerald-600 to-emerald-300" : "bg-gradient-to-t from-rose-600 to-rose-300"}`}
              style={{ height: `${signal.confidence}%`, marginTop: `${100 - signal.confidence}%` }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Risk status bar ──────────────────────────────────────────────────────────
function RiskBar({ risk }: { risk: RiskSnap | undefined }) {
  const warningCount = useRiskStore(s => s.unacknowledgedCount);
  const kill         = useRiskStore(s => s.killSwitchActive);
  if (!risk && !kill && warningCount === 0) return null;

  const ml    = risk?.marginLevelPct ?? 0;
  const rs    = risk?.riskScore ?? 0;
  const mlCls = ml > 0 && ml < 120 ? "text-rose-300" : ml < 200 ? "text-amber-300" : "text-emerald-300";
  const mlBar = ml > 0 && ml < 120 ? "bg-rose-500" : ml < 200 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-xl border border-slate-800/60 bg-gradient-to-r from-white/[0.02] to-transparent px-5 py-3">
      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-600">
        <Shield size={11} /> Risk Monitor
      </div>

      {ml > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-slate-600">Margin</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
            <div className={`h-full rounded-full transition-all duration-500 ${mlBar}`} style={{ width: `${Math.min(100, ml / 4)}%` }} />
          </div>
          <span className={`font-mono text-[12px] font-black ${mlCls}`}>{number(ml, 0)}%</span>
        </div>
      )}
      {rs > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-600">Risk score</span>
          <span className={`font-mono text-[12px] font-black ${rs > 70 ? "text-rose-300" : rs > 40 ? "text-amber-300" : "text-emerald-300"}`}>{rs}/100</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
        <CheckCircle2 size={11} /> NBP Active
      </div>
      {warningCount > 0 && (
        <Link to="/risk" className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1">
          <AlertTriangle size={10} className="text-amber-400" />
          <span className="text-[10px] font-black text-amber-300">{warningCount} alert{warningCount > 1 ? "s" : ""}</span>
        </Link>
      )}
      {kill && (
        <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1">
          <ShieldAlert size={10} className="text-rose-400" />
          <span className="text-[10px] font-black text-rose-300">KILL SWITCH ACTIVE</span>
        </div>
      )}
      <span className="ml-auto text-[9px] text-slate-700">ESMA MiFID II · {risk?.stopOutLevelPct ?? 50}% stop-out</span>
    </div>
  );
}

// ─── Technical indicators panel ───────────────────────────────────────────────
function IndicatorsPanel({ data, symbol, timeframe }: { data: IndicatorSnapshot | undefined; symbol: string; timeframe: string }) {
  const pd = priceDigits(symbol);
  if (!data) return (
    <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
      <p className="mb-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">Indicators · {symbol} · {timeframe}</p>
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="mb-2 h-14 animate-pulse rounded-xl bg-slate-800/40" />)}
    </div>
  );

  const rows = [
    {
      label: "RSI (14)", value: number(data.rsi, 1), bar: data.rsi, max: 100,
      valCls: data.rsi < 30 ? "text-emerald-300" : data.rsi > 70 ? "text-rose-300" : "text-white",
      barCls: data.rsi < 30 ? "bg-emerald-500" : data.rsi > 70 ? "bg-rose-500" : "bg-cyan-500",
      leftBorder: data.rsi < 30 ? "bg-emerald-500" : data.rsi > 70 ? "bg-rose-500" : "bg-slate-600",
      note: data.rsi < 30 ? "Oversold — potential bounce" : data.rsi > 70 ? "Overbought — reversal risk" : "Neutral zone",
    },
    {
      label: "MACD", value: data.macd.bias.toUpperCase(),
      valCls: data.macd.bias === "bullish" ? "text-emerald-300" : "text-rose-300",
      leftBorder: data.macd.bias === "bullish" ? "bg-emerald-500" : "bg-rose-500",
      note: `Signal ${number(data.macd.signal, 5)} · Hist ${number(data.macd.histogram, 5)}`,
    },
    {
      label: "EMA 20/50", value: data.ema.trend.toUpperCase(),
      valCls: data.ema.trend.includes("up") ? "text-emerald-300" : "text-rose-300",
      leftBorder: data.ema.trend.includes("up") ? "bg-emerald-500" : "bg-rose-500",
      note: `${number(data.ema.ema20, pd)} / ${number(data.ema.ema50, pd)}`,
    },
    {
      label: "VWAP", value: number(data.vwap, pd),
      valCls: "text-cyan-300",
      leftBorder: "bg-cyan-500",
      note: "Volume weighted average price",
    },
    {
      label: "Bollinger", value: `${number(data.bollinger.bandwidthPct, 1)}% BW`,
      valCls: "text-violet-300",
      leftBorder: "bg-violet-500",
      note: `${number(data.bollinger.lower, pd)} — ${number(data.bollinger.upper, pd)}`,
    },
    {
      label: "Smart Money", value: data.smartMoney.bias.toUpperCase(),
      valCls: data.smartMoney.bias === "accumulation" ? "text-emerald-300" : "text-rose-300",
      leftBorder: data.smartMoney.bias === "accumulation" ? "bg-emerald-500" : "bg-rose-500",
      note: data.smartMoney.orderBlock,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Indicators</p>
        <span className="rounded-lg bg-slate-800/60 px-2 py-0.5 text-[9px] font-bold text-slate-500">{symbol} · {timeframe}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(({ label, value, valCls, bar, max, barCls, leftBorder, note }) => (
          <div key={label} className="relative overflow-hidden rounded-xl bg-slate-900/40 px-3.5 py-2.5">
            <div className={`absolute inset-y-0 left-0 w-0.5 ${leftBorder}`} />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500">{label}</span>
              <span className={`font-mono text-[13px] font-black ${valCls}`}>{value}</span>
            </div>
            {bar !== undefined && max && barCls && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full transition-all duration-700 ${barCls}`} style={{ width: `${(bar / max) * 100}%` }} />
              </div>
            )}
            <p className="mt-0.5 text-[9px] text-slate-700">{note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Autopilot panel ──────────────────────────────────────────────────────────
function AutopilotPanel({ ap }: { ap: AutopilotConfig | undefined }) {
  if (!ap) return <div className="h-40 animate-pulse rounded-2xl bg-slate-900/40" />;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-950/30 to-[#060b14]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-500/0 via-violet-400 to-violet-500/0" />
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
              <Sparkles size={13} className="text-violet-400" />
              {ap.enabled && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#060b14]" />}
            </div>
            <p className="text-[13px] font-black text-white">OLOS Autopilot</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black ${ap.enabled ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25" : "bg-slate-800 text-slate-500"}`}>
            {ap.enabled ? <><Radio size={8} className="animate-pulse" /> ACTIVE</> : "PAUSED"}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-3">
            <p className="text-[9px] text-slate-600">Min confidence</p>
            <p className="mt-0.5 font-mono text-[16px] font-black text-cyan-300">{Math.round(ap.minConfidence * 100)}%</p>
          </div>
          <div className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-3">
            <p className="text-[9px] text-slate-600">Mode</p>
            <p className="mt-0.5 text-[16px] font-black capitalize text-white">{ap.mode}</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-3">
          <p className="mb-1.5 text-[9px] font-black uppercase tracking-wider text-slate-600">Last AI decision</p>
          <p className="text-[10px] leading-relaxed text-slate-400">{ap.lastDecision?.reason ?? "No decisions yet — Autopilot hasn't acted on your account."}</p>
        </div>

        <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-600">AI engines</p>
        <div className="grid grid-cols-3 gap-1.5">
          {AI_MODELS.map((m, i) => (
            <div key={m} className="flex items-center gap-1.5 rounded-lg bg-slate-900/50 px-2 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: `${i * 0.12}s` }} />
              <span className="text-[9px] text-slate-500">{m}</span>
            </div>
          ))}
        </div>

        {ap.allowedSymbols?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ap.allowedSymbols.slice(0, 6).map(s => (
              <span key={s} className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black text-violet-300">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Responsive chart height ──────────────────────────────────────────────────
function computeChartHeight(): number {
  if (typeof window === "undefined") return 420;
  const w = window.innerWidth;
  return w < 1280 ? Math.min(Math.max(Math.round(w * 0.56), 220), 360) : 440;
}

function useChartHeight(): number {
  const [h, setH] = useState(computeChartHeight);
  useEffect(() => {
    const handler = () => setH(computeChartHeight());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return h;
}

// ─── Mobile position card ─────────────────────────────────────────────────────
function PositionCard({ pos, onClose, closing }: { pos: Position; onClose: () => void; closing: boolean }) {
  const posPnl = Number(pos.pnl) || 0;
  const up = posPnl >= 0;
  const pd = priceDigits(pos.symbol);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
      <div className={`absolute inset-y-0 left-0 w-0.5 ${up ? "bg-emerald-500" : "bg-rose-500"}`} />
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-black text-white">{pos.symbol}</span>
          <span className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${pos.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
            {pos.side}
          </span>
        </div>
        <span className={`font-mono text-[22px] font-black tabular-nums ${up ? "text-emerald-300" : "text-rose-300"}`}>
          {up ? "+" : ""}{money2(posPnl)}
        </span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "Volume", val: number(Number(pos.quantity) || 0, 2),                           cls: "text-white"     },
          { label: "Entry",  val: number(Number(pos.entryPrice) || 0, pd),                        cls: "text-slate-300" },
          { label: "Mark",   val: number(Number(pos.markPrice ?? pos.entryPrice) || 0, pd),       cls: "text-slate-400" },
        ].map(({ label, val, cls }) => (
          <div key={label} className="rounded-xl border border-slate-800/40 bg-slate-900/50 px-2.5 py-2">
            <p className="text-[9px] text-slate-600">{label}</p>
            <p className={`mt-0.5 font-mono text-[12px] font-bold ${cls}`}>{val}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-xl border border-slate-800/40 bg-slate-900/40 px-3 py-2 text-[11px]">
          <span className="text-slate-600">Margin: </span>
          <span className="font-mono font-bold text-slate-400">{money(pos.marginUsed)}</span>
        </div>
        <button onClick={onClose} disabled={closing}
          className="rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-2.5 text-[12px] font-black text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-wait disabled:opacity-50">
          {closing ? "…" : "Close"}
        </button>
      </div>
    </div>
  );
}

// ─── Mobile order history card ────────────────────────────────────────────────
function OrderHistCard({ order }: { order: OrderAck }) {
  const pd = priceDigits(order.symbol);
  return (
    <div className="rounded-2xl border border-slate-800/50 bg-gradient-to-b from-white/[0.015] to-transparent px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-black text-white">{order.symbol}</span>
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${order.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
            {order.side}
          </span>
          <span className="text-[10px] text-slate-500">{order.type}</span>
        </div>
        <span className={`text-[11px] font-black ${order.status === "FILLED" ? "text-emerald-400" : order.status === "REJECTED" ? "text-rose-400" : "text-amber-400"}`}>
          {order.status}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-4 text-[11px] text-slate-500">
        <span>Vol: <span className="font-mono text-slate-300">{number(order.quantity, 2)}</span></span>
        {order.averageFillPrice && <span>@ <span className="font-mono text-slate-300">{number(order.averageFillPrice, pd)}</span></span>}
        <span className="ml-auto text-slate-600">{new Date(order.createdAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TERMINAL
// ─────────────────────────────────────────────────────────────────────────────
export default function TradingPage() {
  const [searchParams] = useSearchParams();
  const platform = searchParams.get("platform") === "mt5" ? "mt5" : "itrader";
  const qc       = useQueryClient();
  const toast    = useToast();
  const { tier } = useTier();

  const quotesMap        = useMarketStore(s => s.quotes);
  const positions        = useTradingStore(s => s.positions);
  const killSwitch       = useRiskStore(s => s.killSwitchActive);
  const liveTradeDisabled = useRiskStore(s => s.liveTradeDisabled);
  const { flags }        = useFeatureFlags();
  const tradingBlocked   = killSwitch || !flags.liveTrading || liveTradeDisabled;

  const [tf,          setTf]          = useState<Timeframe>("15M");
  const [symbol,      setSymbol]      = useState("EURUSD");
  const [side,        setSide]        = useState<"BUY" | "SELL">("BUY");
  const [orderType,   setOrderType]   = useState<"MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT">("MARKET");
  const [qty,         setQty]         = useState(1000);
  const [lev,         setLev]         = useState(20);
  const [sl,          setSl]          = useState("");
  const [tp,          setTp]          = useState("");
  const [limitPrice,  setLimitPrice]  = useState("");
  const [oneClick,    setOneClick]    = useState(false);
  const [showAdv,     setShowAdv]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastOrder,   setLastOrder]   = useState<OrderAck | null>(null);
  const [activeTab,   setActiveTab]   = useState<"positions" | "history">("positions");
  const [showBook,    setShowBook]    = useState(true);
  const chartHeight = useChartHeight();

  const quote    = useMarketStore(s => s.quotes[symbol]);
  const bid      = quote?.bid ?? 0;
  const ask      = quote?.ask ?? 0;
  const execPrice = orderType === "MARKET" ? (side === "BUY" ? ask : bid) : Number(limitPrice) || ask;
  const notional = execPrice * qty;
  const margin   = notional / lev;

  const pipSize      = symbol.includes("JPY") ? 0.01 : symbol.includes("US5") || symbol.includes("US1") || symbol.includes("BTC") || symbol.includes("ETH") ? 1 : 0.0001;
  const pipValueUsd  = (pipSize / execPrice) * qty * (symbol.endsWith("USD") ? execPrice : 1);
  const slDist       = sl ? Math.abs(execPrice - Number(sl)) : 0;
  const tpDist       = tp ? Math.abs(execPrice - Number(tp)) : 0;
  const rrRatio      = slDist > 0 && tpDist > 0 ? (tpDist / slDist).toFixed(2) : null;
  const slPips       = slDist > 0 ? (slDist / pipSize).toFixed(1) : null;
  const tpPips       = tpDist > 0 ? (tpDist / pipSize).toFixed(1) : null;

  usePageTitle(quote
    ? `${quote.symbol} ${number(quote.mid, priceDigits(symbol))} — ${platform === "mt5" ? "MT5" : "iTrader"}`
    : "Terminal — IGFXPRO");

  const calQ  = useQuery({
    queryKey: ["cal"],
    queryFn:  async () => {
      const raw = await apiGet<RawCalendarEvent[]>("/api/v1/calendar/economic?hours=24");
      return raw.map((e): CalendarEvent => ({
        event:            e.title,
        impact:           e.impact,
        countdownSeconds: Math.round((new Date(e.eventTime).getTime() - Date.now()) / 1000),
      }));
    },
    staleTime: 30_000,
  });
  const indQ  = useQuery({ queryKey: ["ind", symbol, tf], queryFn: () => apiGet<IndicatorSnapshot>(`/api/v1/indicators/${symbol}?timeframe=${tf}`),     staleTime: 5_000  });
  const apQ   = useQuery({ queryKey: ["ap"],              queryFn: () => apiGet<AutopilotConfig>("/api/v1/autopilot/config"),                           staleTime: 10_000 });
  const riskQ = useQuery({ queryKey: ["risk-t"],          queryFn: () => apiGet<RiskSnap>("/api/v1/risk/snapshot"),                                     staleTime: 8_000, refetchInterval: 15_000 });

  const nextEvent = calQ.data?.find(e => e.countdownSeconds > 0 && e.impact.toLowerCase() === "high");
  const ind       = indQ.data;
  const ap        = apQ.data;
  const risk      = riskQ.data;
  const quotes    = Object.values(quotesMap);
  const totalPnL  = positions.reduce((s, p) => s + (Number(p.pnl) || 0), 0);

  const mut = useMutation({
    mutationFn: () => {
      if (killSwitch)         throw new Error("Kill switch active — all trading halted");
      if (!flags.liveTrading)  throw new Error("Live trading is disabled — contact support");
      if (liveTradeDisabled)   throw new Error("Live trading is disabled — contact support");
      return apiPost<OrderAck>("/api/v1/trading/order", {
        symbol, side, type: orderType, quantity: qty, leverage: lev,
        stopLoss:    sl ? Number(sl) : undefined,
        takeProfit:  tp ? Number(tp) : undefined,
        limitPrice:  (orderType === "LIMIT" || orderType === "STOP_LIMIT") && limitPrice ? Number(limitPrice) : undefined,
        stopPrice:   orderType === "STOP" && limitPrice ? Number(limitPrice) : undefined,
        clientOrderId: `${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      });
    },
    onSuccess: (order) => {
      setShowConfirm(false);
      setLastOrder(order);
      if (order.status === "FILLED") {
        toast.success(`Filled ${order.symbol}`, `${side} ${number(qty, 0)} @ ${number(order.averageFillPrice ?? 0, priceDigits(symbol))}`);
        useTradingStore.getState().addOrder({
          id: order.id, symbol: order.symbol, side: order.side, type: "MARKET",
          status: "FILLED", quantity: qty, requestedPrice: undefined,
          clientOrderId: order.clientOrderId, averageFillPrice: order.averageFillPrice,
          marginRequired: order.marginRequired, notional: order.notional, createdAt: order.createdAt,
        });
        void qc.invalidateQueries({ queryKey: ["positions"] });
        void qc.invalidateQueries({ queryKey: ["wallet"] });
        void qc.invalidateQueries({ queryKey: ["risk-t"] });
      } else {
        toast.error(`Order ${order.status}`, order.rejectionReason ?? "Rejected by risk engine");
      }
    },
    onError: (e) => { setShowConfirm(false); toast.error("Order failed", e instanceof Error ? e.message : "Network error"); },
  });

  const closeMut = useMutation({
    mutationFn: (positionId: string) => apiPost(`/api/v1/trading/position/${positionId}/close`, {}),
    onSuccess: (_, positionId) => {
      toast.success("Position closed", `Position ${positionId} closed at market`);
      void qc.invalidateQueries({ queryKey: ["positions"] });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void qc.invalidateQueries({ queryKey: ["risk-t"] });
    },
    onError: (e) => toast.error("Close failed", e instanceof Error ? e.message : "Error"),
  });

  const histQ = useQuery({
    queryKey: ["order-history"],
    queryFn:  () => apiGet<OrderAck[]>("/api/v1/trading/orders?limit=50"),
    staleTime: 10_000,
    enabled: activeTab === "history",
  });

  useKeyboardShortcuts({
    "b": () => setSide("BUY"),
    "s": () => setSide("SELL"),
    "m": () => setOrderType("MARKET"),
    "l": () => setOrderType("LIMIT"),
    "Escape": () => setShowConfirm(false),
    "1": () => setTf("1M"),  "2": () => setTf("5M"),  "3": () => setTf("15M"),
    "4": () => setTf("1H"),  "5": () => setTf("4H"),  "6": () => setTf("1D"),
  });

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (oneClick) { mut.mutate(); return; }
    setShowConfirm(true);
  }, [oneClick, mut]);

  const draft: OrderDraft = { symbol, side, type: orderType, quantity: qty, leverage: lev, notional, marginRequired: margin };

  return (
    <div className="flex min-h-screen flex-col bg-[#030508] text-slate-200">

      {/* ── Ambient grid ── */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.012]"
        style={{ backgroundImage: "linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TERMINAL HEADER — DESKTOP                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <header className="relative hidden border-b border-slate-800/60 bg-[#050810]/95 backdrop-blur xl:block">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-slate-800/0 via-slate-700/50 to-slate-800/0" />
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">

          {/* Left: platform badge + status */}
          <div className="flex items-center gap-3">
            <div className={`relative flex items-center gap-2 overflow-hidden rounded-xl border px-4 py-2 ${
              platform === "mt5"
                ? "border-violet-400/30 bg-violet-400/[0.07]"
                : "border-cyan-400/30 bg-cyan-400/[0.07]"
            }`}>
              <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${platform === "mt5" ? "via-violet-400" : "via-cyan-400"} to-transparent`} />
              {platform === "mt5" ? <Monitor size={13} className="text-violet-300" /> : <BarChart2 size={13} className="text-cyan-300" />}
              <span className={`text-[12px] font-black ${platform === "mt5" ? "text-violet-300" : "text-cyan-300"}`}>
                {platform === "mt5" ? "MT5 + OLOS Autopilot" : "iTrader + OLOS"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <Cpu size={10} /> OLOS · {tier}
            </div>

            {tradingBlocked && (
              <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5">
                <ShieldAlert size={11} className="text-rose-400" />
                <span className="text-[10px] font-black text-rose-300">
                  {killSwitch ? "KILL SWITCH ACTIVE" : "LIVE TRADING DISABLED"}
                </span>
              </div>
            )}
          </div>

          {/* Center: live price display */}
          {quote && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Symbol</p>
                <p className="text-[15px] font-black text-white">{symbol}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Price</p>
                <p className={`font-mono text-[22px] font-black tabular-nums leading-tight ${(quote.changePct ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {number(quote.mid, priceDigits(symbol))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Change</p>
                <p className={`flex items-center justify-center gap-1 text-[13px] font-black ${(quote.changePct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {(quote.changePct ?? 0) >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {(quote.changePct ?? 0) >= 0 ? "+" : ""}{(quote.changePct ?? 0).toFixed(2)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Spread</p>
                <p className="font-mono text-[13px] font-bold text-slate-400">{number(quote.spread, priceDigits(symbol))}</p>
              </div>
            </div>
          )}

          {/* Right: portfolio mini */}
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Positions</p>
              <p className="font-mono text-[14px] font-black text-white">{positions.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Live P&amp;L</p>
              <p className={`font-mono text-[14px] font-black ${totalPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {totalPnL >= 0 ? "+" : ""}{money2(totalPnL)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Risk</p>
              <p className={`font-mono text-[14px] font-black ${(risk?.riskScore ?? 0) > 70 ? "text-rose-300" : "text-emerald-300"}`}>
                {risk?.riskScore ?? "—"}/100
              </p>
            </div>
            <Link to={`/trading?platform=${platform === "mt5" ? "itrader" : "mt5"}`}
              className="rounded-xl border border-slate-700/60 bg-white/[0.02] px-3.5 py-2 text-[10px] font-black text-slate-400 transition hover:border-slate-500 hover:text-white">
              → {platform === "mt5" ? "iTrader" : "MT5"}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile header ── */}
      <header className="relative xl:hidden sticky top-0 z-20 border-b border-slate-800/60 bg-[#050810]/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-black ${
            platform === "mt5" ? "border-violet-400/30 bg-violet-400/[0.07] text-violet-300" : "border-cyan-400/30 bg-cyan-400/[0.07] text-cyan-300"
          }`}>
            {platform === "mt5" ? <Monitor size={12} /> : <BarChart2 size={12} />}
            {platform === "mt5" ? "MT5" : "iTrader"}
          </div>

          {quote ? (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-500">{symbol}</span>
              <span className={`font-mono text-[20px] font-black tabular-nums leading-tight ${(quote.changePct ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {number(quote.mid, priceDigits(symbol))}
              </span>
              <span className={`text-[10px] font-bold ${(quote.changePct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {(quote.changePct ?? 0) >= 0 ? "+" : ""}{(quote.changePct ?? 0).toFixed(2)}%
              </span>
            </div>
          ) : (
            <div className="h-12 w-24 animate-pulse rounded-xl bg-slate-800" />
          )}

          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {positions.length > 0 && (
              <>
                <span className="text-[9px] text-slate-600">Live P&amp;L</span>
                <span className={`font-mono text-[15px] font-black ${totalPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {totalPnL >= 0 ? "+" : ""}{money2(totalPnL)}
                </span>
              </>
            )}
            {tradingBlocked && (
              <span className="flex items-center gap-1 text-[9px] font-black text-rose-400">
                <ShieldAlert size={9} /> HALTED
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MAIN TERMINAL BODY                                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <main className="relative flex flex-col gap-3 p-4">

        {/* Symbol strip */}
        <QuoteStrip symbol={symbol} onSelect={setSymbol} />

        {/* Risk bar */}
        <RiskBar risk={risk} />

        {/* Economic event banner */}
        {nextEvent && (
          <div className="relative overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.06] to-amber-500/[0.01]">
            <div className="absolute inset-y-0 left-0 w-0.5 bg-amber-400" />
            <div className="flex items-center gap-4 px-5 py-3">
              <AlertTriangle size={14} className="shrink-0 text-amber-400" />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-black text-amber-200">{nextEvent.event}</span>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[9px] text-slate-600">Impact: <span className="font-black text-amber-400">{nextEvent.impact.toUpperCase()}</span></p>
                <p className="font-mono text-[15px] font-black text-amber-300">{countdown(nextEvent.countdownSeconds)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 2-column layout ── */}
        <div className="grid gap-3 xl:grid-cols-[1fr_344px]">

          {/* ── Chart area ── */}
          <div className="space-y-3">

            {/* Chart card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-[#060b14]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-slate-800/0 via-cyan-500/30 to-slate-800/0" />

              {/* Chart toolbar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/50 bg-slate-950/50 px-4 py-2.5">

                {/* Timeframes */}
                <div className="flex gap-0.5 rounded-xl border border-slate-800/60 bg-slate-900/60 p-0.5">
                  {TIMEFRAMES.map(t => (
                    <button key={t} onClick={() => setTf(t)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-all duration-150 ${
                        t === tf
                          ? "bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                          : "text-slate-500 hover:text-slate-300"
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-800" />

                {/* Symbol selector */}
                <select value={symbol} onChange={e => setSymbol(e.target.value)}
                  className="rounded-xl border border-slate-700/60 bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white focus:border-cyan-500/60 focus:outline-none">
                  {(quotes.length ? quotes : [{ symbol: "EURUSD" }]).map(q => (
                    <option key={q.symbol}>{q.symbol}</option>
                  ))}
                </select>

                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setShowBook(p => !p)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                      showBook ? "bg-slate-800 text-cyan-400" : "text-slate-600 hover:text-slate-400"
                    }`}>
                    <LayoutGrid size={10} /> Book
                  </button>
                  <div className="flex items-center gap-1 text-[9px] text-slate-700">
                    <Layers size={9} />
                    <span className="hidden sm:inline">B/S · 1-6 timeframe</span>
                  </div>
                </div>
              </div>

              {/* OLOS signal overlay */}
              <OlosSignalBadge symbol={symbol} />

              {/* Chart */}
              <div className="pt-1">
                <TradingChart symbol={symbol} timeframe={tf} height={chartHeight} showVolume showMA />
              </div>
            </div>

            {/* Indicators + OrderBook + Depth */}
            <div className={`grid gap-3 ${showBook ? "xl:grid-cols-[300px_1fr_1fr]" : "xl:grid-cols-1"}`}>
              <IndicatorsPanel data={ind} symbol={symbol} timeframe={tf} />
              {showBook && (
                <>
                  <div className="hidden xl:block">
                    <TierLock required="GOLD"><OrderBook symbol={symbol} /></TierLock>
                  </div>
                  <div className="hidden xl:block">
                    <TierLock required="GOLD"><DepthChart symbol={symbol} /></TierLock>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* RIGHT SIDEBAR — ORDER TICKET                              */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-3">

            {/* ── Order Ticket ── */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-[#060b14]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-slate-800/0 via-slate-600/60 to-slate-800/0" />

              {/* Ticket header */}
              <div className="flex items-center justify-between border-b border-slate-800/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/10">
                    <Zap size={11} className="text-cyan-400" />
                  </div>
                  <p className="text-[12px] font-black text-white">Order Ticket</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setOneClick(p => !p)}
                    title="One-click trading — skip confirmation"
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[9px] font-black transition ${oneClick ? "bg-amber-500/15 text-amber-300 border border-amber-500/25" : "text-slate-600 hover:text-slate-400"}`}>
                    <Zap size={9} /> 1-click
                  </button>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-700">
                    <Shield size={9} /> ESMA · {platform.toUpperCase()}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-4">

                {/* Order type */}
                <div className="grid grid-cols-4 gap-1 rounded-xl border border-slate-800/60 bg-slate-900/50 p-0.5">
                  {(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setOrderType(t)}
                      className={`rounded-lg py-2 text-[9px] font-black transition-all duration-150 ${
                        orderType === t
                          ? "bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                          : "text-slate-600 hover:text-slate-300"
                      }`}>
                      {t === "STOP_LIMIT" ? "ST.LMT" : t}
                    </button>
                  ))}
                </div>

                {/* Limit/Stop price */}
                {orderType !== "MARKET" && (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-slate-500">
                      {orderType === "LIMIT" ? "Limit price" : orderType === "STOP" ? "Stop price" : "Stop / Limit price"}
                    </label>
                    <input type="number" step="any" placeholder={`e.g. ${execPrice.toFixed(priceDigits(symbol))}`}
                      value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
                      className="w-full rounded-xl border border-cyan-500/30 bg-slate-900/80 px-3.5 py-2.5 font-mono text-[13px] text-cyan-300 placeholder-slate-700 focus:border-cyan-400/60 focus:outline-none" />
                  </div>
                )}

                {/* BUY / SELL */}
                <div className="grid grid-cols-2 gap-2">
                  {(["BUY", "SELL"] as const).map(s => (
                    <button key={s} type="button" onClick={() => setSide(s)} aria-pressed={side === s}
                      className={`relative overflow-hidden rounded-xl py-4 text-[15px] font-black tracking-wider transition-all duration-200 ${
                        side === s
                          ? s === "BUY"
                            ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_4px_24px_rgba(52,211,153,0.45)]"
                            : "bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-[0_4px_24px_rgba(248,113,113,0.45)]"
                          : "border border-slate-700/60 bg-slate-900/50 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                      }`}>
                      {side === s && (
                        <div className={`absolute inset-x-0 top-0 h-px ${s === "BUY" ? "bg-emerald-300/50" : "bg-rose-300/50"}`} />
                      )}
                      {s === "BUY"
                        ? <span className="flex items-center justify-center gap-2"><TrendingUp size={16} /> BUY</span>
                        : <span className="flex items-center justify-center gap-2"><TrendingDown size={16} /> SELL</span>}
                    </button>
                  ))}
                </div>

                {/* Live bid/ask/spread */}
                {quote && (
                  <div className="grid grid-cols-3 divide-x divide-slate-800/60 overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/30">
                    {[
                      { label: "BID",    val: number(bid, priceDigits(symbol)), cls: "text-rose-300"    },
                      { label: "SPREAD", val: number(quote.spread, priceDigits(symbol)), cls: "text-slate-400" },
                      { label: "ASK",    val: number(ask, priceDigits(symbol)), cls: "text-emerald-300" },
                    ].map(({ label, val, cls }) => (
                      <div key={label} className="py-3 text-center">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-700">{label}</p>
                        <p className={`mt-0.5 font-mono text-[14px] font-black tabular-nums ${cls}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Volume */}
                <div>
                  <div className="mb-2 flex justify-between text-[10px]">
                    <span className="font-bold text-slate-500">Volume (units)</span>
                    <span className="font-black text-white">{number(qty, 0)}</span>
                  </div>
                  <input type="number" min={1} step={100} value={qty} onChange={e => setQty(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-900/80 px-3.5 py-2.5 font-mono text-[13px] text-white placeholder-slate-700 focus:border-cyan-500/50 focus:outline-none" />
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[1000, 5000, 10000, 50000].map(v => (
                      <button key={v} type="button" onClick={() => setQty(v)}
                        className={`rounded-lg border py-1.5 text-[9px] font-black transition ${
                          qty === v
                            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                            : "border-slate-800/60 bg-slate-900/40 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                        }`}>
                        {v >= 1000 ? `${v / 1000}K` : v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leverage */}
                <div>
                  <div className="mb-2 flex justify-between text-[10px]">
                    <span className="font-bold text-slate-500">Leverage</span>
                    <span className={`font-black ${lev > 20 ? "text-amber-300" : "text-cyan-300"}`}>{lev}×</span>
                  </div>
                  <input type="range" min={1} max={30} step={1} value={lev} onChange={e => setLev(Number(e.target.value))}
                    className="w-full accent-cyan-400" />
                  <div className="mt-1 flex justify-between text-[8px] text-slate-700">
                    <span>1× safe</span><span>30× ESMA max</span>
                  </div>
                </div>

                {/* SL/TP — GOLD+ */}
                <TierLock required="GOLD">
                  <div>
                    <button type="button" onClick={() => setShowAdv(p => !p)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-2.5 text-[11px] transition hover:border-slate-700/60 hover:bg-slate-900/50">
                      <span className="flex items-center gap-2 text-slate-400">
                        <Target size={12} className="text-cyan-400" /> Stop Loss / Take Profit
                      </span>
                      <ChevronDown size={11} className={`text-slate-600 transition-transform duration-200 ${showAdv ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {showAdv && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-2 grid grid-cols-2 gap-2 overflow-hidden">
                          {[
                            { label: "Stop Loss",   val: sl, set: setSl, cls: "focus:border-rose-500/50",    col: "text-rose-400"    },
                            { label: "Take Profit", val: tp, set: setTp, cls: "focus:border-emerald-500/50", col: "text-emerald-400" },
                          ].map(({ label, val, set, cls, col }) => (
                            <label key={label} className="block">
                              <span className={`block mb-1 text-[9px] font-bold ${col}`}>{label}</span>
                              <input type="number" step="any" placeholder="Price" value={val} onChange={e => set(e.target.value)}
                                className={`w-full rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2 font-mono text-[12px] text-white placeholder-slate-700 focus:outline-none ${cls}`} />
                            </label>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </TierLock>

                {/* Order preview */}
                <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 space-y-2">
                  {[
                    { label: "Margin required", val: money(margin),    bold: true,  cls: "text-white"    },
                    { label: "Notional value",   val: money(notional),  bold: false, cls: "text-slate-400" },
                    { label: "Pip value",        val: `$${pipValueUsd.toFixed(2)}/pip`, bold: false, cls: "text-cyan-300" },
                    ...(rrRatio ? [{ label: `R:R (SL ${slPips}p / TP ${tpPips}p)`, val: `1 : ${rrRatio}`, bold: true, cls: Number(rrRatio) >= 1.5 ? "text-emerald-300" : "text-amber-300" }] : []),
                    { label: "Platform", val: platform === "mt5" ? "MT5 + OLOS" : "iTrader + OLOS", bold: false, cls: "text-cyan-400" },
                  ].map(({ label, val, bold, cls }) => (
                    <div key={label} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">{label}</span>
                      <span className={`${bold ? "font-black" : "font-semibold"} ${cls}`}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Submit */}
                <button type="submit" disabled={mut.isPending || tradingBlocked}
                  className={`relative w-full overflow-hidden rounded-xl py-4.5 text-[15px] font-black tracking-wider transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                    side === "BUY"
                      ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_4px_28px_rgba(52,211,153,0.4)] hover:shadow-[0_4px_36px_rgba(52,211,153,0.55)] hover:from-emerald-300"
                      : "bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-[0_4px_28px_rgba(248,113,113,0.4)] hover:shadow-[0_4px_36px_rgba(248,113,113,0.55)] hover:from-rose-300"
                  }`}>
                  <div className={`absolute inset-x-0 top-0 h-px ${side === "BUY" ? "bg-emerald-200/40" : "bg-rose-200/40"}`} />
                  {mut.isPending
                    ? <span className="flex items-center justify-center gap-2"><Zap size={15} className="animate-pulse" /> Routing order…</span>
                    : tradingBlocked
                    ? <span className="flex items-center justify-center gap-2"><ShieldAlert size={15} /> Trading halted</span>
                    : <span className="flex items-center justify-center gap-2">
                        {side === "BUY" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {side} {number(qty, 0)} {symbol}
                      </span>}
                </button>

                <p className="text-center text-[9px] text-slate-700">
                  ESMA leverage · negative balance protection · full audit trail
                </p>
              </form>
            </div>

            {/* Autopilot — PLATINUM+ */}
            <TierLock required="PLATINUM">
              <AutopilotPanel ap={ap} />
            </TierLock>

            {/* Last fill notification */}
            <AnimatePresence>
              {lastOrder && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  className={`relative overflow-hidden rounded-2xl border p-4 ${
                    lastOrder.status === "FILLED"
                      ? "border-emerald-500/25 bg-emerald-500/[0.05]"
                      : "border-rose-500/25 bg-rose-500/[0.05]"
                  }`}>
                  <div className={`absolute inset-y-0 left-0 w-0.5 ${lastOrder.status === "FILLED" ? "bg-emerald-400" : "bg-rose-400"}`} />
                  <div className="flex items-center gap-2.5">
                    {lastOrder.status === "FILLED"
                      ? <CheckCircle2 size={14} className="text-emerald-400" />
                      : <XCircle size={14} className="text-rose-400" />}
                    <span className="text-[12px] font-black text-white">
                      {lastOrder.status} · {lastOrder.symbol} {lastOrder.side}
                    </span>
                  </div>
                  {lastOrder.averageFillPrice && (
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      @ {number(lastOrder.averageFillPrice, priceDigits(lastOrder.symbol))} · margin {money(lastOrder.marginRequired)}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* POSITIONS / HISTORY TABLE                                     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-[#060b14]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-slate-800/0 via-slate-600/50 to-slate-800/0" />

          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-slate-800/50 px-4 pt-2">
            {(["positions", "history"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 border-b-2 px-4 pb-3 text-[11px] font-black capitalize transition ${
                  activeTab === tab ? "border-cyan-400 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}>
                {tab === "positions"
                  ? <><Activity size={11} /> Open positions ({positions.length})</>
                  : <><BookOpen size={11} /> Order history</>}
              </button>
            ))}

            {positions.length > 0 && (
              <div className={`ml-auto flex items-center gap-1.5 pr-4 text-[13px] font-black ${totalPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {totalPnL >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {totalPnL >= 0 ? "+" : ""}{money2(totalPnL)}
              </div>
            )}
            {lastOrder && (
              <div className="flex items-center gap-1 pr-4 text-[10px] text-slate-600">
                <Clock size={9} /> {lastOrder.symbol} {lastOrder.status}
              </div>
            )}
          </div>

          <div className="p-4">
            {activeTab === "positions" ? (
              <>
                {/* Mobile cards */}
                <div className="space-y-3 xl:hidden">
                  {positions.length === 0 ? (
                    <p className="py-12 text-center text-slate-600">No open positions. Place an order using the ticket above.</p>
                  ) : positions.map(pos => (
                    <PositionCard key={pos.id} pos={pos as Position} onClose={() => closeMut.mutate(pos.id)} closing={closeMut.isPending} />
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden xl:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800/40">
                        {["Symbol", "Side", "Qty", "Entry", "Mark", "P&L", "Margin", "Lev", ""].map(h => (
                          <th key={h} className="pb-3 pr-4 text-left text-[9px] font-black uppercase tracking-[0.22em] text-slate-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.length === 0 ? (
                        <tr><td colSpan={9} className="py-12 text-center text-slate-600">No open positions. Place an order using the ticket above.</td></tr>
                      ) : positions.map(pos => {
                        const posPnl = Number(pos.pnl) || 0;
                        const up = posPnl >= 0;
                        return (
                          <tr key={pos.id} className="group border-t border-slate-800/25 transition hover:bg-white/[0.02]">
                            <td className="py-3.5 pr-4 font-mono text-[14px] font-black text-white">{pos.symbol}</td>
                            <td className="pr-4">
                              <span className={`rounded-md px-2.5 py-1 text-[10px] font-black ${pos.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                                {pos.side}
                              </span>
                            </td>
                            <td className="pr-4 font-mono text-[12px] text-slate-300">{number(Number(pos.quantity) || 0, 2)}</td>
                            <td className="pr-4 font-mono text-[12px] text-slate-300">{number(Number(pos.entryPrice) || 0, priceDigits(pos.symbol))}</td>
                            <td className="pr-4 font-mono text-[12px] text-slate-400">{number(Number(pos.markPrice ?? pos.entryPrice) || 0, priceDigits(pos.symbol))}</td>
                            <td className={`pr-4 font-mono text-[13px] font-black ${up ? "text-emerald-300" : "text-rose-300"}`}>
                              {up ? "+" : ""}{money2(posPnl)}
                            </td>
                            <td className="pr-4 font-mono text-[12px] text-slate-500">{money(Number(pos.marginUsed) || 0)}</td>
                            <td className="pr-4 text-[12px] text-slate-600">{(pos as any).leverage ?? lev}×</td>
                            <td>
                              <button onClick={() => closeMut.mutate(pos.id)} disabled={closeMut.isPending}
                                className="rounded-lg border border-rose-500/20 bg-rose-500/[0.07] px-3 py-1.5 text-[10px] font-black text-rose-400 opacity-0 transition hover:bg-rose-500/15 group-hover:opacity-100 disabled:cursor-wait">
                                {closeMut.isPending ? "…" : "Close"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : histQ.isLoading ? (
              <div className="py-10 text-center text-[13px] text-slate-600">Loading order history…</div>
            ) : !histQ.data?.length ? (
              <div className="py-10 text-center text-[13px] text-slate-600">No orders yet. Place your first trade above.</div>
            ) : (
              <>
                {/* Mobile history cards */}
                <div className="space-y-2 xl:hidden">
                  {histQ.data.map(order => <OrderHistCard key={order.id} order={order} />)}
                </div>
                {/* Desktop history table */}
                <div className="hidden xl:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800/40">
                        {["Time", "Symbol", "Side", "Type", "Qty", "Fill price", "Margin", "Status"].map(h => (
                          <th key={h} className="pb-3 pr-4 text-left text-[9px] font-black uppercase tracking-[0.22em] text-slate-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {histQ.data.map(order => (
                        <tr key={order.id} className="border-t border-slate-800/25 transition hover:bg-white/[0.015]">
                          <td className="py-2.5 pr-4 font-mono text-[10px] text-slate-600">{new Date(order.createdAt).toLocaleTimeString()}</td>
                          <td className="pr-4 font-mono text-[13px] font-black text-white">{order.symbol}</td>
                          <td className="pr-4">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${order.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                              {order.side}
                            </span>
                          </td>
                          <td className="pr-4 text-[11px] text-slate-500">{order.type}</td>
                          <td className="pr-4 font-mono text-[12px] text-slate-300">{number(order.quantity, 2)}</td>
                          <td className="pr-4 font-mono text-[12px] text-slate-300">{order.averageFillPrice ? number(order.averageFillPrice, priceDigits(order.symbol)) : "—"}</td>
                          <td className="pr-4 font-mono text-[12px] text-slate-500">{money(order.marginRequired)}</td>
                          <td>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${order.status === "FILLED" ? "text-emerald-400" : order.status === "REJECTED" ? "text-rose-400" : "text-amber-400"}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* MT5 info banner */}
        {platform === "mt5" && (
          <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-400/[0.05] to-violet-400/[0.01] p-5">
            <div className="absolute inset-y-0 left-0 w-0.5 bg-violet-400" />
            <div className="flex items-start gap-3">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-violet-400" />
              <div>
                <p className="text-[12px] font-black text-violet-300">MT5 + OLOS Autopilot — Supervised execution mode</p>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  All orders route through the OLOS risk engine with pre-trade margin checks, ESMA leverage enforcement,
                  negative balance protection, and cryptographic audit trail. Autopilot requires PLATINUM tier with
                  minimum {ap ? `${Math.round(ap.minConfidence * 100)}%` : "78%"} confidence gate.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <OrderConfirmDialog
        order={draft} currentBid={bid} currentAsk={ask}
        open={showConfirm} submitting={mut.isPending}
        onConfirm={() => mut.mutate()} onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
