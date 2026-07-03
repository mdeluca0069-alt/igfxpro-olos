import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Radio, TrendingDown, TrendingUp, Layers3, BarChart2, Gauge, ArrowUp, ArrowDown } from "lucide-react";
import { useMarketStore } from "../../store/market.store";
import { MarketsAPI, type DomBook, type DomLevel } from "../../api/endpoints/markets";
import { wsClient } from "../../api/websocket";
import { usePageTitle } from "../../hooks/usePageTitle";
import { priceDigits } from "../../shared/utils/format";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOM_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US500", "BTCUSD", "ETHUSD", "AAPL"];
// Depth levels (ladder) refresh interval — structural changes are slow,
// top-of-book bid/ask/spread comes via WebSocket push instead of polling.
const DOM_DEPTH_REFRESH_MS = 10_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(symbol: string, value: number): string {
  const d = priceDigits(symbol);
  return value.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtVol(symbol: string, vol: number): string {
  if (symbol.startsWith("BTC") || symbol.startsWith("ETH")) {
    return vol >= 1 ? vol.toFixed(2) : vol.toFixed(4);
  }
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}k`;
  return vol.toFixed(2);
}

function spreadPips(symbol: string, spread: number): string {
  const multiplier = symbol.includes("JPY") ? 100 : 10000;
  const pips = spread * multiplier;
  return pips < 10 ? pips.toFixed(1) : pips.toFixed(0);
}

// ─── Flash hook ───────────────────────────────────────────────────────────────

function useFlash(value: number | undefined): "up" | "down" | null {
  const prev = useRef<number | undefined>(undefined);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === undefined || prev.current === undefined) {
      prev.current = value;
      return;
    }
    if (value !== prev.current) {
      const d = value > prev.current ? "up" : "down";
      setDir(d);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDir(null), 400);
      prev.current = value;
    }
  }, [value]);

  return dir;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SymbolTabs = memo(function SymbolTabs({ active, onChange }: { active: string; onChange: (s: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {DOM_SYMBOLS.map((sym) => (
        <button
          key={sym}
          onClick={() => onChange(sym)}
          aria-pressed={active === sym}
          aria-label={`Select ${sym}`}
          className={[
            "rounded-lg px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-all",
            active === sym
              ? "bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
              : "border border-slate-700/60 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200",
          ].join(" ")}
        >
          {sym}
        </button>
      ))}
    </div>
  );
});

const SpreadMonitor = memo(function SpreadMonitor({ symbol, book }: { symbol: string; book: DomBook | null | undefined }) {
  const liveQuote = useMarketStore((s) => s.getQuote(symbol));
  const bid       = liveQuote?.bid ?? book?.bid ?? 0;
  const ask       = liveQuote?.ask ?? book?.ask ?? 0;
  const spread    = liveQuote?.spread ?? book?.spread ?? 0;
  const spreadBps = book?.spreadBps ?? 0;
  const changePct = liveQuote?.changePct ?? book?.changePct ?? 0;
  const bidFlash  = useFlash(bid);
  const askFlash  = useFlash(ask);

  const pips = spreadPips(symbol, spread);

  return (
    <div className="grid grid-cols-1 gap-3 mb-5 sm:grid-cols-3">
      {/* Best Bid */}
      <div className={[
        "rounded-xl border p-4 transition-colors duration-300",
        bidFlash === "up"   ? "border-emerald-400/60 bg-emerald-950/40" :
        bidFlash === "down" ? "border-slate-600/40 bg-slate-900/40" :
                              "border-emerald-800/30 bg-emerald-950/20",
      ].join(" ")}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/70 mb-1">Best Bid</p>
        <p className={[
          "font-mono text-2xl font-bold tabular-nums transition-colors duration-200",
          bidFlash === "up" ? "text-emerald-300" : "text-emerald-400",
        ].join(" ")}>
          {bid > 0 ? fmtPrice(symbol, bid) : "—"}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
          {changePct >= 0
            ? <TrendingUp size={11} className="text-emerald-400" />
            : <TrendingDown size={11} className="text-rose-400" />}
          <span className={changePct >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {changePct >= 0 ? "+" : ""}{changePct.toFixed(3)}%
          </span>
        </div>
      </div>

      {/* Spread Monitor */}
      <div className="rounded-xl border border-cyan-800/30 bg-cyan-950/20 p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/70 mb-1">Spread</p>
        <p className="font-mono text-2xl font-bold text-cyan-300 tabular-nums">{pips}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">pips</p>
        <div className="mt-2 rounded-md bg-slate-900/60 px-2 py-1 text-[10px] font-mono text-slate-400">
          {spreadBps > 0 ? `${spreadBps.toFixed(2)} bps` : `${(spread * 10000).toFixed(2)} bps`}
        </div>
      </div>

      {/* Best Ask */}
      <div className={[
        "rounded-xl border p-4 transition-colors duration-300",
        askFlash === "up"   ? "border-slate-600/40 bg-slate-900/40" :
        askFlash === "down" ? "border-rose-400/60 bg-rose-950/40" :
                              "border-rose-800/30 bg-rose-950/20",
      ].join(" ")}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400/70 mb-1">Best Ask</p>
        <p className={[
          "font-mono text-2xl font-bold tabular-nums transition-colors duration-200",
          askFlash === "down" ? "text-rose-300" : "text-rose-400",
        ].join(" ")}>
          {ask > 0 ? fmtPrice(symbol, ask) : "—"}
        </p>
        <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[11px]">
          <span className="text-slate-500">vs bid</span>
          <span className="font-mono text-cyan-400">+{pips}p</span>
        </div>
      </div>
    </div>
  );
});

// Single ladder row
const LadderRow = memo(function LadderRow({
  symbol,
  level,
  tone,
  maxVol,
  isBest,
}: {
  symbol:  string;
  level:   DomLevel;
  tone:    "bid" | "ask";
  maxVol:  number;
  isBest:  boolean;
}) {
  const pct  = maxVol > 0 ? (level.volume / maxVol) * 100 : 0;
  const isBid = tone === "bid";

  return (
    <div className={[
      "relative grid grid-cols-[80px_1fr_80px] items-center gap-1 rounded px-2 py-[5px] text-[11px] font-mono overflow-hidden",
      "transition-colors duration-100",
      isBest
        ? isBid
          ? "bg-emerald-500/10 border-l-2 border-emerald-400"
          : "bg-rose-500/10 border-r-2 border-rose-400"
        : "hover:bg-slate-800/40",
    ].join(" ")}>
      {/* Volume bar — fills from relevant side */}
      <div
        className={[
          "absolute inset-y-0 top-0 bottom-0 opacity-20",
          isBid ? "left-0 bg-emerald-400" : "right-0 bg-rose-400",
        ].join(" ")}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />

      {/* Cumulative vol — left for bid, right for ask */}
      {isBid ? (
        <>
          <span className="relative text-right text-slate-500 text-[10px]">
            {fmtVol(symbol, level.cumulativeVolume)}
          </span>
          <span className={["relative text-center tabular-nums font-semibold",
            isBest ? "text-emerald-300" : "text-slate-300"].join(" ")}>
            {fmtPrice(symbol, level.price)}
          </span>
          <span className="relative text-left text-emerald-400/80">
            {fmtVol(symbol, level.volume)}
          </span>
        </>
      ) : (
        <>
          <span className="relative text-right text-rose-400/80">
            {fmtVol(symbol, level.volume)}
          </span>
          <span className={["relative text-center tabular-nums font-semibold",
            isBest ? "text-rose-300" : "text-slate-300"].join(" ")}>
            {fmtPrice(symbol, level.price)}
          </span>
          <span className="relative text-left text-slate-500 text-[10px]">
            {fmtVol(symbol, level.cumulativeVolume)}
          </span>
        </>
      )}
    </div>
  );
});

const OrderLadder = memo(function OrderLadder({ symbol, book }: { symbol: string; book: DomBook | null | undefined }) {
  if (!book) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-500 mb-5">
        <Activity size={20} className="mx-auto mb-2 animate-pulse" />
        <p className="text-sm">Connecting to live order book…</p>
      </div>
    );
  }

  // asks: index 0 = best ask, index N = worst. Show reversed (worst at top, best at bottom).
  const asksReversed = useMemo(() => [...book.asks].reverse(), [book.asks]);
  const bids         = book.bids;
  const maxAskVol    = useMemo(() => Math.max(...book.asks.map((l) => l.volume), 1), [book.asks]);
  const maxBidVol    = useMemo(() => Math.max(...bids.map((l) => l.volume), 1), [bids]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden mb-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      {/* Column headers */}
      <div className="grid grid-cols-[80px_1fr_80px] gap-1 px-2 py-2 border-b border-slate-800 bg-slate-900/60">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400/60 text-right">VOL</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 text-center">PRICE</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400/60 text-left">CUM</span>
      </div>

      {/* Ask ladder (worst → best, top → bottom) */}
      <div className="px-2 pt-2 space-y-0.5">
        {asksReversed.map((level, i) => (
          <LadderRow
            key={`ask-${level.price}`}
            symbol={symbol}
            level={level}
            tone="ask"
            maxVol={maxAskVol}
            isBest={i === asksReversed.length - 1}
          />
        ))}
      </div>

      {/* Spread separator */}
      <div className="mx-2 my-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-cyan-400/70 whitespace-nowrap">
          {spreadPips(symbol, book.spread)} pips · {book.spreadBps.toFixed(2)} bps
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </div>

      {/* Bid ladder (best → worst) */}
      <div className="px-2 pb-2 space-y-0.5">
        {bids.map((level, i) => (
          <LadderRow
            key={`bid-${level.price}`}
            symbol={symbol}
            level={level}
            tone="bid"
            maxVol={maxBidVol}
            isBest={i === 0}
          />
        ))}
      </div>
    </div>
  );
});

const VolumeDepthProfile = memo(function VolumeDepthProfile({ symbol, book }: { symbol: string; book: DomBook | null | undefined }) {
  if (!book || book.bids.length === 0 || book.asks.length === 0) return null;

  const maxBidCum = book.bids[book.bids.length - 1]?.cumulativeVolume ?? 1;
  const maxAskCum = book.asks[book.asks.length - 1]?.cumulativeVolume ?? 1;
  const totalCum  = maxBidCum + maxAskCum;
  const bidPct    = totalCum > 0 ? (maxBidCum / totalCum) * 100 : 50;
  const askPct    = 100 - bidPct;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          <BarChart2 size={13} />
          Volume Depth Profile
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-emerald-400">{fmtVol(symbol, maxBidCum)} bid</span>
          <span className="text-rose-400">{fmtVol(symbol, maxAskCum)} ask</span>
        </div>
      </div>

      {/* Cumulative depth bar */}
      <div className="h-4 rounded-full overflow-hidden flex bg-slate-900">
        <div
          className="h-full bg-gradient-to-r from-emerald-700 to-emerald-500 transition-all duration-300"
          style={{ width: `${bidPct}%` }}
        />
        <div
          className="h-full bg-gradient-to-l from-rose-700 to-rose-500 transition-all duration-300"
          style={{ width: `${askPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-600">
        <span>← Bid {bidPct.toFixed(0)}%</span>
        <span>{askPct.toFixed(0)}% Ask →</span>
      </div>

      {/* Per-level depth bars */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400/60 mb-2">Bid Depth</p>
          <div className="space-y-1">
            {book.bids.map((lvl) => {
              const w = maxBidCum > 0 ? (lvl.cumulativeVolume / maxBidCum) * 100 : 0;
              return (
                <div key={`bv-${lvl.price}`} className="flex items-center gap-2">
                  <span className="w-16 text-right font-mono text-[10px] text-slate-500">
                    {fmtPrice(symbol, lvl.price)}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500/60 transition-all duration-200"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                  <span className="w-12 text-[10px] text-emerald-400/60">
                    {fmtVol(symbol, lvl.volume)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400/60 mb-2">Ask Depth</p>
          <div className="space-y-1">
            {book.asks.map((lvl) => {
              const w = maxAskCum > 0 ? (lvl.cumulativeVolume / maxAskCum) * 100 : 0;
              return (
                <div key={`av-${lvl.price}`} className="flex items-center gap-2">
                  <span className="w-16 text-right font-mono text-[10px] text-slate-500">
                    {fmtPrice(symbol, lvl.price)}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500/60 transition-all duration-200"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                  <span className="w-12 text-[10px] text-rose-400/60">
                    {fmtVol(symbol, lvl.volume)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Order Flow Imbalance Gauge ───────────────────────────────────────────────

/**
 * Real-time order flow imbalance: ratio of total bid volume to total ask volume
 * across all visible DOM levels. > 0.5 = bid-heavy (buying pressure), < 0.5 = ask-heavy.
 * Tracks rolling 20-update history for mini sparkline.
 */
const OrderFlowImbalance = memo(function OrderFlowImbalance({
  book,
}: { symbol?: string; book: DomBook | null | undefined }) {
  const histRef = useRef<number[]>([]);
  const [hist, setHist] = useState<number[]>([]);

  const imbalance = useMemo(() => {
    if (!book || !book.bids.length || !book.asks.length) return null;
    const bidVol = book.bids.reduce((s, l) => s + l.volume, 0);
    const askVol = book.asks.reduce((s, l) => s + l.volume, 0);
    const total  = bidVol + askVol;
    return total > 0 ? bidVol / total : 0.5;
  }, [book]);

  useEffect(() => {
    if (imbalance === null) return;
    histRef.current = [imbalance, ...histRef.current].slice(0, 20);
    setHist([...histRef.current]);
  }, [imbalance]);

  if (imbalance === null) return null;

  const bidPct = imbalance * 100;
  const askPct = 100 - bidPct;

  // Sentiment: strong buy/sell > 65%
  const isBidHeavy  = imbalance > 0.65;
  const isAskHeavy  = imbalance < 0.35;

  const sentimentLabel = isBidHeavy ? "Bid Heavy" : isAskHeavy ? "Ask Heavy" : "Balanced";
  const sentimentCls   = isBidHeavy ? "text-emerald-400" : isAskHeavy ? "text-rose-400" : "text-slate-400";
  const SentIcon       = isBidHeavy ? ArrowUp : isAskHeavy ? ArrowDown : Gauge;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
          <Gauge size={13} />
          Order Flow Imbalance
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-bold ${sentimentCls}`}>
          <SentIcon size={11} />
          {sentimentLabel}
        </div>
      </div>

      {/* Main bar */}
      <div className="mb-3 h-5 overflow-hidden rounded-full bg-slate-900 flex">
        <div
          className="h-full bg-gradient-to-r from-emerald-700 to-emerald-500 transition-all duration-500"
          style={{ width: `${bidPct}%` }}
        />
        <div
          className="h-full bg-gradient-to-l from-rose-700 to-rose-500 transition-all duration-500"
          style={{ width: `${askPct}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-mono font-bold">{bidPct.toFixed(1)}%</span>
          <span className="text-slate-600">BID</span>
        </div>
        <div className="font-mono font-bold text-slate-500">
          {(imbalance * 2 - 1 >= 0 ? "+" : "")}{((imbalance * 2 - 1) * 100).toFixed(1)}pp skew
        </div>
        <div className="flex items-center gap-1.5 text-rose-400">
          <span className="text-slate-600">ASK</span>
          <span className="font-mono font-bold">{askPct.toFixed(1)}%</span>
          <div className="h-2 w-2 rounded-full bg-rose-500" />
        </div>
      </div>

      {/* Rolling history sparkline */}
      {hist.length >= 3 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700">
            Imbalance History ({hist.length} ticks)
          </p>
          <div className="flex h-8 items-end gap-px">
            {[...hist].reverse().map((v, i) => {
              const h    = Math.round(Math.abs(v - 0.5) * 200);  // 0-100%
              const bias = v > 0.5 ? "bg-emerald-500" : "bg-rose-500";
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-[1px] opacity-70 transition-all ${bias}`}
                  style={{ height: `${Math.max(h, 4)}%` }}
                  title={`${(v * 100).toFixed(1)}% bid`}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[8px] text-slate-700">
            <span>← Older</span>
            <span>Current →</span>
          </div>
        </div>
      )}

      {/* Interpretation */}
      <div className="mt-3 rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2">
        <p className="text-[9px] leading-relaxed text-slate-600">
          {isBidHeavy
            ? "Strong buy-side pressure detected. More volume resting at bid — potential upward move."
            : isAskHeavy
            ? "Strong sell-side pressure detected. More volume resting at ask — potential downward move."
            : "Balanced order book. Neither side has a clear volume advantage."}
        </p>
      </div>
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DOMDepthPage() {
  usePageTitle("DOM — Depth of Market");
  const [symbol, setSymbol]       = useState("EURUSD");
  const [wsUpdatedAt, setWsUpdatedAt] = useState<number | null>(null);
  const connected    = useMarketStore((s) => s.connected);
  const queryClient  = useQueryClient();

  // Reset WS timestamp when symbol changes
  useEffect(() => { setWsUpdatedAt(null); }, [symbol]);

  // Subscribe to live WS market data (populates market store for SpreadMonitor)
  const subscribeWs = useMarketStore((s) => s.subscribeWs);
  useEffect(() => {
    const unsub = subscribeWs();
    return unsub;
  }, [subscribeWs]);

  // WS push: merge real-time bid/ask/spread into the cached DOM book
  useEffect(() => {
    function applyQuote(q: Record<string, unknown>) {
      if (String(q.symbol) !== symbol) return;
      const now = Date.now();
      setWsUpdatedAt(now);
      queryClient.setQueryData<DomBook | null>(["dom", symbol], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          bid:       typeof q.bid === "number"       ? q.bid       : prev.bid,
          ask:       typeof q.ask === "number"       ? q.ask       : prev.ask,
          spread:    typeof q.spread === "number"    ? q.spread    : prev.spread,
          spreadBps: typeof q.spreadBps === "number" ? q.spreadBps : prev.spreadBps,
          changePct: typeof q.changePct === "number" ? q.changePct : prev.changePct,
        };
      });
    }

    // Single-symbol event
    const unsubSingle = wsClient.on("quote", (payload) => {
      applyQuote(payload as Record<string, unknown>);
    });

    // Bulk tick event (backend sends all symbols every ~1s)
    const unsubBulk = wsClient.on("market.quotes", (payload) => {
      const quotes = Array.isArray(payload) ? payload : [];
      for (const q of quotes as Record<string, unknown>[]) applyQuote(q);
    });

    return () => { unsubSingle(); unsubBulk(); };
  }, [symbol, queryClient]);

  // Initial fetch + periodic refresh for order book depth levels (structural, not tick-level)
  const { data: book, dataUpdatedAt } = useQuery<DomBook | null>({
    queryKey:        ["dom", symbol],
    queryFn:         () => MarketsAPI.getDomBook(symbol),
    refetchInterval: DOM_DEPTH_REFRESH_MS,
    staleTime:       DOM_DEPTH_REFRESH_MS / 2,
  });

  const displayTs = wsUpdatedAt ?? dataUpdatedAt ?? null;
  const updatedAt = displayTs ? new Date(displayTs).toLocaleTimeString("en-US", {
    hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  }) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Layers3 size={18} className="text-cyan-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Depth of Market</h1>
              <p className="text-[11px] text-slate-500">IGFX Internal LP — 10-level order book</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {updatedAt && (
              <span className="text-[10px] font-mono text-slate-600">{updatedAt}</span>
            )}
            <div className={[
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em]",
              connected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-slate-600/30 bg-slate-800/40 text-slate-500",
            ].join(" ")}>
              <Radio size={10} className={connected ? "animate-pulse" : ""} />
              {connected ? "Live" : "Connecting"}
            </div>
          </div>
        </div>

        {/* Symbol tabs */}
        <SymbolTabs active={symbol} onChange={setSymbol} />

        {/* Spread monitor */}
        <SpreadMonitor symbol={symbol} book={book} />

        {/* Order ladder */}
        <OrderLadder symbol={symbol} book={book} />

        {/* Order flow imbalance gauge */}
        <OrderFlowImbalance symbol={symbol} book={book} />

        {/* Volume depth profile */}
        <VolumeDepthProfile symbol={symbol} book={book} />

      </div>
    </div>
  );
}

export default DOMDepthPage;
