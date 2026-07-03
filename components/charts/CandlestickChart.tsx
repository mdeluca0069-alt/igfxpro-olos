import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
} from "lightweight-charts";
import { MarketsAPI, candleLimitFor, type CandleRow } from "../../api/endpoints/markets";

export interface CandlestickChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
  showVolume?: boolean;
  showToolbar?: boolean;
  className?: string;
}

const DARK_THEME = {
  background: "#030712",
  grid: "#1e293b",
  text: "#94a3b8",
  border: "#1e293b",
  bullish: "#10b981",
  bearish: "#ef4444",
  bullishAlpha: "rgba(16,185,129,0.4)",
  bearishAlpha: "rgba(239,68,68,0.4)",
};

function toChartTime(ts: number): Time {
  // Backend returns unix seconds; lightweight-charts v5 uses UTCTimestamp (seconds)
  return ts as Time;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 10) return price.toFixed(4);
  return price.toFixed(5);
}

export function CandlestickChart({
  symbol,
  timeframe = "15M",
  height = 400,
  showVolume = true,
  showToolbar = true,
  className = "",
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCandle, setLastCandle] = useState<CandleRow | null>(null);

  const initChart = useCallback(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: showVolume ? Math.floor(height * 0.78) : height,
      layout: {
        background: { type: ColorType.Solid, color: DARK_THEME.background },
        textColor: DARK_THEME.text,
        fontSize: 11,
        fontFamily: "'Inter', 'ui-sans-serif', sans-serif",
      },
      grid: {
        vertLines: { color: DARK_THEME.grid, style: 1 },
        horzLines: { color: DARK_THEME.grid, style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#475569", width: 1, style: 2, labelBackgroundColor: "#1e293b" },
        horzLine: { color: "#475569", width: 1, style: 2, labelBackgroundColor: "#1e293b" },
      },
      rightPriceScale: {
        borderColor: DARK_THEME.border,
        textColor: DARK_THEME.text,
        scaleMargins: { top: 0.08, bottom: showVolume ? 0.28 : 0.08 },
      },
      timeScale: {
        borderColor: DARK_THEME.border,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: DARK_THEME.bullish,
      downColor: DARK_THEME.bearish,
      borderUpColor: DARK_THEME.bullish,
      borderDownColor: DARK_THEME.bearish,
      wickUpColor: DARK_THEME.bullish,
      wickDownColor: DARK_THEME.bearish,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    if (showVolume) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });
      volumeSeriesRef.current = volSeries;
    }

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });
    ro.observe(containerRef.current);
    resizeObserverRef.current = ro;
  }, [height, showVolume]);

  useEffect(() => {
    initChart();
    return () => {
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [initChart]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    MarketsAPI.getCandles(symbol, timeframe, candleLimitFor(timeframe))
      .then((rows) => {
        if (cancelled) return;
        if (!candleSeriesRef.current) return;

        const sorted = [...rows].sort((a, b) => a.time - b.time);

        const candleData: CandlestickData<Time>[] = sorted.map((r) => ({
          time: toChartTime(r.time),
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
        }));

        candleSeriesRef.current.setData(candleData);

        if (volumeSeriesRef.current && sorted.length > 0) {
          const volData: HistogramData<Time>[] = sorted.map((r) => ({
            time: toChartTime(r.time),
            value: r.volume,
            color: r.close >= r.open ? DARK_THEME.bullishAlpha : DARK_THEME.bearishAlpha,
          }));
          volumeSeriesRef.current.setData(volData);
        }

        if (sorted.length > 0) {
          setLastCandle(sorted[sorted.length - 1]);
          chartRef.current?.timeScale().fitContent();
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load candles");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  const priceChange = lastCandle
    ? ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100
    : null;
  const isPositive = priceChange !== null && priceChange >= 0;

  return (
    <div className={["flex flex-col bg-[#030712] rounded-lg overflow-hidden border border-slate-800", className].filter(Boolean).join(" ")}>
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">{symbol}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{timeframe}</span>
          </div>
          {lastCandle && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">O <span className="text-slate-200">{formatPrice(lastCandle.open)}</span></span>
              <span className="text-slate-400">H <span className="text-emerald-400">{formatPrice(lastCandle.high)}</span></span>
              <span className="text-slate-400">L <span className="text-rose-400">{formatPrice(lastCandle.low)}</span></span>
              <span className="text-slate-400">C <span className="text-slate-200">{formatPrice(lastCandle.close)}</span></span>
              {priceChange !== null && (
                <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                  {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="relative flex-1" style={{ minHeight: height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#030712]/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span className="text-xs text-slate-400">Loading {symbol}…</span>
            </div>
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

export default CandlestickChart;
