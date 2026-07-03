import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type Time,
} from "lightweight-charts";
import { MarketsAPI, candleLimitFor, type CandleRow } from "../../api/endpoints/markets";
import { wsClient } from "../../api/websocket";

export interface TradingChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
  indicators?: ("EMA20" | "EMA50" | "BB")[];
  className?: string;
}

// Seconds per timeframe slot — used to compute the open candle time bucket
const TF_SECONDS: Record<string, number> = {
  "1M":  60,
  "5M":  300,
  "15M": 900,
  "30M": 1800,
  "1H":  3600,
  "4H":  14400,
  "1D":  86400,
};

function toTime(ts: number): Time {
  return ts as Time;
}

/** Exponential Moving Average */
function calcEMA(data: CandleRow[], period: number): LineData<Time>[] {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result: LineData<Time>[] = [];
  let ema = data.slice(0, period).reduce((s, d) => s + d.close, 0) / period;
  result.push({ time: toTime(data[period - 1].time), value: ema });
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: toTime(data[i].time), value: ema });
  }
  return result;
}

/** Simple Moving Average helper for Bollinger Bands */
function calcSMA(data: number[], period: number, idx: number): number {
  return data.slice(idx - period + 1, idx + 1).reduce((s, v) => s + v, 0) / period;
}

interface BBResult {
  upper: LineData<Time>[];
  middle: LineData<Time>[];
  lower: LineData<Time>[];
}

