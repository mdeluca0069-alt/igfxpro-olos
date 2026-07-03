import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar, Clock, Zap, RefreshCw,
  ChevronDown, ChevronRight, AlertTriangle,
  Filter, Lock,
} from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { useOptionalAuth } from "../../app/AuthGate";

// ─── Types ────────────────────────────────────────────────────────────────────

// Real shape returned by GET /api/v1/calendar/economic (economicEventService,
// DB-backed from ForexFactory/FRED/TradingEconomics) — never a fabricated
// scenario or affected-symbol list from the server.
type RawCalEvent = {
  country:   string;
  currency:  string;
  title:     string;
  impact:    string;       // "low" | "medium" | "high"
  eventTime: string;       // ISO
  actual:    string | null;
  forecast:  string | null;
  previous:  string | null;
};

type CalEvent = {
  id:               string;
  time:             string;       // ISO, same as eventTime
  country:          string;
  currency:         string;
  impact:           "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  event:            string;
  previous:         string;
  forecast:         string;
  actual?:          string;
  countdownSeconds: number;
  affectedSymbols:  string[];
};

// Real, deterministic FX pairs per currency — same majors traded on the
// platform. Used to compute "affected instruments" honestly from the
// event's currency, not a fabricated per-event list.
const PAIRS_BY_CURRENCY: Record<string, string[]> = {
  EUR: ["EURUSD", "EURGBP", "EURJPY"],
  USD: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US500"],
  GBP: ["GBPUSD", "EURGBP"],
  JPY: ["USDJPY", "EURJPY"],
  AUD: ["AUDUSD"],
  CAD: ["USDCAD"],
  CHF: ["USDCHF"],
  NZD: ["NZDUSD"],
};

