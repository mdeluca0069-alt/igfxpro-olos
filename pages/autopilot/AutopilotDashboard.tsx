/**
 * IGFXPRO — Autopilot Center
 * Real autopilot configuration, status, strategy selection, and performance history.
 * Connected to /api/v1/autopilot/config backend endpoint.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Bot, CheckCircle2,
  Clock, Lock, Radio, RefreshCw, Shield,
  Sparkles, TrendingUp, Target,
} from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { useSignalStore }  from "../../store/signal.store";
import { useToast }        from "../../components/ui/Toast";
import { useTier }         from "../../app/TierProvider";
import { money, dateShort } from "../../shared/utils/format";

import { usePageTitle }    from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type AutopilotConfig = {
  enabled:        boolean;
  mode:           "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  minConfidence:  number;
  maxRiskPerTrade: number;
  maxOpenTrades:  number;
  tier:           string;
  allowedSymbols: string[];
  eventLockMinutes:    number;
  maxDailyTrades:      number;
  breakEvenTriggerR:   number;
  trailingStopEnabled: boolean;
  trailingActivationR: number;
  atrTrailMultiple:    number;
  regimeExitEnabled:   boolean;
  maxHoursOpen:        number;
  maxDailyLossPct:      number;
  maxSpreadBps:         number;
  consentAcceptedAt?:   string;
  dailyLossLockedUntil?: string;
  lastDecision?: { symbol: string; action: string; reason: string; timestamp: string };
};

type ConsentStatus = { ok: boolean; version: string; text: string; accepted: boolean };

type ManagedPosition = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number;
  pnlPercent: number;
  rMultiple: number | null;
  breakEvenApplied: boolean;
  trailingActive: boolean;
  openedAt: string;
};

type AutopilotTradeSummary = {
  id:       string;
  symbol:   string;
  side:     string;
  pnl:      number;
  status:   string;
  openedAt: string;
  closedAt: string | null;
};

type AutopilotPerformance = {
  status:       "NO_DATA" | "REAL";
  openCount:    number;
  closedCount:  number;
  winCount:     number;
  winRate:      number;
  totalPnl:     number;
  totalPnlOpen: number;
  avgHoldHours: number | null;
  recentTrades: AutopilotTradeSummary[];
};

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODES: { key: AutopilotConfig["mode"]; label: string; desc: string; color: string; bg: string }[] = [
  {
    key: "CONSERVATIVE",
    label: "Conservative",
    desc: "High confidence gate (≥80%) · max 2% risk/trade · ESMA leverage caps",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/25",
  },
  {
    key: "BALANCED",
    label: "Balanced",
    desc: "Standard gate (≥70%) · max 5% risk/trade · smart position sizing",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10 border-cyan-500/25",
  },
  {
    key: "AGGRESSIVE",
    label: "Aggressive",
    desc: "Lower gate (≥60%) · max 8% risk/trade · wider symbols",
    color: "text-amber-300",
    bg: "bg-amber-500/10 border-amber-500/25",
  },
];

const ALL_SYMBOLS = ["EURUSD","GBPUSD","USDJPY","XAUUSD","US500","BTCUSD","GBPJPY","ETHUSD","US100","NVDA","AAPL"];

const TIER_RANK: Record<string, number> = { STANDARD: 0, GOLD: 1, VIP: 2, PLATINUM: 3, ENTERPRISE: 4 };

// ─── Toggle ───────────────────────────────────────────────────────────────────

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch" aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-14 rounded-full transition-colors ${on ? "bg-cyan-400" : "bg-slate-700"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-7" : "translate-x-0.5"}`} />
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AutopilotDashboard() {
  usePageTitle("Autopilot");
  const qc    = useQueryClient();
  const toast = useToast();
  const { tier } = useTier();
  const hasAutopilot = (TIER_RANK[tier] ?? 0) >= TIER_RANK["VIP"];

  const topSignal = useSignalStore((s) => s.getTopSignal());

  const { data: config } = useQuery<AutopilotConfig>({
    queryKey: ["autopilot"],
    queryFn:  () => apiGet("/api/v1/autopilot/config"),
    staleTime: 30_000,
  });

  const { data: managedPositions = [] } = useQuery<ManagedPosition[]>({
    queryKey: ["autopilot-positions"],
    queryFn:  async () => {
      const res = await apiGet<{ ok: boolean; positions: ManagedPosition[] }>("/api/v1/autopilot/positions");
      return res.positions ?? [];
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const { data: performance, isLoading: perfLoading } = useQuery<AutopilotPerformance>({
    queryKey: ["autopilot-performance"],
    queryFn:  () => apiGet("/api/v1/autopilot/performance"),
    staleTime: 30_000,
  });

  const { data: consentStatus } = useQuery<ConsentStatus>({
    queryKey: ["autopilot-consent"],
    queryFn:  () => apiGet("/api/v1/autopilot/consent"),
    staleTime: 30_000,
  });

  const { data: riskSupervisor } = useQuery<{ ok: boolean; mode: string; reason: string }>({
    queryKey: ["autopilot-risk-supervisor"],
    queryFn:  () => apiGet("/api/v1/autopilot/risk-supervisor"),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentChecked,   setConsentChecked]   = useState(false);

  const [localMode,    setLocalMode]    = useState<AutopilotConfig["mode"]>("BALANCED");
  const [localConf,    setLocalConf]    = useState(70);
  const [localRisk,    setLocalRisk]    = useState(5);
  const [localMax,     setLocalMax]     = useState(3);
  const [localSymbols, setLocalSymbols] = useState<string[]>(["EURUSD","XAUUSD","US500","BTCUSD"]);

  // Trade management
  const [localEventLock,     setLocalEventLock]     = useState(30);
  const [localMaxDaily,      setLocalMaxDaily]      = useState(10);
  const [localBreakEvenR,    setLocalBreakEvenR]    = useState(1.0);
  const [localTrailingOn,    setLocalTrailingOn]    = useState(true);
  const [localTrailingR,     setLocalTrailingR]     = useState(1.5);
  const [localAtrMultiple,   setLocalAtrMultiple]   = useState(2.0);
  const [localRegimeExitOn,  setLocalRegimeExitOn]  = useState(true);
  const [localMaxHours,      setLocalMaxHours]      = useState(48);
  const [localMaxDailyLoss,  setLocalMaxDailyLoss]  = useState(5);
  const [localMaxSpread,     setLocalMaxSpread]     = useState(15);

  // Sync from fetched config.
  // minConfidence/maxRiskPerTrade are stored as fractions (0.4–0.99 / 0.005–0.15)
  // on the backend, but the sliders work in percent — convert at this boundary.
  const effectiveMode    = config?.mode           ?? localMode;
  const effectiveConf    = config?.minConfidence  !== undefined ? config.minConfidence * 100  : localConf;
  const effectiveRisk    = config?.maxRiskPerTrade !== undefined ? config.maxRiskPerTrade * 100 : localRisk;
  const effectiveMax     = config?.maxOpenTrades  ?? localMax;
  const effectiveSymbols = config?.allowedSymbols ?? localSymbols;
  const effectiveEventLock   = config?.eventLockMinutes    ?? localEventLock;
  const effectiveMaxDaily    = config?.maxDailyTrades      ?? localMaxDaily;
  const effectiveBreakEvenR  = config?.breakEvenTriggerR   ?? localBreakEvenR;
  const effectiveTrailingOn  = config?.trailingStopEnabled ?? localTrailingOn;
  const effectiveTrailingR   = config?.trailingActivationR ?? localTrailingR;
  const effectiveAtrMultiple = config?.atrTrailMultiple    ?? localAtrMultiple;
  const effectiveRegimeExitOn = config?.regimeExitEnabled  ?? localRegimeExitOn;
  const effectiveMaxHours    = config?.maxHoursOpen        ?? localMaxHours;
  const effectiveMaxDailyLoss = config?.maxDailyLossPct    ?? localMaxDailyLoss;
  const effectiveMaxSpread   = config?.maxSpreadBps        ?? localMaxSpread;
  const dailyLossLocked = !!config?.dailyLossLockedUntil && new Date(config.dailyLossLockedUntil) > new Date();

  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) =>
      apiPost<{ ok: boolean; reason?: string; detail?: string }>("/api/v1/autopilot/config", { enabled }),
    onSuccess: (res, enabled) => {
      if (!res.ok) {
        if (res.reason === "CONSENT_REQUIRED") {
          setShowConsentModal(true);
          return;
        }
        toast.error(
          "Autopilot not available",
          res.reason === "NOT_ELIGIBLE" ? (res.detail ?? "Account not eligible") : (res.reason ?? "Unknown error"),
        );
        return;
      }
      toast[enabled ? "success" : "info"](
        enabled ? "Autopilot activated" : "Autopilot paused",
        enabled
          ? `Running in ${effectiveMode} mode · min ${effectiveConf}% confidence`
          : "All pending automated trades cancelled",
      );
      void qc.invalidateQueries({ queryKey: ["autopilot"] });
    },
    onError: (e) => toast.error("Failed to toggle autopilot", (e as Error).message),
  });

  const consentMut = useMutation({
    mutationFn: () => apiPost("/api/v1/autopilot/consent", {}),
    onSuccess: () => {
      setShowConsentModal(false);
      setConsentChecked(false);
      void qc.invalidateQueries({ queryKey: ["autopilot-consent"] });
      toggleMut.mutate(true);
    },
    onError: (e) => toast.error("Failed to record consent", (e as Error).message),
  });

  const handleToggle = (next: boolean) => {
    if (next && !consentStatus?.accepted) {
      setShowConsentModal(true);
      return;
    }
    toggleMut.mutate(next);
  };

  const saveMut = useMutation({
    mutationFn: (cfg: Partial<AutopilotConfig>) =>
      apiPost("/api/v1/autopilot/config", cfg),
    onSuccess: () => {
      toast.success("Autopilot settings saved");
      void qc.invalidateQueries({ queryKey: ["autopilot"] });
    },
    onError: (e) => toast.error("Save failed", (e as Error).message),
  });

  const enabled = config?.enabled ?? false;

  if (!hasAutopilot) {
    return (
      <div className="min-h-screen bg-[#05070d] text-slate-200">
        <main className="mx-auto max-w-[900px] space-y-5 p-4 md:p-6">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/5 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
              <Lock size={24} className="text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-amber-300">VIP+ Required</h2>
            <p className="mt-2 max-w-xs text-[12px] text-slate-500">
              Autopilot is available on VIP, PLATINUM, and ENTERPRISE accounts.
              Upgrade to unlock AI-supervised automated trading.
            </p>
            <Link to="/dashboard"
              className="mt-5 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-400/20">
              <Sparkles size={14} /> Upgrade account
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1200px] space-y-5 p-4 md:p-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">IGFXPRO · AI AUTOMATION</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-white">Autopilot Center</h1>
            <p className="mt-1 text-[12px] text-slate-500">
              OLOS-supervised automated trading · confidence-gated · ESMA compliant
            </p>
          </div>
          <button onClick={() => void qc.invalidateQueries({ queryKey: ["autopilot"] })}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] text-slate-400 hover:border-slate-600 hover:text-white transition">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        {/* Status hero */}
        <div className={`rounded-2xl border p-5 ${enabled ? "border-cyan-500/25 bg-cyan-500/5" : "border-slate-800 bg-[#07111e]"}`}>
          <div className="flex flex-wrap items-center gap-5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${enabled ? "bg-cyan-500/15" : "bg-slate-800"}`}>
              <Bot size={24} className={enabled ? "text-cyan-400" : "text-slate-500"} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-lg font-extrabold text-white">OLOS Autopilot</p>
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                  enabled ? "bg-cyan-500/15 text-cyan-300" : "bg-slate-800 text-slate-500"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "animate-pulse bg-cyan-400" : "bg-slate-600"}`} />
                  {enabled ? "ACTIVE" : "PAUSED"}
                </div>
              </div>
              <p className="mt-1 text-[12px] text-slate-500">
                {enabled
                  ? `Running in ${effectiveMode} mode · min confidence ${effectiveConf}%`
                  : "Activate to enable AI-supervised automated order execution"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ToggleSwitch
                on={enabled}
                onChange={handleToggle}
              />
              <span className="text-[12px] text-slate-500">{enabled ? "Active" : "Paused"}</span>
            </div>
          </div>

          {dailyLossLocked && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <AlertTriangle size={13} className="shrink-0 text-amber-400" />
              <p className="text-[11px] text-amber-300">
                Daily loss limit reached — new automated entries are paused for today and will
                resume automatically tomorrow. Open positions continue to be managed normally.
              </p>
            </div>
          )}

          {riskSupervisor && riskSupervisor.mode !== "NORMAL" && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl border p-3 ${
              riskSupervisor.mode === "SAFE_MODE"
                ? "border-amber-500/25 bg-amber-500/10"
                : "border-rose-500/25 bg-rose-500/10"
            }`}>
              <AlertTriangle size={13} className={`shrink-0 ${riskSupervisor.mode === "SAFE_MODE" ? "text-amber-400" : "text-rose-400"}`} />
              <p className={`text-[11px] ${riskSupervisor.mode === "SAFE_MODE" ? "text-amber-300" : "text-rose-300"}`}>
                Platform risk supervisor: <span className="font-bold">{riskSupervisor.mode.replace(/_/g, " ")}</span>
                {" — "}{riskSupervisor.reason}
                {riskSupervisor.mode === "SAFE_MODE"
                  ? " New entries require a higher confidence bar."
                  : " New automated entries are paused platform-wide; open positions continue to be managed normally."}
              </p>
            </div>
          )}

          {/* Last decision */}
          {config?.lastDecision && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <Clock size={10} /> Last decision
                {config.lastDecision.timestamp && (
                  <span>· {new Date(config.lastDecision.timestamp).toLocaleTimeString()}</span>
                )}
              </div>
              <p className="mt-1.5 text-[12px] text-slate-300">
                <span className="font-bold text-white">{config.lastDecision.symbol}</span>
                {" · "}
                <span className="text-cyan-300">{config.lastDecision.action}</span>
                {" · "}
                {config.lastDecision.reason}
              </p>
            </div>
          )}
        </div>

        {/* OLOS top signal */}
        {topSignal && (
          <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
            topSignal.signalType === "BUY" ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
          }`}>
            <div className="flex items-center gap-3">
              <Radio size={14} className="animate-pulse text-cyan-400" />
              <div>
                <p className="text-[11px] font-bold text-white">
                  Active signal: {topSignal.symbol} — {topSignal.signalType}
                </p>
                <p className="text-[10px] text-slate-500 line-clamp-1">{topSignal.entryRationale}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-cyan-300">{topSignal.confidence.toFixed(0)}%</p>
              <p className="text-[9px] text-slate-600">confidence</p>
            </div>
          </div>
        )}

        {/* Managed positions — live trade management state, not just entries */}
        {managedPositions.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
            <div className="mb-3 flex items-center gap-2">
              <Target size={14} className="text-cyan-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Managed positions ({managedPositions.length})
              </p>
            </div>
            <div className="space-y-2">
              {managedPositions.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800/60 bg-slate-900/30 px-3 py-2.5">
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${p.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                      {p.side}
                    </span>
                    <span className="text-[12px] font-bold text-white">{p.symbol}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Entry <span className="font-mono text-slate-300">{p.entryPrice}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    SL <span className="font-mono text-slate-300">{p.stopLoss ?? "—"}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    R-multiple <span className={`font-mono font-bold ${(p.rMultiple ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {p.rMultiple !== null ? `${p.rMultiple.toFixed(2)}R` : "—"}
                    </span>
                  </div>
                  <div className={`font-mono text-[12px] font-bold ${p.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {p.pnl >= 0 ? "+" : ""}{p.pnl.toFixed(2)} ({p.pnlPercent.toFixed(1)}%)
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {p.breakEvenApplied && (
                      <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] font-bold text-cyan-300">BREAK-EVEN</span>
                    )}
                    {p.trailingActive && (
                      <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold text-violet-300">TRAILING</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Config grid */}
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">

          {/* Left: configuration */}
          <div className="space-y-4">

            {/* Mode selection */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Trading mode</p>
              <div className="space-y-2">
                {MODES.map((m) => (
                  <label key={m.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    effectiveMode === m.key ? m.bg : "border-slate-800 bg-slate-900/30 hover:border-slate-700"
                  }`}>
                    <input type="radio" name="mode" value={m.key}
                      checked={effectiveMode === m.key}
                      onChange={() => setLocalMode(m.key)}
                      className="mt-0.5 accent-cyan-400" />
                    <div>
                      <p className={`text-sm font-bold ${effectiveMode === m.key ? m.color : "text-white"}`}>{m.label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Risk parameters */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Risk parameters</p>
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-slate-300">Min OLOS confidence</label>
                    <span className="font-mono text-[12px] font-bold text-cyan-300">{effectiveConf}%</span>
                  </div>
                  <input type="range" min={50} max={95} step={5}
                    value={effectiveConf}
                    onChange={(e) => setLocalConf(Number(e.target.value))}
                    className="w-full accent-cyan-400" />
                  <div className="mt-1 flex justify-between text-[9px] text-slate-700">
                    <span>50% (aggressive)</span>
                    <span>95% (ultra-safe)</span>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-slate-300">Max risk per trade</label>
                    <span className="font-mono text-[12px] font-bold text-amber-300">{effectiveRisk}%</span>
                  </div>
                  <input type="range" min={1} max={10} step={0.5}
                    value={effectiveRisk}
                    onChange={(e) => setLocalRisk(Number(e.target.value))}
                    className="w-full accent-amber-400" />
                  <div className="mt-1 flex justify-between text-[9px] text-slate-700">
                    <span>1% (ultra-safe)</span>
                    <span>10% (aggressive)</span>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-slate-300">Max concurrent trades</label>
                    <span className="font-mono text-[12px] font-bold text-violet-300">{effectiveMax}</span>
                  </div>
                  <input type="range" min={1} max={10} step={1}
                    value={effectiveMax}
                    onChange={(e) => setLocalMax(Number(e.target.value))}
                    className="w-full accent-violet-400" />
                </div>
              </div>
            </div>

            {/* Trade management — continuous management of open positions, not just entry gates */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-cyan-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trade management</p>
              </div>
              <div className="space-y-5">
                {/* Break-even */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-slate-300">Break-even trigger</label>
                    <span className="font-mono text-[12px] font-bold text-emerald-300">{effectiveBreakEvenR.toFixed(1)}R</span>
                  </div>
                  <input type="range" min={0.5} max={3} step={0.1}
                    value={effectiveBreakEvenR}
                    onChange={(e) => setLocalBreakEvenR(Number(e.target.value))}
                    className="w-full accent-emerald-400" />
                  <p className="mt-1 text-[10px] text-slate-600">Move stop to entry once a trade reaches this many multiples of its initial risk</p>
                </div>

                {/* Trailing stop */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[12px] font-semibold text-slate-300">ATR trailing stop</label>
                    <p className="text-[10px] text-slate-600">Follow price with an ATR-based stop once in profit</p>
                  </div>
                  <ToggleSwitch on={effectiveTrailingOn} onChange={setLocalTrailingOn} />
                </div>
                {effectiveTrailingOn && (
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800/60 bg-slate-900/30 p-3">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-[11px] text-slate-400">Activates at</label>
                        <span className="font-mono text-[11px] font-bold text-cyan-300">{effectiveTrailingR.toFixed(1)}R</span>
                      </div>
                      <input type="range" min={0.5} max={5} step={0.1}
                        value={effectiveTrailingR}
                        onChange={(e) => setLocalTrailingR(Number(e.target.value))}
                        className="w-full accent-cyan-400" />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-[11px] text-slate-400">ATR multiple</label>
                        <span className="font-mono text-[11px] font-bold text-cyan-300">{effectiveAtrMultiple.toFixed(1)}×</span>
                      </div>
                      <input type="range" min={1} max={5} step={0.1}
                        value={effectiveAtrMultiple}
                        onChange={(e) => setLocalAtrMultiple(Number(e.target.value))}
                        className="w-full accent-cyan-400" />
                    </div>
                  </div>
                )}

                {/* Regime exit */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[12px] font-semibold text-slate-300">Exit on regime flip</label>
                    <p className="text-[10px] text-slate-600">Close early if the trend reverses against an unprofitable trade — never cuts a winner</p>
                  </div>
                  <ToggleSwitch on={effectiveRegimeExitOn} onChange={setLocalRegimeExitOn} />
                </div>

                {/* Time stop */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-slate-300">Time-stop</label>
                    <span className="font-mono text-[12px] font-bold text-amber-300">{effectiveMaxHours}h</span>
                  </div>
                  <input type="range" min={4} max={168} step={4}
                    value={effectiveMaxHours}
                    onChange={(e) => setLocalMaxHours(Number(e.target.value))}
                    className="w-full accent-amber-400" />
                  <p className="mt-1 text-[10px] text-slate-600">Close a trade with no progress after this many hours</p>
                </div>

                {/* Event lock + daily cap */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[11px] text-slate-400">Event lock</label>
                      <span className="font-mono text-[11px] font-bold text-rose-300">{effectiveEventLock}m</span>
                    </div>
                    <input type="range" min={0} max={120} step={5}
                      value={effectiveEventLock}
                      onChange={(e) => setLocalEventLock(Number(e.target.value))}
                      className="w-full accent-rose-400" />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[11px] text-slate-400">Max trades/day</label>
                      <span className="font-mono text-[11px] font-bold text-violet-300">{effectiveMaxDaily}</span>
                    </div>
                    <input type="range" min={1} max={30} step={1}
                      value={effectiveMaxDaily}
                      onChange={(e) => setLocalMaxDaily(Number(e.target.value))}
                      className="w-full accent-violet-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Safety limits */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Shield size={14} className="text-amber-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Safety limits</p>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-slate-300">Max daily loss</label>
                    <span className="font-mono text-[12px] font-bold text-rose-300">{effectiveMaxDailyLoss}%</span>
                  </div>
                  <input type="range" min={1} max={50} step={1}
                    value={effectiveMaxDailyLoss}
                    onChange={(e) => setLocalMaxDailyLoss(Number(e.target.value))}
                    className="w-full accent-rose-400" />
                  <p className="mt-1 text-[10px] text-slate-600">
                    New entries stop for the day once today&apos;s realized + floating P&amp;L hits this loss
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-slate-300">Max spread</label>
                    <span className="font-mono text-[12px] font-bold text-cyan-300">{effectiveMaxSpread}bps</span>
                  </div>
                  <input type="range" min={1} max={200} step={1}
                    value={effectiveMaxSpread}
                    onChange={(e) => setLocalMaxSpread(Number(e.target.value))}
                    className="w-full accent-cyan-400" />
                  <p className="mt-1 text-[10px] text-slate-600">Skip entries when the live spread is wider than this — protects against bad fills</p>
                </div>
              </div>
            </div>

            {/* Symbol allowlist */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Allowed symbols</p>
              <div className="flex flex-wrap gap-2">
                {ALL_SYMBOLS.map((sym) => {
                  const isSelected = effectiveSymbols.includes(sym);
                  return (
                    <button key={sym}
                      onClick={() => setLocalSymbols((prev) =>
                        isSelected ? prev.filter((s) => s !== sym) : [...prev, sym]
                      )}
                      className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                        isSelected ? "bg-cyan-400/20 text-cyan-300" : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                      }`}>
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={() => saveMut.mutate({
                mode: localMode,
                minConfidence: localConf / 100,
                maxRiskPerTrade: localRisk / 100,
                maxOpenTrades: localMax,
                allowedSymbols: localSymbols,
                eventLockMinutes: localEventLock,
                maxDailyTrades: localMaxDaily,
                breakEvenTriggerR: localBreakEvenR,
                trailingStopEnabled: localTrailingOn,
                trailingActivationR: localTrailingR,
                atrTrailMultiple: localAtrMultiple,
                regimeExitEnabled: localRegimeExitOn,
                maxHoursOpen: localMaxHours,
                maxDailyLossPct: localMaxDailyLoss,
                maxSpreadBps: localMaxSpread,
              })}
              disabled={saveMut.isPending}
              className="w-full rounded-2xl bg-cyan-400 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
              {saveMut.isPending ? "Saving…" : "Save configuration"}
            </button>
          </div>

          {/* Right: guardrails + info */}
          <div className="space-y-4">

            {/* ESMA guardrails */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Shield size={14} className="text-cyan-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">OLOS guardrails</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Confidence gate enforcement",       active: true },
                  { label: "ESMA leverage caps applied",         active: true },
                  { label: "Pre-trade risk engine check",        active: true },
                  { label: "Negative balance protection",        active: true },
                  { label: "Event lock window suspension",       active: true },
                  { label: "Kill switch override capability",    active: true },
                  { label: "Supervised mode only (no full-auto)", active: true },
                ].map(({ label }) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-xl border border-slate-800/50 bg-slate-900/30 px-3 py-2">
                    <CheckCircle2 size={11} className="shrink-0 text-emerald-400" />
                    <span className="text-[11px] text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Performance</p>
              {perfLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 animate-pulse rounded-xl bg-slate-800" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[
                    { label: "Total autopilot trades", value: performance ? `${performance.openCount + performance.closedCount}` : "—", cls: "text-white" },
                    { label: "Win rate",               value: performance && performance.closedCount > 0 ? `${performance.winRate.toFixed(1)}%` : "—", cls: "text-emerald-300" },
                    { label: "Avg hold time",          value: performance?.avgHoldHours != null ? `${performance.avgHoldHours.toFixed(1)}h` : "—", cls: "text-cyan-300" },
                    { label: "Net P&L (closed)",       value: performance ? `${performance.totalPnl >= 0 ? "+" : ""}${money(performance.totalPnl)}` : "—",
                      cls: performance && performance.totalPnl < 0 ? "text-rose-300" : "text-emerald-300" },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                      <span className="text-[11px] text-slate-500">{label}</span>
                      <span className={`font-mono text-[12px] font-bold ${cls}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent autopilot trades */}
            {performance && performance.recentTrades.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent autopilot trades</p>
                <div className="space-y-2">
                  {performance.recentTrades.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/30 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${t.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                          {t.side}
                        </span>
                        <span className="text-[11px] font-bold text-white">{t.symbol}</span>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono text-[11px] font-bold ${t.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {t.pnl >= 0 ? "+" : ""}{money(t.pnl)}
                        </p>
                        <p className="text-[9px] text-slate-600">{t.status === "OPEN" ? "open" : dateShort(t.closedAt ?? t.openedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={12} className="text-amber-400" />
                <p className="text-[11px] font-bold text-amber-300">Risk disclosure</p>
              </div>
              <p className="text-[11px] leading-5 text-slate-500">
                Automated trading amplifies both profits and losses. Autopilot does not
                guarantee profitability. CFDs involve significant risk of loss.
                Capital at risk: only use funds you can afford to lose.
              </p>
            </div>
          </div>
        </div>
      </main>

      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/25 bg-[#0a1422] p-6">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <p className="text-sm font-extrabold text-amber-300">Risk disclosure — confirmation required</p>
            </div>
            <p className="text-[12px] leading-5 text-slate-400">
              {consentStatus?.text ??
                "Automated trading amplifies both profits and losses. Autopilot does not guarantee profitability. CFDs involve significant risk of loss. Capital at risk: only use funds you can afford to lose."}
            </p>
            <label className="mt-4 flex items-start gap-2.5 text-[12px] text-slate-300">
              <input type="checkbox" checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-cyan-400" />
              I have read and accept the risks of automated trading.
            </label>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setShowConsentModal(false); setConsentChecked(false); }}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-[12px] font-bold text-slate-400 hover:border-slate-600">
                Cancel
              </button>
              <button
                disabled={!consentChecked || consentMut.isPending}
                onClick={() => consentMut.mutate()}
                className="flex-1 rounded-xl bg-cyan-400 py-2.5 text-[12px] font-extrabold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
                {consentMut.isPending ? "Confirming…" : "Accept & activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