function calcBB(data: CandleRow[], period = 20, stdMult = 2): BBResult {
  const closes = data.map((d) => d.close);
  const upper: LineData<Time>[] = [];
  const middle: LineData<Time>[] = [];
  const lower: LineData<Time>[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const sma = calcSMA(closes, period, i);
    const slice = closes.slice(i - period + 1, i + 1);
    const variance = slice.reduce((s, v) => s + (v - sma) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    const t = toTime(data[i].time);
    upper.push({ time: t, value: sma + stdMult * std });
    middle.push({ time: t, value: sma });
    lower.push({ time: t, value: sma - stdMult * std });
  }
  return { upper, middle, lower };
}

const DARK = {
  bg: "#030712",
  grid: "#1e293b",
  text: "#94a3b8",
  border: "#1e293b",
  bullish: "#10b981",
  bearish: "#ef4444",
  ema20: "#22d3ee",
  ema50: "#f59e0b",
  bb: "#64748b",
};

// Mutable state for the currently open (live) candle — shared between data-load
// effect and WS-tick effect via ref without triggering re-renders.
interface LiveBar {
  time:  number;
  open:  number;
  high:  number;
  low:   number;
  close: number;
}

export function TradingChart({
  symbol,
  timeframe = "1H",
  height = 420,
  indicators = ["EMA20", "EMA50"],
  className = "",
}: TradingChartProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<IChartApi | null>(null);
  const roRef          = useRef<ResizeObserver | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const liveBarRef     = useRef<LiveBar | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<Set<"EMA20" | "EMA50" | "BB">>(
    new Set(indicators)
  );

  const initChart = useCallback(() => {
    if (!containerRef.current) return;
    chartRef.current?.remove();

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: DARK.bg },
        textColor: DARK.text,
        fontSize: 11,
        fontFamily: "'Inter', 'ui-sans-serif', sans-serif",
      },
      grid: {
        vertLines: { color: DARK.grid, style: 1 },
        horzLines: { color: DARK.grid, style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.MagnetOHLC,
        vertLine: { color: "#475569", width: 1, style: 2, labelBackgroundColor: "#1e293b" },
        horzLine: { color: "#475569", width: 1, style: 2, labelBackgroundColor: "#1e293b" },
      },
      rightPriceScale: {
        borderColor: DARK.border,
        textColor: DARK.text,
        scaleMargins: { top: 0.06, bottom: 0.06 },
      },
      timeScale: {
        borderColor: DARK.border,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        chart.applyOptions({ width: e.contentRect.width });
      }
    });
    ro.observe(containerRef.current);
    roRef.current = ro;

    return chart;
  }, [height]);

  useEffect(() => {
    const chart = initChart();
    return () => {
      roRef.current?.disconnect();
      chart?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [initChart]);

  // ── Load historical candles + indicators ────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    let cancelled = false;
    setLoading(true);
    setError(null);
    liveBarRef.current = null;

    const candleSeries: ISeriesApi<"Candlestick"> = chart.addSeries(CandlestickSeries, {
      upColor: DARK.bullish,
      downColor: DARK.bearish,
      borderUpColor: DARK.bullish,
      borderDownColor: DARK.bearish,
      wickUpColor: DARK.bullish,
      wickDownColor: DARK.bearish,
    });

    const indicatorSeries: ISeriesApi<"Line">[] = [];

    MarketsAPI.getCandles(symbol, timeframe, candleLimitFor(timeframe))
      .then((rows) => {
        if (cancelled) return;

        const sorted = [...rows].sort((a, b) => a.time - b.time);

        const candleData: CandlestickData<Time>[] = sorted.map((r) => ({
          time: toTime(r.time),
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
        }));
        candleSeries.setData(candleData);

        // Seed the live bar from the last historical candle so the WS
        // subscription has a starting OHLC to update against.
        if (sorted.length > 0) {
          const last = sorted[sorted.length - 1];
          liveBarRef.current = {
            time:  last.time,
            open:  last.open,
            high:  last.high,
            low:   last.low,
            close: last.close,
          };
        }

        // Store ref so the WS effect can call .update()
        candleSeriesRef.current = candleSeries;

        if (activeIndicators.has("EMA20")) {
          const s = chart.addSeries(LineSeries, {
            color: DARK.ema20,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
            crosshairMarkerVisible: false,
            title: "EMA20",
          });
          s.setData(calcEMA(sorted, 20));
          indicatorSeries.push(s);
        }

        if (activeIndicators.has("EMA50")) {
          const s = chart.addSeries(LineSeries, {
            color: DARK.ema50,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
            crosshairMarkerVisible: false,
            title: "EMA50",
          });
          s.setData(calcEMA(sorted, 50));
          indicatorSeries.push(s);
        }

        if (activeIndicators.has("BB")) {
          const bb = calcBB(sorted);
          const bbOpts = {
            color: DARK.bb,
            lineWidth: 1 as const,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          };
          const upper = chart.addSeries(LineSeries, { ...bbOpts, title: "BB Upper" });
          const mid   = chart.addSeries(LineSeries, { ...bbOpts, lineStyle: LineStyle.Solid, title: "BB Mid" });
          const lower = chart.addSeries(LineSeries, { ...bbOpts, title: "BB Lower" });
          upper.setData(bb.upper);
          mid.setData(bb.middle);
          lower.setData(bb.lower);
          indicatorSeries.push(upper, mid, lower);
        }

        chart.timeScale().fitContent();
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load chart data");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      candleSeriesRef.current = null;
      liveBarRef.current = null;
      try {
        indicatorSeries.forEach((s) => chart.removeSeries(s));
        chart.removeSeries(candleSeries);
      } catch {
        // Chart may have been destroyed
      }
    };
  }, [symbol, timeframe, activeIndicators]);

  // ── Real-time candle update via WebSocket ───────────────────────────────────
  // Subscribes to market.quotes and market.quote (single) WS events.
  // Updates the open candle OHLC live; rolls to a new candle when the
  // current timeframe slot closes.
  useEffect(() => {
    const tfSec = TF_SECONDS[timeframe] ?? 3600;

    function applyTick(mid: number): void {
      const series = candleSeriesRef.current;
      if (!series) return;

      const nowSec = Math.floor(Date.now() / 1_000);
      const slot   = Math.floor(nowSec / tfSec) * tfSec;

      const bar = liveBarRef.current;

      if (!bar || slot > bar.time) {
        // New candle — open at previous close (or current mid if no previous)
        const open = bar?.close ?? mid;
        liveBarRef.current = { time: slot, open, high: Math.max(open, mid), low: Math.min(open, mid), close: mid };
      } else {
        // Same candle — update OHLC
        bar.high  = Math.max(bar.high,  mid);
        bar.low   = Math.min(bar.low,   mid);
        bar.close = mid;
      }

      try {
        const b = liveBarRef.current!;
        series.update({
          time:  toTime(b.time),
          open:  b.open,
          high:  b.high,
          low:   b.low,
          close: b.close,
        });
      } catch {
        // Series may be detached during symbol/timeframe switch
      }
    }

    const unsubBulk = wsClient.on("market.quotes", (data) => {
      const quotes = data as Array<{ symbol: string; mid: number; bid: number; ask: number }>;
      if (!Array.isArray(quotes)) return;
      for (const q of quotes) {
        if (q.symbol !== symbol) continue;
        const mid = q.mid ?? (q.bid != null && q.ask != null ? (q.bid + q.ask) / 2 : 0);
        if (mid > 0) applyTick(mid);
      }
    });

    const unsubSingle = wsClient.on("quote", (data) => {
      const q = data as { symbol: string; mid?: number; bid?: number; ask?: number };
      if (q?.symbol !== symbol) return;
      const mid = q.mid ?? (q.bid != null && q.ask != null ? (q.bid + q.ask) / 2 : 0);
      if (mid > 0) applyTick(mid);
    });

    return () => {
      unsubBulk();
      unsubSingle();
    };
  }, [symbol, timeframe]);

  const toggleIndicator = (ind: "EMA20" | "EMA50" | "BB") => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind);
      else next.add(ind);
      return next;
    });
  };

  return (
    <div className={["flex flex-col bg-[#030712] rounded-lg overflow-hidden border border-slate-800", className].filter(Boolean).join(" ")}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">{symbol}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{timeframe}</span>
        </div>
        <div className="flex items-center gap-1">
          {(["EMA20", "EMA50", "BB"] as const).map((ind) => {
            const color = ind === "EMA20" ? "text-cyan-400 border-cyan-400/40" : ind === "EMA50" ? "text-amber-400 border-amber-400/40" : "text-slate-400 border-slate-600";
            const active = activeIndicators.has(ind);
            return (
              <button
                key={ind}
                onClick={() => toggleIndicator(ind)}
                className={[
                  "text-[10px] px-2 py-0.5 rounded border font-mono transition-opacity",
                  color,
                  active ? "opacity-100" : "opacity-30",
                ].join(" ")}
              >
                {ind}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative" style={{ minHeight: height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#030712]/80 z-10">
            <div className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#030712]/90 z-10">
            <div className="text-center">
              <p className="text-rose-400 text-sm font-semibold">Chart unavailable</p>
              <p className="text-slate-500 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

export default TradingChart;