function toCalEvent(raw: RawCalEvent): CalEvent {
  const eventTime = new Date(raw.eventTime);
  return {
    id:               `${raw.currency}-${raw.eventTime}-${raw.title}`,
    time:             raw.eventTime,
    country:          raw.country,
    currency:         raw.currency,
    impact:           raw.impact.toUpperCase() as CalEvent["impact"],
    event:            raw.title,
    previous:         raw.previous ?? "",
    forecast:         raw.forecast ?? "",
    actual:           raw.actual ?? undefined,
    countdownSeconds: Math.round((eventTime.getTime() - Date.now()) / 1000),
    affectedSymbols:  PAIRS_BY_CURRENCY[raw.currency] ?? [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FLAG: Record<string, string> = {
  EU: "🇪🇺", US: "🇺🇸", UK: "🇬🇧", GB: "🇬🇧",
  JP: "🇯🇵", AU: "🇦🇺", CA: "🇨🇦", CH: "🇨🇭",
  NZ: "🇳🇿", CN: "🇨🇳",
};

function flag(country: string) {
  return FLAG[country?.toUpperCase()] ?? "🌐";
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtCountdown(secs: number): string {
  if (secs <= 0) return "NOW";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

// ─── Impact config ────────────────────────────────────────────────────────────

const IMPACT_CFG = {
  CRITICAL: {
    badge: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    dot:   "bg-rose-400",
    row:   "bg-rose-500/[0.04]",
    label: "CRITICAL",
  },
  HIGH: {
    badge: "border-orange-500/40 bg-orange-500/15 text-orange-300",
    dot:   "bg-orange-400",
    row:   "bg-orange-500/[0.03]",
    label: "HIGH",
  },
  MEDIUM: {
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    dot:   "bg-amber-400",
    row:   "",
    label: "MEDIUM",
  },
  LOW: {
    badge: "border-slate-600/40 bg-slate-500/10 text-slate-500",
    dot:   "bg-slate-600",
    row:   "",
    label: "LOW",
  },
} as const;

// ─── Event Row ────────────────────────────────────────────────────────────────

function EventRow({ ev, liveCountdown }: { ev: CalEvent; liveCountdown: number }) {
  const [open, setOpen] = useState(false);
  const cfg        = IMPACT_CFG[ev.impact];
  const isImminent = liveCountdown > 0 && liveCountdown < 3600;
  const isPast     = liveCountdown <= 0;

  const actualBetter =
    ev.actual && ev.forecast
      ? parseFloat(ev.actual) > parseFloat(ev.forecast)
      : null;

  return (
    <div className={`border-b border-white/[0.04] transition-colors ${cfg.row} ${isImminent ? "ring-1 ring-inset ring-orange-500/20" : ""}`}>
      {/* Main row */}
      <button
        className="w-full text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 px-5 py-3.5">
          {/* Impact dot + time */}
          <div className="w-20 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${isImminent ? "animate-ping" : ""}`} />
              <span className="text-[12px] font-mono tabular-nums text-white">{fmtTime(ev.time)}</span>
            </div>
          </div>

          {/* Country flag + currency */}
          <div className="w-16 shrink-0 flex items-center gap-1.5">
            <span className="text-sm leading-none">{flag(ev.country)}</span>
            <span className="text-[11px] font-bold text-slate-300">{ev.currency}</span>
          </div>

          {/* Impact badge */}
          <div className="hidden sm:block w-24 shrink-0">
            <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
              {ev.impact === "CRITICAL" && <Zap size={8} />}
              {ev.impact === "HIGH"     && <AlertTriangle size={8} />}
              {cfg.label}
            </span>
          </div>

          {/* Event name */}
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-semibold truncate ${isPast ? "text-slate-500" : "text-white"}`}>
              {ev.event}
            </p>
          </div>

          {/* Prev / Forecast / Actual */}
          <div className="hidden lg:flex items-center gap-5 w-52 shrink-0">
            <div className="text-center w-14">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Prev</p>
              <p className="text-[11px] font-mono tabular-nums text-slate-400">{ev.previous || "—"}</p>
            </div>
            <div className="text-center w-14">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Fore</p>
              <p className="text-[11px] font-mono tabular-nums text-amber-300">{ev.forecast || "—"}</p>
            </div>
            <div className="text-center w-14">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Act</p>
              <p className={`text-[11px] font-mono tabular-nums font-bold ${
                ev.actual
                  ? actualBetter === true  ? "text-emerald-400"
                  : actualBetter === false ? "text-rose-400"
                  : "text-slate-300"
                : "text-slate-700"
              }`}>
                {ev.actual || "—"}
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className="w-16 shrink-0 text-right">
            {isPast ? (
              <span className="text-[11px] font-bold text-slate-600">PAST</span>
            ) : (
              <span className={`text-[12px] font-mono font-bold ${
                isImminent
                  ? "text-orange-400"
                  : liveCountdown < 10800
                  ? "text-amber-400"
                  : "text-slate-500"
              }`}>
                {fmtCountdown(liveCountdown)}
              </span>
            )}
          </div>

          {/* Expand chevron */}
          <div className="w-5 shrink-0 text-slate-600">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-white/[0.04] bg-white/[0.015] space-y-3">
          {/* Affected symbols */}
          {ev.affectedSymbols.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Affected instruments
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ev.affectedSymbols.map((sym) => (
                  <Link
                    key={sym}
                    to={`/trading?symbol=${sym}`}
                    className="rounded-md border border-cyan-500/20 bg-cyan-500/[0.07] px-2.5 py-1 text-[11px] font-bold text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-500/[0.12]"
                  >
                    {sym}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mobile prev/fore/act */}
          <div className="flex items-center gap-5 lg:hidden">
            {[
              { label: "Previous", val: ev.previous, cls: "text-slate-400" },
              { label: "Forecast", val: ev.forecast, cls: "text-amber-300" },
              { label: "Actual",   val: ev.actual ?? "—",
                cls: ev.actual
                  ? actualBetter === true  ? "text-emerald-400"
                  : actualBetter === false ? "text-rose-400"
                  : "text-slate-300"
                : "text-slate-700" },
            ].map((col) => (
              <div key={col.label}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">{col.label}</p>
                <p className={`text-[12px] font-mono tabular-nums font-bold ${col.cls}`}>{col.val || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Next Event Banner ────────────────────────────────────────────────────────

function NextEventBanner({ ev }: { ev: CalEvent }) {
  const [secs, setSecs] = useState(ev.countdownSeconds);
  const ref = useRef(ev.countdownSeconds);
  ref.current = ev.countdownSeconds;

  useEffect(() => {
    setSecs(ev.countdownSeconds);
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [ev.countdownSeconds, ev.id]);

  const cfg = IMPACT_CFG[ev.impact];

  return (
    <div className={`mb-6 flex items-center gap-4 rounded-xl border p-4 ${
      ev.impact === "CRITICAL" ? "border-rose-500/30 bg-rose-500/10" :
      ev.impact === "HIGH"     ? "border-orange-500/30 bg-orange-500/10" :
                                  "border-amber-500/30 bg-amber-500/10"
    }`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
        <Clock size={18} className={
          ev.impact === "CRITICAL" ? "text-rose-400" :
          ev.impact === "HIGH"     ? "text-orange-400" :
                                      "text-amber-400"
        } />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Next event</p>
        <p className="text-[13px] font-bold text-white truncate">{ev.event}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-sm">{flag(ev.country)}</span>
          <span className="text-[11px] text-slate-400">{ev.currency}</span>
          <span className="text-[11px] text-slate-600">·</span>
          <span className="text-[11px] text-slate-400">{fmtTime(ev.time)}</span>
          <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Countdown</p>
        <p className={`text-[22px] font-black font-mono tabular-nums ${
          secs < 3600 ? "text-orange-400 animate-pulse" : "text-white"
        }`}>
          {fmtCountdown(secs)}
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const IMPACT_ORDER: CalEvent["impact"][] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const ALL_CURRENCIES = ["EUR", "USD", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

export default function EconomicCalendarPage() {
  const auth = useOptionalAuth();
  const isAuthed = auth?.authenticated ?? false;

  const [impactFilter,    setImpactFilter]    = useState<CalEvent["impact"] | "ALL">("ALL");
  const [currencyFilter,  setCurrencyFilter]  = useState<string>("ALL");
  const [countdowns,      setCountdowns]      = useState<Record<string, number>>({});

  const { data: events = [], dataUpdatedAt, refetch, isFetching } = useQuery<CalEvent[]>({
    queryKey: ["economic-calendar"],
    queryFn:  async () => {
      try {
        const raw = await apiGet<RawCalEvent[]>("/api/v1/calendar/economic?hours=168");
        return raw.map(toCalEvent);
      }
      catch (e: unknown) {
        if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 401) return [];
        throw e;
      }
    },
    refetchInterval: 30_000,
    staleTime:       20_000,
    retry: (count, e: unknown) => {
      if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 401) return false;
      return count < 2;
    },
  });

  // Seed countdowns from server on fetch, then tick locally every second
  useEffect(() => {
    const map: Record<string, number> = {};
    for (const ev of events) map[ev.id] = ev.countdownSeconds;
    setCountdowns(map);
  }, [events]);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdowns((prev) => {
        const next: Record<string, number> = {};
        for (const k of Object.keys(prev)) next[k] = Math.max(0, prev[k] - 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Filtering
  const filtered = events.filter((ev) => {
    if (impactFilter !== "ALL"  && ev.impact   !== impactFilter)  return false;
    if (currencyFilter !== "ALL" && ev.currency !== currencyFilter) return false;
    return true;
  });

  // Group by time bracket
  const imminentEvents = filtered.filter((ev) => (countdowns[ev.id] ?? ev.countdownSeconds) > 0  && (countdowns[ev.id] ?? ev.countdownSeconds) < 3600);
  const upcomingEvents  = filtered.filter((ev) => (countdowns[ev.id] ?? ev.countdownSeconds) >= 3600);
  const pastEvents      = filtered.filter((ev) => (countdowns[ev.id] ?? ev.countdownSeconds) <= 0);

  // Next unpast high-priority event for banner
  const nextBanner = [...events]
    .filter((ev) => (countdowns[ev.id] ?? ev.countdownSeconds) > 0)
    .sort((a, b) => (countdowns[a.id] ?? a.countdownSeconds) - (countdowns[b.id] ?? b.countdownSeconds))
    .find((ev) => ev.impact === "CRITICAL" || ev.impact === "HIGH") ??
    [...events].filter((ev) => (countdowns[ev.id] ?? ev.countdownSeconds) > 0)[0];

  // Impact stats
  const impactCounts = IMPACT_ORDER.reduce<Record<string, number>>((acc, imp) => {
    acc[imp] = events.filter((ev) => ev.impact === imp).length;
    return acc;
  }, {});

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <div className="min-h-screen bg-[#070d16] p-6 text-white">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Calendar size={16} className="text-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-400">Economic Calendar</span>
          </div>
          <h1 className="text-[26px] font-black tracking-[-0.03em] text-white">Macro Events</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Live economic events · ForexFactory, TradingEconomics, FRED
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <RefreshCw size={11} className={isFetching ? "animate-spin text-cyan-400" : ""} />
            {updatedLabel}
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/[0.06]"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </div>

      {/* Impact summary chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {IMPACT_ORDER.map((imp) => {
          const cfg = IMPACT_CFG[imp];
          return (
            <span
              key={imp}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide cursor-pointer transition ${
                impactFilter === imp ? cfg.badge : "border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300"
              }`}
              onClick={() => setImpactFilter((p) => p === imp ? "ALL" : imp)}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
              <span className="opacity-60">{impactCounts[imp] ?? 0}</span>
            </span>
          );
        })}
        {impactFilter !== "ALL" && (
          <button
            onClick={() => setImpactFilter("ALL")}
            className="text-[11px] text-slate-600 hover:text-slate-400 underline transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Currency filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Filter size={11} className="text-slate-600" />
        {["ALL", ...ALL_CURRENCIES].map((cur) => (
          <button
            key={cur}
            onClick={() => setCurrencyFilter(cur)}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-bold transition ${
              currencyFilter === cur
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                : "border-white/[0.06] bg-transparent text-slate-600 hover:text-slate-300"
            }`}
          >
            {cur}
          </button>
        ))}
      </div>

      {/* Next event banner */}
      {nextBanner && <NextEventBanner ev={nextBanner} />}

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: "Total events", val: events.length,          cls: "text-white" },
          { label: "Critical",     val: impactCounts.CRITICAL,  cls: "text-rose-400" },
          { label: "High",         val: impactCounts.HIGH,       cls: "text-orange-400" },
          { label: "Medium",       val: impactCounts.MEDIUM,     cls: "text-amber-400" },
          { label: "Imminent",     val: imminentEvents.length,   cls: "text-orange-300" },
          { label: "Upcoming",     val: upcomingEvents.length,   cls: "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">{s.label}</p>
            <p className={`text-[20px] font-black tabular-nums ${s.cls}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div className="mb-1 hidden items-center gap-3 px-5 py-2 lg:flex">
        {[
          { label: "Time",              w: "w-20" },
          { label: "Ccy",              w: "w-16" },
          { label: "Impact",           w: "w-24 hidden sm:block" },
          { label: "Event",            w: "flex-1" },
          { label: "Prev / Fore / Act", w: "w-52 hidden lg:block" },
          { label: "In",               w: "w-16 text-right" },
          { label: "",                 w: "w-5" },
        ].map((col) => (
          <div key={col.label} className={`${col.w} text-[9px] font-bold uppercase tracking-widest text-slate-700`}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Event groups */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] py-16 text-center">
          {!isAuthed && events.length === 0 ? (
            <>
              <Lock size={32} className="mx-auto mb-3 text-slate-600" />
              <p className="mb-1 text-[14px] font-semibold text-white/60">Live calendar requires a free account</p>
              <p className="mb-5 text-[12px] text-slate-600">Economic events, OLOS impact scores and real-time countdowns are available after signing in.</p>
              <div className="flex items-center justify-center gap-3">
                <Link to="/register" className="rounded-xl px-5 py-2.5 text-[12px] font-bold text-black"
                  style={{ background: "linear-gradient(135deg,#00d4ff,#0080ff)" }}>Open Free Account</Link>
                <Link to="/login" className="rounded-xl border border-white/10 px-5 py-2.5 text-[12px] text-white/50 hover:text-white transition-colors">Sign In</Link>
              </div>
            </>
          ) : (
            <>
              <Calendar size={32} className="mx-auto mb-3 text-slate-700" />
              <p className="text-[13px] text-slate-600">No events match the current filters</p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a1220]">
          {/* Imminent <1h */}
          {imminentEvents.length > 0 && (
            <EventGroup label="⚡ IMMINENT — UNDER 1 HOUR" labelCls="text-orange-400 border-b-orange-500/20">
              {imminentEvents.map((ev) => (
                <EventRow key={ev.id} ev={ev} liveCountdown={countdowns[ev.id] ?? ev.countdownSeconds} />
              ))}
            </EventGroup>
          )}

          {/* Upcoming */}
          {upcomingEvents.length > 0 && (
            <EventGroup label="Upcoming" labelCls="text-slate-500 border-b-white/[0.04]">
              {upcomingEvents.map((ev) => (
                <EventRow key={ev.id} ev={ev} liveCountdown={countdowns[ev.id] ?? ev.countdownSeconds} />
              ))}
            </EventGroup>
          )}

          {/* Past */}
          {pastEvents.length > 0 && (
            <EventGroup label="Past" labelCls="text-slate-700 border-b-white/[0.04]">
              {pastEvents.map((ev) => (
                <EventRow key={ev.id} ev={ev} liveCountdown={0} />
              ))}
            </EventGroup>
          )}
        </div>
      )}

      {/* Footer note */}
      <p className="mt-4 text-[11px] text-slate-700">
        Data sourced from ForexFactory, TradingEconomics, and FRED. Times shown in local timezone. OLOS scenarios are AI-generated risk guidance, not investment advice.
      </p>
    </div>
  );
}

// ─── Event group wrapper ──────────────────────────────────────────────────────

function EventGroup({
  label, labelCls, children,
}: {
  label: string;
  labelCls: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className={`border-b px-5 py-2 ${labelCls}`}>
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      {children}
    </div>
  );
}
