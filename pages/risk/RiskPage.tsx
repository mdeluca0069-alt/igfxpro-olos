/**
 * IGFXPRO — Risk Dashboard
 * Professional real-time risk monitoring: margin level, risk score,
 * live warnings, leverage chart, kill switch, ESMA compliance status.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell,
  LineChart as RLineChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, AlertOctagon, AlertTriangle, BadgeCheck, Bot,
  CheckCircle2, ChevronRight, Clock, Gauge, PowerOff,
  RefreshCw, Scale, Shield, ShieldAlert, ShieldCheck,
  TrendingDown, XCircle,
} from "lucide-react";
import { useRiskStore }    from "../../store/risk.store";
import { useTradingStore } from "../../store/trading.store";
import { useOptionalAuth } from "../../app/AuthGate";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { money, number }   from "../../shared/utils/format";
import { usePageTitle }    from "../../hooks/usePageTitle";
import { useToast }        from "../../components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskSnap = {
  riskScore: number; marginLevelPct: number; stopOutLevelPct: number;
  negativeBalanceProtection: boolean; eventRiskMode: string;
  maxDrawdownPct: number; maxRiskPerTradePct: number;
  alerts: string[]; killSwitchEnabled?: boolean; killSwitchReason?: string;
  leveragePolicy?: Record<string, number>;
};

type RiskWarning = {
  id: string; severity: "INFO" | "WARNING" | "CRITICAL";
  marginLevel: number; riskScore: number;
  message: string; acknowledged: boolean; createdAt: string;
};

// ─── Margin level gauge ───────────────────────────────────────────────────────

function MarginGauge({ level, stopOut }: { level: number; stopOut: number }) {
  const danger  = level > 0 && level < stopOut * 1.5;
  const warning = level < 200;
  const cls = danger
    ? { ring: "ring-rose-500/30",    bar: "bg-rose-500",    text: "text-rose-300",    label: "DANGER"  }
    : warning
    ? { ring: "ring-amber-500/30",   bar: "bg-amber-500",   text: "text-amber-300",   label: "WARNING" }
    : { ring: "ring-emerald-500/30", bar: "bg-emerald-500", text: "text-emerald-300", label: "HEALTHY" };

  const pct = Math.min(100, (level / 400) * 100);

  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#07111e] p-5 ring-1 ${cls.ring}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Margin level</p>
          <div className="mt-1.5 flex items-end gap-2">
            <span className={`text-4xl font-extrabold tabular-nums ${cls.text}`}>
              {number(level, 0)}<span className="text-2xl">%</span>
            </span>
            <span className={`mb-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              danger  ? "bg-rose-500/15 text-rose-300" :
              warning ? "bg-amber-500/15 text-amber-300" :
                        "bg-emerald-500/15 text-emerald-300"
            }`}>{cls.label}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600">
            Stop-out at <span className="font-bold text-white">{stopOut}%</span>
          </p>
        </div>
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="7" />
            <circle cx="40" cy="40" r="32" fill="none" strokeWidth="7"
              stroke={danger ? "#ef4444" : warning ? "#f59e0b" : "#22c55e"}
              strokeDasharray={`${pct * 2.01} 201`}
              strokeLinecap="round"
              className="transition-all duration-700" />
          </svg>
          <Gauge size={20} className={cls.text} />
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${cls.bar} transition-all duration-700`}
             style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] text-slate-700">
        <span>0%</span>
        <span className="text-amber-600">stop-out {stopOut}%</span>
        <span>400%+</span>
      </div>
    </div>
  );
}

// ─── Risk score card ──────────────────────────────────────────────────────────

function RiskScoreCard({ score }: { score: number }) {
  const high = score > 70;
  const mid  = score > 40;
  const cls  = high ? "text-rose-300" : mid ? "text-amber-300" : "text-emerald-300";
  const bg   = high ? "bg-rose-500"   : mid ? "bg-amber-500"   : "bg-emerald-500";
  const label = high ? "HIGH RISK" : mid ? "MODERATE" : "LOW RISK";

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Portfolio risk score</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <span className={`text-4xl font-extrabold tabular-nums ${cls}`}>{score}</span>
          <span className="text-xl text-slate-600">/100</span>
          <span className={`ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            high ? "bg-rose-500/15 text-rose-300" : mid ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
          }`}>{label}</span>
        </div>
        <Activity size={28} className={`${cls} opacity-40`} />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full transition-all duration-700 ${bg}`}
             style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-[10px] text-slate-600">OLOS risk engine · updated in real-time</p>
    </div>
  );
}

// ─── Warning card ─────────────────────────────────────────────────────────────

function WarningCard({ warning, onAck }: {
  warning: RiskWarning;
  onAck: (id: string) => void;
}) {
  const sevMap = {
    CRITICAL: { border: "border-rose-500/30",   bg: "bg-rose-500/6",   Icon: AlertOctagon,  cls: "text-rose-400"  },
    WARNING:  { border: "border-amber-500/30",  bg: "bg-amber-500/6",  Icon: AlertTriangle, cls: "text-amber-400" },
    INFO:     { border: "border-cyan-500/30",   bg: "bg-cyan-500/6",   Icon: Activity,      cls: "text-cyan-400"  },
  };
  const { border, bg, Icon, cls } = sevMap[warning.severity];

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <div className="flex items-start gap-3">
        <Icon size={15} className={`mt-0.5 shrink-0 ${cls}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${cls}`}>{warning.severity}</span>
            {warning.marginLevel > 0 && (
              <span className="text-[10px] text-slate-500">margin {number(warning.marginLevel, 0)}%</span>
            )}
          </div>
          <p className="mt-1 text-[12px] leading-5 text-slate-300">{warning.message}</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-600">
            <Clock size={9} />
            {new Date(warning.createdAt).toLocaleTimeString()}
          </p>
        </div>
        {!warning.acknowledged ? (
          <button onClick={() => onAck(warning.id)}
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-slate-400 transition hover:border-slate-600 hover:text-white">
            Ack
          </button>
        ) : (
          <CheckCircle2 size={14} className="shrink-0 text-emerald-500/50" />
        )}
      </div>
    </div>
  );
}

// ─── Kill switch panel ────────────────────────────────────────────────────────

function KillSwitchPanel({
  active, reason, onToggle, pending, isAdmin,
}: {
  active: boolean; reason?: string;
  onToggle: (enabled: boolean) => void;
  pending: boolean; isAdmin: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const doToggle = () => {
    if (active) {
      onToggle(false);
    } else if (confirmText.trim().toUpperCase() === "HALT") {
      onToggle(true);
      setShowConfirm(false);
      setConfirmText("");
    }
  };

  return (
    <div className={`rounded-2xl border p-5 ${
      active ? "border-rose-500/40 bg-rose-500/8" : "border-slate-800 bg-[#07111e]"
    }`}>
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-rose-500/20" : "bg-slate-800"}`}>
          <PowerOff size={18} className={active ? "text-rose-400" : "text-slate-500"} />
        </div>
        <div>
          <p className="font-bold text-white">Global Kill Switch</p>
          <p className="text-[11px] text-slate-500">Halt all trading immediately</p>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
          active ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/10 text-emerald-300"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${active ? "animate-pulse bg-rose-400" : "bg-emerald-400"}`} />
          {active ? "ACTIVE" : "INACTIVE"}
        </div>
      </div>

      {active && reason && (
        <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[11px]">
          <p className="font-semibold text-rose-300">Reason:</p>
          <p className="mt-0.5 text-rose-200/70">{reason}</p>
        </div>
      )}

      {!isAdmin ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
          <p className="text-[11px] text-slate-500">Admin or Risk role required</p>
        </div>
      ) : !showConfirm ? (
        <button
          onClick={() => active ? doToggle() : setShowConfirm(true)}
          disabled={pending}
          className={`w-full rounded-xl py-3.5 text-sm font-extrabold tracking-wide transition disabled:opacity-50 ${
            active
              ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              : "border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
          }`}>
          {pending ? "Processing…" : active ? "DISABLE — Resume trading" : "ENABLE — Halt ALL trading"}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-rose-300">Type <strong>HALT</strong> to confirm:</p>
          <input
            type="text" value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type HALT"
            className="w-full rounded-xl border border-rose-500/30 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={doToggle}
              disabled={confirmText.trim().toUpperCase() !== "HALT" || pending}
              className="flex-1 rounded-xl bg-rose-500/20 py-2.5 text-sm font-bold text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-40">
              {pending ? "…" : "Confirm HALT"}
            </button>
            <button onClick={() => { setShowConfirm(false); setConfirmText(""); }}
              className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Leverage chart ───────────────────────────────────────────────────────────

function LeverageChart({ policy }: { policy: Record<string, number> | undefined }) {
  const data = Object.entries(policy ?? {
    FX_MAJOR: 30, FX_MINOR: 20, EQUITY: 5, INDEX: 20, COMMODITY: 10, CRYPTO: 2,
  }).map(([name, value]) => ({ name, value }));

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">ESMA leverage caps</p>
          <p className="mt-0.5 text-sm font-bold text-white">Max leverage by asset class</p>
        </div>
        <Scale size={16} className="text-slate-600" />
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" stroke="#334155" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} />
            <YAxis stroke="#334155" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}
              formatter={(v: number) => [`${v}×`, "Max leverage"]}
              labelStyle={{ color: "#64748b" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name}
                  fill={entry.value >= 25 ? "#22d3ee" : entry.value >= 10 ? "#a78bfa" : "#f59e0b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RiskPage() {
  usePageTitle("Risk Dashboard");

  const qc    = useQueryClient();
  const auth  = useOptionalAuth();
  const toast = useToast();

  const storeSnap     = useRiskStore((s) => s.snapshot);
  const storeWarnings = useRiskStore((s) => s.warnings);
  const ackWarning    = useRiskStore((s) => s.acknowledgeWarning);
  const positions     = useTradingStore((s) => s.positions);

  // VaR from DB
  const varQ = useQuery({
    queryKey: ["var-report"],
    queryFn:  () => apiGet<{
      equity: number;
      historicalVar95: { varUsd: number; varPct: number };
      historicalVar99: { varUsd: number; varPct: number };
      parametricVar95: { varUsd: number; varPct: number };
      expectedShortfall95: number;
      stressScenarios: { name: string; description: string; estimatedLoss: number; marginImpact: number; severity: string }[];
      marginForecast: { daysAhead: number; marginLevel: number; riskZone: string }[];
      dataPoints: number;
    }>("/api/v1/risk/var"),
    staleTime: 120_000,
  });

  const isAdmin = Boolean(
    auth?.user?.role && ["admin", "risk", "compliance"].includes(auth.user.role)
  );

  const snapQ = useQuery({
    queryKey: ["risk-page"],
    queryFn:  () => apiGet<RiskSnap>("/api/v1/risk/snapshot"),
    enabled:  !storeSnap,
    staleTime: 8_000,
    refetchInterval: 12_000,
  });

  const snap     = (storeSnap ?? snapQ.data) as RiskSnap | undefined;
  const warnings = storeWarnings;

  const killMut = useMutation({
    mutationFn: (enabled: boolean) =>
      apiPost("/api/v1/admin/trading/kill-switch", {
        enabled,
        reason: enabled ? "Manual halt — Risk Dashboard" : "Manual resume — Risk Dashboard",
      }, "admin"),
    onSuccess: (_, enabled) => {
      toast[enabled ? "error" : "success"](
        enabled ? "Kill switch ENABLED — all trading halted" : "Trading RESUMED"
      );
      void qc.invalidateQueries({ queryKey: ["risk-page"] });
    },
    onError: (e) => toast.error("Kill switch failed", (e as Error).message),
  });

  const marginLevel = snap?.marginLevelPct  ?? 0;
  const riskScore   = snap?.riskScore       ?? 0;
  const stopOut     = snap?.stopOutLevelPct ?? 50;
  const killActive  = snap?.killSwitchEnabled ?? false;
  const nbp         = snap?.negativeBalanceProtection ?? true;
  const totalPnL    = positions.reduce((s, p) => s + (p.pnl ?? 0), 0);
  const unacked     = warnings.filter((w) => !w.acknowledged);

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">IGFXPRO · OLOS Risk Engine</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-white">Risk Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {killActive && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2">
                <ShieldAlert size={13} className="text-rose-400" />
                <span className="text-[11px] font-bold text-rose-300">KILL SWITCH ACTIVE</span>
              </div>
            )}
            <button onClick={() => void qc.invalidateQueries({ queryKey: ["risk-page"] })}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] text-slate-400 transition hover:border-slate-600 hover:text-white">
              <RefreshCw size={11} /> Refresh
            </button>
            <Link to="/trading"
              className="flex items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-400/8 px-3 py-2 text-[12px] font-semibold text-cyan-300 transition hover:bg-cyan-400/14">
              Trading <ChevronRight size={11} />
            </Link>
          </div>
        </div>

        {/* Unacked warnings banner */}
        {unacked.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
            <AlertTriangle size={15} className="shrink-0 text-amber-400" />
            <p className="flex-1 text-sm text-amber-200">
              <span className="font-bold">{unacked.length}</span> unacknowledged alert{unacked.length > 1 ? "s" : ""} require attention.
            </p>
            <button onClick={() => unacked.forEach((w) => ackWarning(w.id))}
              className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/25">
              Acknowledge all
            </button>
          </div>
        )}

        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              Icon: Gauge, label: "Risk score",
              value: snap ? `${riskScore}/100` : "—",
              sub: riskScore > 70 ? "HIGH — reduce exposure" : riskScore > 40 ? "MODERATE" : "LOW — all clear",
              cls: riskScore > 70 ? "text-rose-300" : riskScore > 40 ? "text-amber-300" : "text-emerald-300",
            },
            {
              Icon: Scale, label: "Margin level",
              value: snap ? `${number(marginLevel, 0)}%` : "—",
              sub: `Stop-out at ${stopOut}%`,
              cls: marginLevel > 0 && marginLevel < stopOut * 1.5 ? "text-rose-300" : marginLevel < 200 ? "text-amber-300" : "text-emerald-300",
            },
            {
              Icon: ShieldCheck, label: "NBP",
              value: nbp ? "Active" : "OFF",
              sub: "Negative balance protection",
              cls: nbp ? "text-emerald-300" : "text-rose-300",
            },
            {
              Icon: TrendingDown, label: "Open P&L",
              value: positions.length ? `${totalPnL >= 0 ? "+" : ""}${money(totalPnL)}` : "—",
              sub: `${positions.length} open position${positions.length !== 1 ? "s" : ""}`,
              cls: totalPnL >= 0 ? "text-emerald-300" : "text-rose-300",
            },
          ].map(({ Icon, label, value, sub, cls }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-[#07111e] px-5 py-4">
              <Icon size={22} className={`shrink-0 ${cls}`} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
                <p className={`mt-1 text-2xl font-extrabold tabular-nums ${cls}`}>{value}</p>
                <p className="text-[10px] text-slate-600">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Warnings grid */}
        {warnings.length > 0 && (
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Risk alerts · {warnings.length} total · {unacked.length} unacknowledged
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {warnings.slice(0, 6).map((w) => (
                <WarningCard key={w.id} warning={w as RiskWarning} onAck={ackWarning} />
              ))}
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">

          {/* Left */}
          <div className="space-y-4">
            <MarginGauge level={marginLevel} stopOut={stopOut} />
            <LeverageChart policy={snap?.leveragePolicy} />

            {/* Positions */}
            {positions.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Open positions</p>
                  <Link to="/trading" className="text-[11px] text-cyan-400 hover:text-cyan-300">View terminal →</Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                        {["Symbol", "Side", "Qty", "Entry", "Mark", "P&L", "Margin"].map((h) => (
                          <th key={h} className="pb-3 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos) => (
                        <tr key={pos.id} className="border-t border-slate-800/40 hover:bg-slate-900/20 transition">
                          <td className="py-2.5 pr-4 font-bold text-white">{pos.symbol}</td>
                          <td className="pr-4">
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                              pos.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                            }`}>{pos.side}</span>
                          </td>
                          <td className="pr-4 font-mono text-slate-300">{number(pos.quantity, 0)}</td>
                          <td className="pr-4 font-mono text-slate-400">{number(pos.entryPrice, 5)}</td>
                          <td className="pr-4 font-mono text-slate-400">{number(pos.markPrice ?? pos.entryPrice, 5)}</td>
                          <td className={`pr-4 font-mono font-bold ${pos.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {pos.pnl >= 0 ? "+" : ""}{money(pos.pnl)}
                          </td>
                          <td className="font-mono text-slate-500">{money(pos.marginUsed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-4">
            <RiskScoreCard score={riskScore} />

            <KillSwitchPanel
              active={killActive}
              reason={snap?.killSwitchReason}
              onToggle={(enabled) => killMut.mutate(enabled)}
              pending={killMut.isPending}
              isAdmin={isAdmin}
            />

            {/* Guardrails */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Shield size={14} className="text-cyan-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active guardrails</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Negative balance protection",           active: nbp },
                  { label: `Stop-out at ${stopOut}%`,              active: true },
                  { label: `Max drawdown ${snap?.maxDrawdownPct ?? 18}%`,     active: true },
                  { label: `Max risk/trade ${snap?.maxRiskPerTradePct ?? 2}%`,active: true },
                  { label: `Event mode: ${snap?.eventRiskMode ?? "normal"}`,  active: true },
                  { label: "ESMA retail leverage caps",             active: true },
                  { label: "Pre-trade margin check",                active: true },
                  { label: "Kill switch capability",                active: true },
                ].map(({ label, active }) => (
                  <div key={label}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-800/50 bg-slate-900/30 px-3 py-2.5">
                    {active
                      ? <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />
                      : <XCircle size={12} className="shrink-0 text-rose-400" />}
                    <span className={`text-[11px] ${active ? "text-slate-300" : "text-rose-300"}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OLOS intelligence */}
            <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Bot size={13} className="text-cyan-400" />
                <p className="text-[11px] font-bold text-cyan-300">OLOS Risk Intelligence</p>
              </div>
              <p className="text-[11px] leading-5 text-slate-400">
                All positions are continuously monitored. Margin warnings trigger at 150% · 120% · 100% of stop-out.
                Autopilot suspends during event lock windows and when confidence drops below gate.
              </p>
              <Link to="/olos-ai"
                className="mt-3 flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
                OLOS AI Command <ChevronRight size={10} />
              </Link>
            </div>

            {/* System alerts */}
            {snap?.alerts && snap.alerts.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BadgeCheck size={13} className="text-amber-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">System alerts</p>
                </div>
                <div className="space-y-1.5">
                  {snap.alerts.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-[11px] text-amber-200/70">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-amber-400" />{a}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── VaR & Stress Testing ─────────────────────────────────────────── */}
        {varQ.data && (
          <div className="grid gap-4 xl:grid-cols-2">

            {/* VaR estimates */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Value at Risk</p>
                  <p className="mt-0.5 text-[13px] font-bold text-white">1-Day VaR Estimates</p>
                </div>
                <span className="text-[10px] text-slate-600">
                  {varQ.data.dataPoints > 0 ? `${varQ.data.dataPoints} days history` : "No history"}
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Historical VaR 95%",  v: varQ.data.historicalVar95, method: "Historical" },
                  { label: "Historical VaR 99%",  v: varQ.data.historicalVar99, method: "Historical" },
                  { label: "Parametric VaR 95%",  v: varQ.data.parametricVar95, method: "Parametric (Normal)" },
                  { label: "Expected Shortfall 95%", v: { varUsd: varQ.data.expectedShortfall95, varPct: varQ.data.equity > 0 ? (varQ.data.expectedShortfall95 / varQ.data.equity) * 100 : 0 }, method: "CVaR" },
                ].map(({ label, v, method }) => (
                  <div key={label} className="rounded-xl border border-slate-800/50 bg-slate-900/30 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500">{label}</p>
                        <p className="mt-0.5 text-[10px] text-slate-700">{method}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[15px] font-bold text-rose-400">-{money(v.varUsd)}</p>
                        <p className="text-[10px] text-slate-500">-{number(v.varPct, 2)}% of equity</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stress Scenarios */}
            <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Stress Testing</p>
              <p className="mb-4 text-[13px] font-bold text-white">Scenario Impact Analysis</p>
              <div className="space-y-2.5">
                {varQ.data.stressScenarios.map((sc) => (
                  <div key={sc.name} className="rounded-xl border border-slate-800/50 bg-slate-900/20 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-300">{sc.name}</p>
                        <p className="text-[10px] text-slate-600">{sc.description}</p>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <p className={`font-mono text-[12px] font-bold ${sc.estimatedLoss > 5000 ? "text-rose-400" : "text-amber-400"}`}>
                          -{money(sc.estimatedLoss)}
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          sc.severity === "extreme"  ? "bg-rose-500/15 text-rose-400" :
                          sc.severity === "severe"   ? "bg-amber-500/15 text-amber-400" :
                          sc.severity === "moderate" ? "bg-yellow-500/15 text-yellow-400" :
                                                       "bg-slate-500/15 text-slate-400"
                        }`}>{sc.severity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Margin Forecast */}
        {varQ.data && varQ.data.marginForecast.length > 1 && (
          <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Margin Forecast
            </p>
            <p className="mb-4 text-[13px] font-bold text-white">
              Projected Margin Level Under VaR-95 Adverse Drift
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <RLineChart data={varQ.data.marginForecast} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="daysAhead" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false}
                  axisLine={false} tickFormatter={(d) => `Day ${d}`} />
                <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${v}%`} width={42} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number) => [`${number(v, 0)}%`, "Margin Level"]}
                />
                <Line type="monotone" dataKey="marginLevel" stroke="#f59e0b" strokeWidth={2}
                  dot={{ r: 3, fill: "#f59e0b" }} />
              </RLineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex gap-4 text-[10px] text-slate-600">
              <span><span className="text-emerald-400">●</span> &gt;200% Safe</span>
              <span><span className="text-amber-400">●</span> 100–200% Caution</span>
              <span><span className="text-orange-400">●</span> 50–100% Danger</span>
              <span><span className="text-rose-400">●</span> &lt;50% Stop-out</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
