import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Activity, BarChart2, ChevronDown, Clock,
  Filter, Pause, Play, TrendingDown, TrendingUp, Zap, Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { wsClient } from "../../api/websocket";
import { number, priceDigits } from "../../shared/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type TapeEntry = {
  id:      string;
  ts:      number;
  symbol:  string;
  side:    "BUY" | "SELL";
  price:   number;
  size:    number;
  isFill:  boolean;
  isBlock: boolean;
};

type DeltaBucket = {
  label:    string;
  buyVol:   number;
  sellVol:  number;
  delta:    number;
  cumDelta: number;
};

type Direction = "ALL" | "BUY" | "SELL";
type Window    = "1m" | "5m" | "15m" | "1h" | "all";
type MinVol    = 0 | 0.01 | 0.1 | 1 | 10;

// ─── Constants ────────────────────────────────────────────────────────────────

const SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD",
  "ETHUSD", "US500",  "US100",  "AAPL",   "MSFT", "NVDA", "TSLA",
];

const BLOCK_THRESHOLDS = [1, 2, 5, 10, 25, 50];

const VOL_LABELS: Record<MinVol, string> = {
  0: "All", 0.01: "0.01+", 0.1: "0.1+", 1: "1+", 10: "10+",
};

const WINDOW_MS: Record<Window, number | null> = {
  "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000, "all": null,
};

const MAX_TAPE    = 500;
const ROW_HEIGHT  = 28;

