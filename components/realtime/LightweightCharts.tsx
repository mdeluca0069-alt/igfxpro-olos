import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type CandlestickData,
  type LineData,
  type Time,
  type LogicalRange,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import { getClientEnv } from "../../shared/config/clientEnv";
import { tokenVault } from "../../shared/lib/tokenVault";
import { useMarketStore } from "../../store/market.store";

export type Timeframe = "1M" | "5M" | "15M" | "1H" | "4H" | "1D";

const TF_SECONDS: Record<Timeframe, number> = {
  "1M":  60,
  "5M":  300,
  "15M": 900,
  "1H":  3600,
  "4H":  14400,
  "1D":  86400,
};

export interface OHLCVBar {
  time:   number;   // Unix seconds
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

// Candle counts that give ~5 years of history per timeframe
const CANDLE_LIMIT: Record<string, number> = {
  "1M":  1440,   // 1 day
  "5M":  2016,   // 1 week
  "15M": 6720,   // ~7 weeks
  "30M": 8760,   // ~6 months
  "1H":  8760,   // 1 year
  "4H":  10950,  // 5 years
  "1D":  1825,   // 5 years
};

async function fetchOHLCV(symbol: string, timeframe: string): Promise<OHLCVBar[]> {
  const env = getClientEnv();
  const token = tokenVault.getAccessToken();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;

  const limit = CANDLE_LIMIT[timeframe] ?? 1000;
  const res = await fetch(
    `${env.API_BASE_URL}/api/v1/candles/${encodeURIComponent(symbol)}/${timeframe}?limit=${limit}`,
    { headers }
  );

  if (!res.ok) throw new Error(`OHLCV fetch failed: HTTP ${res.status}`);
  return (await res.json()) as OHLCVBar[];
}

// ─── Chart theme ───────────────────────────────────────────────────────────────

const THEME = {
  bg:       "#05070d",
  bgPane:   "#080c18",
  grid:     "#1e293b",
  text:     "#94a3b8",
  border:   "#334155",
  up:       "#22c55e",
  down:     "#ef4444",
  upBorder: "#16a34a",
  dnBorder: "#dc2626",
  volume:   "#22d3ee33",
  ma20:     "#22d3ee",
  ma50:     "#f59e0b",
};

// ─── Signal overlay type (from OLOS signal store) ─────────────────────────────

export interface SignalMarker {
  time:       number;
  side:       "BUY" | "SELL";
  price:      number;
  stopLoss:   number;
  takeProfit: number;
  confidence: number;
}

// ─── Crosshair / range sync handle ────────────────────────────────────────────

/** Imperative handle for zero-rerender crosshair + time-range sync across panels */
export interface ChartHandle {
  syncCrosshair(time: Time | null): void;
  syncLogicalRange(range: LogicalRange | null): void;
}

// ─── Main trading chart ────────────────────────────────────────────────────────

export interface TradingChartProps {
  symbol:                string;
  timeframe:             Timeframe;
  height?:               number;
  signalMarkers?:        SignalMarker[];
  showVolume?:           boolean;
  showMA?:               boolean;
  /** Called when THIS chart's crosshair moves (source chart only, not when synced from outside) */
  onCrosshairMove?:      (time: Time | null, price: number | null) => void;
  /** Called when THIS chart's visible logical range changes (pan/zoom) */
  onLogicalRangeChange?: (range: LogicalRange | null) => void;
  /** Mutable ref the chart populates with imperative sync methods on mount */
  handleRef?:            React.MutableRefObject<ChartHandle | null>;
}

export function TradingChart({
  symbol,
  timeframe,
  height = 420,
  signalMarkers = [],
  showVolume = true,
  showMA = true,
  onCrosshairMove,
  onLogicalRangeChange,
  handleRef,
}: TradingChartProps) {
  const containerRef        = useRef<HTMLDivElement>(null);
  const chartRef            = useRef<IChartApi | null>(null);
  const candleRef           = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef           = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma20Ref             = useRef<ISeriesApi<"Line"> | null>(null);
  const ma50Ref             = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef          = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const isSyncingCrosshair  = useRef(false);
  const isSyncingRange      = useRef(false);
  const qc = useQueryClient();

  // Subscribe to live quote for real-time last-bar update
  const liveQuote = useMarketStore((s) => s.quotes[symbol]);

  const { data: bars, isLoading, error } = useQuery<OHLCVBar[]>({
    queryKey: ["ohlcv", symbol, timeframe],
    queryFn:  () => fetchOHLCV(symbol, timeframe),
    staleTime: timeframe === "1M" ? 30_000 : timeframe === "5M" ? 60_000 : 5 * 60_000,
    refetchInterval: timeframe === "1M" ? 60_000 : timeframe === "5M" ? 5 * 60_000 : 15 * 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  // Build moving average data from bar closes
  const buildMA = useCallback((data: OHLCVBar[], period: number): LineData[] => {
    const result: LineData[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, b) => acc + b.close, 0);
      result.push({ time: data[i].time as Time, value: sum / period });
    }
    return result;
  }, []);

  // ─── Create chart on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout:    { background: { type: ColorType.Solid, color: THEME.bg }, textColor: THEME.text },
      grid:      { horzLines: { color: THEME.grid }, vertLines: { color: THEME.grid } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: timeframe === "1M" },
      rightPriceScale: { borderColor: THEME.border },
      width:  el.clientWidth,
      height,
    });
    chartRef.current = chart;

    // Candlestick series
    const candles = chart.addSeries(CandlestickSeries, {
      upColor:        THEME.up,
      downColor:      THEME.down,
      borderUpColor:  THEME.upBorder,
      borderDownColor: THEME.dnBorder,
      wickUpColor:    THEME.up,
      wickDownColor:  THEME.down,
    });
    candleRef.current  = candles;
    markersRef.current = createSeriesMarkers(candles, []);

    // Volume histogram (overlay, 20% of chart height)
    if (showVolume) {
      const vol = chart.addSeries(HistogramSeries, {
        color:   THEME.volume,
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, borderVisible: false });
      volumeRef.current = vol;
    }

    // MA lines
    if (showMA) {
      const ma20 = chart.addSeries(LineSeries, { color: THEME.ma20, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const ma50 = chart.addSeries(LineSeries, { color: THEME.ma50, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      ma20Ref.current = ma20;
      ma50Ref.current = ma50;
    }

    // Crosshair move — emit only when this chart is the source (not during external sync)
    chart.subscribeCrosshairMove((param) => {
      if (isSyncingCrosshair.current) return;
      if (onCrosshairMove) {
        const price = param.point
          ? (param.seriesData.get(candles) as CandlestickData | undefined)?.close ?? null
          : null;
        onCrosshairMove(param.time ?? null, price);
      }
    });

    // Logical range change (pan / zoom) — emit only when this chart is the source
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!isSyncingRange.current && onLogicalRangeChange) {
        onLogicalRangeChange(range);
      }
    });

    // Populate imperative handle so parent can drive sync into this chart
    if (handleRef) {
      handleRef.current = {
        syncCrosshair: (time) => {
          if (!chartRef.current) return;
          isSyncingCrosshair.current = true;
          if (time === null) {
            chartRef.current.clearCrosshairPosition();
          } else if (candleRef.current) {
            chartRef.current.setCrosshairPosition(0, time, candleRef.current);
          }
          requestAnimationFrame(() => { isSyncingCrosshair.current = false; });
        },
        syncLogicalRange: (range) => {
          if (!range || !chartRef.current) return;
          isSyncingRange.current = true;
          try { chartRef.current.timeScale().setVisibleLogicalRange(range); } catch { /* out-of-range guard */ }
          requestAnimationFrame(() => { isSyncingRange.current = false; });
        },
      };
    }

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (el && chartRef.current) {
        chartRef.current.applyOptions({ width: el.clientWidth });
      }
    });
    ro.observe(el);

    return () => {
      if (handleRef) handleRef.current = null;
      ro.disconnect();
      chart.remove();
      chartRef.current   = null;
      candleRef.current  = null;
      volumeRef.current  = null;
      ma20Ref.current    = null;
      ma50Ref.current    = null;
      markersRef.current = null;
    };
  }, [height, showVolume, showMA, timeframe, onCrosshairMove, onLogicalRangeChange, handleRef]);

  // ─── Load bar data into series ──────────────────────────────────────────────
  useEffect(() => {
    if (!bars || !candleRef.current) return;

    // LightweightCharts v5 requires data strictly sorted ASC by time.
    // Sort + deduplicate (keep last entry per timestamp) before calling setData.
    const seen = new Map<number, OHLCVBar>();
    for (const b of bars) seen.set(b.time, b);
    const sorted = Array.from(seen.values()).sort((a, b) => a.time - b.time);

    const candleData: CandlestickData[] = sorted.map((b) => ({
      time:  b.time as Time,
      open:  b.open,
      high:  b.high,
      low:   b.low,
      close: b.close,
    }));
    candleRef.current.setData(candleData);

    if (volumeRef.current) {
      const volData = sorted.map((b) => ({
        time:  b.time as Time,
        value: b.volume,
        color: b.close >= b.open ? THEME.up + "55" : THEME.down + "55",
      }));
      volumeRef.current.setData(volData);
    }

    if (ma20Ref.current) ma20Ref.current.setData(buildMA(sorted, 20));
    if (ma50Ref.current) ma50Ref.current.setData(buildMA(sorted, 50));

    chartRef.current?.timeScale().fitContent();
  }, [bars, buildMA]);

  // ─── Real-time last-bar update from live quote ──────────────────────────────
  useEffect(() => {
    if (!liveQuote || !candleRef.current || !bars?.length) return;

    const nowSec      = Math.floor(Date.now() / 1000);
    const intervalSec = TF_SECONDS[timeframe];
    const currentSlot = Math.floor(nowSec / intervalSec) * intervalSec;
    const lastBar     = bars[bars.length - 1];

    if (currentSlot > lastBar.time) {
      // Time boundary crossed — open a new candle using the previous close as open.
      // LightweightCharts.update() with a future time appends the new bar automatically.
      candleRef.current.update({
        time:  currentSlot as Time,
        open:  lastBar.close,
        high:  Math.max(lastBar.close, liveQuote.ask),
        low:   Math.min(lastBar.close, liveQuote.bid),
        close: liveQuote.mid,
      });
      if (volumeRef.current) {
        volumeRef.current.update({
          time:  currentSlot as Time,
          value: 0,
          color: liveQuote.mid >= lastBar.close ? THEME.up + "55" : THEME.down + "55",
        });
      }
    } else {
      // Still within the same candle period — update high/low/close in place.
      candleRef.current.update({
        time:  lastBar.time as Time,
        open:  lastBar.open,
        high:  Math.max(lastBar.high, liveQuote.ask),
        low:   Math.min(lastBar.low,  liveQuote.bid),
        close: liveQuote.mid,
      });
    }
  }, [liveQuote, bars, timeframe]);

  // ─── Signal markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.setMarkers(
      signalMarkers.map((m) => ({
        time:     m.time as Time,
        position: m.side === "BUY" ? "belowBar" : "aboveBar",
        color:    m.side === "BUY" ? THEME.up : THEME.down,
        shape:    m.side === "BUY" ? "arrowUp" : "arrowDown",
        text:     `OLOS ${m.side} ${Math.round(m.confidence)}%`,
      }))
    );
  }, [signalMarkers]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full" style={{ height }}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#05070d]/80">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            Loading {symbol} {timeframe}…
          </div>
        </div>
      )}
      {/* No data yet (backend started but candles not seeded yet) */}
      {!isLoading && !error && bars !== undefined && bars.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#05070d]/70 text-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span className="text-slate-400">Generazione candele in corso…</span>
          <span className="text-xs text-slate-600">Il server sta accumulando tick dal feed di mercato.</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#05070d]/90 text-sm">
          <span className="text-rose-400 font-semibold">⚠ Dati grafico non disponibili</span>
          <span className="text-xs text-slate-500 font-mono">
            {error instanceof Error ? error.message : "Backend non raggiungibile"}
          </span>
          <span className="text-xs text-slate-600 text-center max-w-xs">
            {(error instanceof Error && error.message.includes("404"))
              ? "Il backend non ha questa route registrata. Riavvia il server backend."
              : "Connettiti al backend per visualizzare lo storico prezzi reale."}
          </span>
          <button
            type="button"
            onClick={() => void qc.invalidateQueries({ queryKey: ["ohlcv", symbol, timeframe] })}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            ↺ Riprova
          </button>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

// Re-export old name for backward compatibility
export { TradingChart as ProfessionalChart };