function fmtTs(ts: number): string {
  const d  = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

/** Group tape entries into 30-second buckets for cumulative delta histogram */
function buildDeltaHistogram(entries: TapeEntry[]): DeltaBucket[] {
  if (entries.length === 0) return [];
  const BUCKET_MS = 30_000;
  const map = new Map<number, { buyVol: number; sellVol: number }>();
  for (const e of entries) {
    if (!e.isFill || e.size <= 0) continue;
    const bucket = Math.floor(e.ts / BUCKET_MS) * BUCKET_MS;
    if (!map.has(bucket)) map.set(bucket, { buyVol: 0, sellVol: 0 });
    const rec = map.get(bucket)!;
    if (e.side === "BUY") rec.buyVol += e.size;
    else                  rec.sellVol += e.size;
  }
  if (map.size === 0) return [];

  const sorted = [...map.entries()].sort((a, b) => a[0] - b[0]);
  let cumDelta = 0;
  return sorted.map(([ts, { buyVol, sellVol }]) => {
    const delta = buyVol - sellVol;
    cumDelta   += delta;
    return {
      label:    new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      buyVol,
      sellVol,
      delta,
      cumDelta,
    };
  });
}

// ─── Tape row (non-animated, rendered by virtualizer) ─────────────────────────

const TapeRow = memo(function TapeRow({ entry, digits }: { entry: TapeEntry; digits: number }) {
  const isBuy = entry.side === "BUY";
  return (
    <div className={[
      "grid grid-cols-[150px_1fr_110px_90px_80px] gap-x-3 border-b border-slate-900/50 px-6 py-[4px] transition-colors hover:bg-slate-900/20",
      entry.isFill    ? "bg-cyan-400/[0.025]" : "",
      entry.isBlock   ? "bg-amber-400/[0.035] border-l-2 border-l-amber-400/40" : "",
    ].filter(Boolean).join(" ")}>
      <span className="font-mono text-[11px] tabular-nums text-slate-600">{fmtTs(entry.ts)}</span>
      <span className={`font-mono text-[12px] font-black tabular-nums ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>
        {entry.price.toFixed(digits)}
      </span>
      <span className={`font-mono text-[11px] tabular-nums ${
        entry.isBlock
          ? "text-amber-300 font-bold"
          : entry.isFill && entry.size >= 1
          ? "text-slate-300"
          : "text-slate-600"
      }`}>
        {entry.isFill && entry.size > 0
          ? <span title={entry.isBlock ? "Block trade" : undefined}>{number(entry.size, 2)}{entry.isBlock ? " ⚡" : ""}</span>
          : <span className="text-slate-700 text-[10px]">—</span>}
      </span>
      <span className={`flex items-center gap-1 text-[10px] font-black ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>
        {isBuy ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
        {entry.side}
      </span>
      <span className={`text-[9px] font-black ${entry.isFill ? "text-cyan-400" : "text-slate-800"}`}>
        {entry.isFill
          ? <span className="flex items-center gap-1"><Zap size={8} className="text-cyan-400" />FILL</span>
          : "MKT"}
      </span>
    </div>
  );
});

// ─── Delta histogram tooltip ──────────────────────────────────────────────────

function DeltaTip({ active, payload }: { active?: boolean; payload?: { payload: DeltaBucket }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#050a0f] px-3 py-2 text-[10px] shadow-xl">
      <p className="text-slate-500">{d.label}</p>
      <p className="text-emerald-400">Buy: {number(d.buyVol, 2)}</p>
      <p className="text-rose-400">Sell: {number(d.sellVol, 2)}</p>
      <p className={`font-bold ${d.delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
        Delta: {d.delta >= 0 ? "+" : ""}{number(d.delta, 2)}
      </p>
      <p className="text-cyan-300">Cum. Δ: {d.cumDelta >= 0 ? "+" : ""}{number(d.cumDelta, 2)}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TimeAndSales = memo(function TimeAndSales() {
  const [symbol,         setSymbol]         = useState("EURUSD");
  const [direction,      setDirection]      = useState<Direction>("ALL");
  const [window_,        setWindow_]        = useState<Window>("5m");
  const [minVol,         setMinVol]         = useState<MinVol>(0);
  const [blockThreshold, setBlockThreshold] = useState(10);
  const [paused,         setPaused]         = useState(false);
  const [symbolMenu,     setSymbolMenu]     = useState(false);
  const [showDeltaHist,  setShowDeltaHist]  = useState(true);

  const tapeRef    = useRef<TapeEntry[]>([]);
  const [tape, setTape] = useState<TapeEntry[]>([]);
  const pausedRef  = useRef(paused);
  const lastMidRef = useRef<Record<string, number>>({});
  const parentRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const push = useCallback((entry: TapeEntry) => {
    if (pausedRef.current) return;
    tapeRef.current = [entry, ...tapeRef.current].slice(0, MAX_TAPE);
    setTape([...tapeRef.current]);
  }, []);

  useEffect(() => {
    tapeRef.current = [];
    setTape([]);
    lastMidRef.current = {};
  }, [symbol]);

  // ── Market tick feed ──────────────────────────────────────────────────────
  useEffect(() => {
    return wsClient.on("market.quotes", (data) => {
      const quotes = data as Array<{ symbol: string; mid: number; bid: number; ask: number }>;
      if (!Array.isArray(quotes)) return;
      for (const q of quotes) {
        if (q.symbol !== symbol) continue;
        const last = lastMidRef.current[q.symbol];
        if (last === q.mid) continue;
        const side: "BUY" | "SELL" = last !== undefined ? (q.mid >= last ? "BUY" : "SELL") : "BUY";
        lastMidRef.current[q.symbol] = q.mid;
        push({ id: `tick-${q.symbol}-${Date.now()}`, ts: Date.now(), symbol: q.symbol, side, price: q.mid, size: 0, isFill: false, isBlock: false });
      }
    });
  }, [symbol, push]);

  // ── Fill / position feed ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubFill = wsClient.on("order.filled", (data) => {
      const p  = data as Record<string, unknown>;
      const sym = String(p.symbol ?? "");
      if (sym && sym !== symbol) return;
      const size = Number(p.quantity ?? 0);
      push({
        id:      `fill-${String(p.orderId ?? Date.now())}`,
        ts:      Date.now(),
        symbol:  sym || symbol,
        side:    (p.side as "BUY" | "SELL") ?? "BUY",
        price:   Number(p.fillPrice ?? p.averageFillPrice ?? 0),
        size,
        isFill:  true,
        isBlock: size >= blockThreshold,
      });
    });

    const unsubPos = wsClient.on("position.opened", (data) => {
      const p   = data as Record<string, unknown>;
      const sym = String(p.symbol ?? "");
      if (sym && sym !== symbol) return;
      const size = Number(p.quantity ?? 0);
      push({
        id:      `pos-${String(p.positionId ?? Date.now())}`,
        ts:      Date.now(),
        symbol:  sym || symbol,
        side:    (p.side as "BUY" | "SELL") ?? "BUY",
        price:   Number(p.entryPrice ?? 0),
        size,
        isFill:  true,
        isBlock: size >= blockThreshold,
      });
    });

    return () => { unsubFill(); unsubPos(); };
  }, [symbol, push, blockThreshold]);

  // ── Filtered tape ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const windowMs = WINDOW_MS[window_];
    const cutoff   = windowMs ? Date.now() - windowMs : null;
    return tape.filter((e) => {
      if (direction !== "ALL" && e.side !== direction) return false;
      if (e.size < minVol) return false;
      if (cutoff && e.ts < cutoff) return false;
      return true;
    });
  }, [tape, direction, minVol, window_]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let buyVol = 0, sellVol = 0, priceSum = 0;
    for (const e of filtered) {
      if (e.side === "BUY") buyVol  += e.size;
      else                  sellVol += e.size;
      priceSum += e.price;
    }
    const totalVol = buyVol + sellVol;
    const hasVol   = filtered.some((e) => e.isFill && e.size > 0);
    return { count: filtered.length, buyPct: totalVol > 0 ? (buyVol / totalVol) * 100 : 50, sellPct: totalVol > 0 ? (sellVol / totalVol) * 100 : 50, buyVol, sellVol, netVol: buyVol - sellVol, avgPrice: filtered.length > 0 ? priceSum / filtered.length : 0, hasVol };
  }, [filtered]);

  // ── Cumulative delta histogram ────────────────────────────────────────────
  const deltaHist = useMemo(() => buildDeltaHistogram(filtered), [filtered]);

  const digits = priceDigits(symbol);

  // ── TanStack Virtual ─────────────────────────────────────────────────────
  const rowVirtualizer = useVirtualizer({
    count:            filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize:     () => ROW_HEIGHT,
    overscan:         20,
  });

  return (
    <div className="flex flex-col bg-[#050a0f] text-slate-200" style={{ height: "calc(100dvh - 2.5rem)" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800/70 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.07]">
            <Activity size={13} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-400">IGFXPRO</p>
            <h1 className="text-[13px] font-black leading-none text-white">TIME &amp; SALES</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Delta histogram toggle */}
          <button
            onClick={() => setShowDeltaHist((v) => !v)}
            title="Toggle cumulative delta histogram"
            className={[
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition",
              showDeltaHist ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-slate-700/60 text-slate-500 hover:text-slate-300",
            ].join(" ")}
          >
            <Layers size={10} /> Δ
          </button>

          {/* Live / paused */}
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-amber-400" : "animate-pulse bg-emerald-400"}`} />
            <span className="text-[10px] font-bold text-slate-500">{paused ? "PAUSED" : "LIVE"}</span>
          </div>

          <button onClick={() => setPaused((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 px-3 py-1.5 text-[10px] font-bold text-slate-400 transition hover:border-slate-600 hover:text-white">
            {paused ? <><Play size={9} /> RESUME</> : <><Pause size={9} /> PAUSE</>}
          </button>

          {/* Symbol selector */}
          <div className="relative">
            <button
              onClick={() => setSymbolMenu((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3.5 py-1.5 text-[11px] font-black text-white transition hover:border-cyan-500/40"
            >
              {symbol}
              <ChevronDown size={10} className="text-slate-500" />
            </button>
            <AnimatePresence>
              {symbolMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSymbolMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full z-50 mt-1 min-w-[130px] rounded-xl border border-slate-700 bg-[#0d1629] py-1 shadow-2xl"
                  >
                    {SYMBOLS.map((sym) => (
                      <button key={sym} onClick={() => { setSymbol(sym); setSymbolMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-[11px] font-semibold transition hover:bg-slate-800 ${sym === symbol ? "text-cyan-300" : "text-slate-400"}`}>
                        {sym}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-5 border-b border-slate-800/40 bg-slate-900/20 px-6 py-2.5">
        <Filter size={11} className="shrink-0 text-slate-600" />

        {/* Direction */}
        <div className="flex items-center gap-0.5" role="group">
          {(["ALL", "BUY", "SELL"] as Direction[]).map((d) => (
            <button key={d} onClick={() => setDirection(d)} aria-pressed={direction === d}
              className={`rounded-md px-2.5 py-1 text-[10px] font-black transition ${
                direction === d
                  ? d === "BUY" ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  : d === "SELL" ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
                  : "bg-slate-700/80 text-white ring-1 ring-slate-600"
                  : "text-slate-600 hover:text-slate-400"
              }`}>
              {d === "BUY" ? "▲ BUY" : d === "SELL" ? "▼ SELL" : "ALL"}
            </button>
          ))}
        </div>

        <div className="h-3.5 w-px bg-slate-800" />

        {/* Volume floor */}
        <div className="flex items-center gap-0.5" role="group">
          <span className="mr-1.5 text-[9px] font-semibold text-slate-600">VOL ≥</span>
          {([0, 0.01, 0.1, 1, 10] as MinVol[]).map((v) => (
            <button key={v} onClick={() => setMinVol(v)} aria-pressed={minVol === v}
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition ${minVol === v ? "bg-slate-700 text-white ring-1 ring-slate-600" : "text-slate-600 hover:text-slate-400"}`}>
              {VOL_LABELS[v]}
            </button>
          ))}
        </div>

        <div className="h-3.5 w-px bg-slate-800" />

        {/* Block trade threshold */}
        <div className="flex items-center gap-0.5" role="group">
          <span className="mr-1.5 text-[9px] font-semibold text-slate-600">BLOCK ≥</span>
          {BLOCK_THRESHOLDS.map((t) => (
            <button key={t} onClick={() => setBlockThreshold(t)} aria-pressed={blockThreshold === t}
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition ${blockThreshold === t ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30" : "text-slate-600 hover:text-slate-400"}`}>
              {t}L
            </button>
          ))}
        </div>

        <div className="h-3.5 w-px bg-slate-800" />

        {/* Time window */}
        <div className="flex items-center gap-0.5" role="group">
          <Clock size={10} className="mr-1.5 text-slate-600" />
          {(["1m", "5m", "15m", "1h", "all"] as Window[]).map((w) => (
            <button key={w} onClick={() => setWindow_(w)} aria-pressed={window_ === w}
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition ${window_ === w ? "bg-slate-700 text-white ring-1 ring-slate-600" : "text-slate-600 hover:text-slate-400"}`}>
              {w === "all" ? "ALL" : w.toUpperCase()}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[10px] tabular-nums text-slate-700">{filtered.length.toLocaleString()} prints</span>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-3 divide-x divide-slate-800/60 border-b border-slate-800/40 bg-slate-900/10">
        <div className="px-6 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-400">▲ {stats.buyPct.toFixed(1)}%</span>
            <span className="text-[9px] text-slate-600">BUY / SELL PRESSURE</span>
            <span className="text-[10px] font-black text-rose-400">{stats.sellPct.toFixed(1)}% ▼</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-rose-500/20">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${stats.buyPct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-6 px-6 py-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-700">BUY VOL</p>
            <p className="text-[13px] font-black tabular-nums text-emerald-400">{number(stats.buyVol, 2)}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-700">SELL VOL</p>
            <p className="text-[13px] font-black tabular-nums text-rose-400">{number(stats.sellVol, 2)}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-700">NET DELTA</p>
            <p className={`text-[13px] font-black tabular-nums ${stats.netVol >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {stats.netVol >= 0 ? "+" : ""}{number(stats.netVol, 2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 px-6 py-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-700">AVG PRICE</p>
            <p className="text-[13px] font-black tabular-nums text-slate-200">
              {stats.avgPrice > 0 ? stats.avgPrice.toFixed(digits) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-700">TOTAL PRINTS</p>
            <p className="text-[13px] font-black tabular-nums text-cyan-300">{stats.count.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── Cumulative delta histogram ──────────────────────────────────── */}
      {showDeltaHist && (
        <div className="shrink-0 border-b border-slate-800/40 bg-slate-900/10 px-6 pt-3 pb-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">CUMULATIVE DELTA (fills only)</span>
            {!stats.hasVol && (
              <span className="text-[9px] italic text-slate-700">Volume Not Available From Current Liquidity Feed</span>
            )}
          </div>
          {deltaHist.length > 0 ? (
            <ResponsiveContainer width="100%" height={72}>
              <BarChart data={deltaHist} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="4%">
                <Tooltip content={<DeltaTip />} cursor={false} />
                <Bar dataKey="delta" radius={[2, 2, 0, 0]} maxBarSize={24}>
                  {deltaHist.map((b, i) => (
                    <Cell key={i} fill={b.delta >= 0 ? "#34d399" : "#f43f5e"} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-16 items-center justify-center text-[10px] text-slate-700">
              {stats.hasVol ? "No fill data in window" : "Awaiting fill data…"}
            </div>
          )}
        </div>
      )}

      {/* ── Table header ───────────────────────────────────────────────── */}
      <div className="shrink-0 overflow-x-auto">
        <div className="grid min-w-[500px] grid-cols-[150px_1fr_110px_90px_80px] gap-x-3 border-b border-slate-800/30 bg-slate-950/60 px-6 py-2">
          {["TIME", "PRICE", "SIZE", "SIDE", "TYPE"].map((h) => (
            <span key={h} className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-700">{h}</span>
          ))}
        </div>
      </div>

      {/* ── Virtualised tape ────────────────────────────────────────────── */}
      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#1e293b transparent" }}
      >
        {filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2.5 text-slate-800">
            <BarChart2 size={22} />
            <p className="text-[11px] font-semibold">Waiting for market activity…</p>
          </div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((vRow) => (
              <div
                key={vRow.key}
                data-index={vRow.index}
                ref={rowVirtualizer.measureElement}
                style={{ position: "absolute", top: vRow.start, left: 0, right: 0 }}
              >
                <TapeRow entry={filtered[vRow.index]!} digits={digits} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default TimeAndSales;
