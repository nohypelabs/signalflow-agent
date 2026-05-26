"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createChart, ColorType, CrosshairMode, createSeriesMarkers, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import type {
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickData,
  HistogramData,
  Time,
  MouseEventParams,
  LineStyle,
  ISeriesMarkersPluginApi,
} from "lightweight-charts";
import type { SoDEXKline, SoDEXTicker } from "@/lib/types/trade";
import type { Signal } from "@/lib/types/signal";
import { pairToSodexSymbol } from "@/lib/pair-map";
import { fetchKlines } from "@/lib/api/datasources";

/* ── Constants ── */

type Timeframe = "15m" | "1h" | "4h" | "1D" | "1W";

const TF_CONFIG: Record<Timeframe, { interval: string; limit: number }> = {
  "15m": { interval: "15m", limit: 96 },
  "1h":  { interval: "1h", limit: 168 },
  "4h":  { interval: "4h", limit: 180 },
  "1D":  { interval: "1d", limit: 90 },
  "1W":  { interval: "1w", limit: 52 },
};

const AVAILABLE_PAIRS = [
  "BTC/USDC", "ETH/USDC", "SOL/USDC", "AVAX/USDC",
  "LINK/USDC", "DOGE/USDC", "ADA/USDC", "XRP/USDC", "BNB/USDC",
];

const CHART_COLORS = {
  bg: "#0B1020",
  grid: "#1a2035",
  text: "#64748B",
  textDim: "#475569",
  crosshair: "#94A3B8",
  buyLine: "#00E676",
  sellLine: "#EF4444",
  holdLine: "#F59E0B",
  entryLine: "#22D3EE",
  tpLine: "#00E5A8",
  slLine: "#EF4444",
};

/* ── Helpers ── */

function fmtPrice(p: number): string {
  if (p >= 10000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p >= 100) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(5)}`;
}

function klineToCandle(k: SoDEXKline): CandlestickData<Time> {
  return {
    time: (k.t / 1000) as Time,
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
  };
}

function klineToVolume(k: SoDEXKline): HistogramData<Time> {
  const close = parseFloat(k.c);
  const open = parseFloat(k.o);
  return {
    time: (k.t / 1000) as Time,
    value: parseFloat(k.v),
    color: close >= open ? "rgba(0,230,118,0.25)" : "rgba(239,68,68,0.25)",
  };
}

function formatTooltipTime(ts: number, tf: Timeframe): string {
  const d = new Date(ts * 1000);
  if (tf === "15m" || tf === "1h") {
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  if (tf === "4h") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* ── Props ── */

interface Props {
  klines?: SoDEXKline[] | null;
  symbol?: string;
  currentPrice?: number | null;
  liveSignals?: Signal[];
  tickerMap?: Map<string, SoDEXTicker>;
}

/* ── Component ── */

export default function TradingChart({
  klines: initialKlines,
  symbol: initialSymbol = "BTC/USDC",
  currentPrice,
  liveSignals = [],
  tickerMap,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markerLinesRef = useRef<IPriceLine[]>([]);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const [tf, setTf] = useState<Timeframe>("1h");
  const [pair, setPair] = useState(initialSymbol);
  const [klines, setKlines] = useState<SoDEXKline[] | null>(initialKlines ?? null);
  const [loading, setLoading] = useState(false);
  const [hoverData, setHoverData] = useState<{
    time: number; open: number; high: number; low: number; close: number; volume: number;
  } | null>(null);

  const sodexSymbol = pairToSodexSymbol(pair.split("/")[0]);

  // Fetch klines for selected pair + timeframe
  const fetchTfKlines = useCallback(async () => {
    if (!sodexSymbol) return;
    const config = TF_CONFIG[tf];
    setLoading(true);
    try {
      const data = await fetchKlines(sodexSymbol, config.interval, config.limit);
      if (data) data.sort((a, b) => a.t - b.t);
      setKlines(data);
    } catch {
      setKlines(null);
    } finally {
      setLoading(false);
    }
  }, [sodexSymbol, tf]);

  useEffect(() => { fetchTfKlines(); }, [fetchTfKlines]);

  // Get signals for current pair (memoized to avoid infinite re-render)
  const pairSignals = useMemo(() => {
    const base = pair.split("/")[0];
    return liveSignals.filter((s) => s.pair.startsWith(base));
  }, [liveSignals, pair]);

  // Get the latest signal for entry/SL/TP lines
  const latestSignal = useMemo(() => pairSignals[0] ?? null, [pairSignals]);

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.bg },
        textColor: CHART_COLORS.text,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_COLORS.crosshair,
          width: 1,
          style: 2 as LineStyle,
          labelBackgroundColor: "#1E293B",
        },
        horzLine: {
          color: CHART_COLORS.crosshair,
          width: 1,
          style: 2 as LineStyle,
          labelBackgroundColor: "#1E293B",
        },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.grid,
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: CHART_COLORS.grid,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00E676",
      downColor: "#EF4444",
      borderUpColor: "#00E676",
      borderDownColor: "#EF4444",
      wickUpColor: "#00E676",
      wickDownColor: "#EF4444",
    });
    candleRef.current = candleSeries;

    // Markers plugin
    markersPluginRef.current = createSeriesMarkers(candleSeries, []);

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeRef.current = volumeSeries;

    // Crosshair handler
    chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
      if (!param.time || !param.point) {
        setHoverData(null);
        return;
      }
      const candle = param.seriesData.get(candleSeries) as CandlestickData<Time> | undefined;
      const vol = param.seriesData.get(volumeSeries) as HistogramData<Time> | undefined;
      if (candle) {
        setHoverData({
          time: param.time as number,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: vol?.value ?? 0,
        });
      }
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      markersPluginRef.current = null;
    };
  }, []);

  // Update data when klines change
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current || !klines || klines.length === 0) return;

    const candles = klines.map(klineToCandle);
    const volumes = klines.map(klineToVolume);

    candleRef.current.setData(candles);
    volumeRef.current.setData(volumes);

    // Remove old marker lines
    markerLinesRef.current.forEach((line) => {
      try { candleRef.current?.removePriceLine(line); } catch {}
    });
    markerLinesRef.current = [];

    // Add signal markers (BUY/SELL/HOLD) on chart
    const markers = pairSignals
      .filter((s) => s.execution?.entry)
      .map((s) => {
        // Find closest kline to signal time
        const signalTime = Date.now() / 1000; // signals don't have exact timestamp, use latest
        const closestKline = klines.reduce((best, k) => {
          const diff = Math.abs(k.t / 1000 - signalTime);
          return diff < Math.abs(best.t / 1000 - signalTime) ? k : best;
        });

        return {
          time: (closestKline.t / 1000) as Time,
          position: "belowBar" as const,
          color: s.action === "BUY" ? CHART_COLORS.buyLine : s.action === "SELL" ? CHART_COLORS.sellLine : CHART_COLORS.holdLine,
          shape: s.action === "BUY" ? "arrowUp" as const : s.action === "SELL" ? "arrowDown" as const : "circle" as const,
          text: s.action,
        };
      })
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (markers.length > 0 && markersPluginRef.current) {
      markersPluginRef.current.setMarkers(markers);
    }

    // Add entry / TP / SL lines for latest signal
    if (latestSignal?.execution) {
      const ex = latestSignal.execution;

      if (ex.entry > 0 && candleRef.current) {
        const line = candleRef.current.createPriceLine({
          price: ex.entry,
          color: CHART_COLORS.entryLine,
          lineWidth: 1,
          lineStyle: 2 as LineStyle,
          axisLabelVisible: true,
          title: "Entry",
        });
        markerLinesRef.current.push(line);
      }

      if (ex.takeProfit > 0 && candleRef.current) {
        const line = candleRef.current.createPriceLine({
          price: ex.takeProfit,
          color: CHART_COLORS.tpLine,
          lineWidth: 1,
          lineStyle: 2 as LineStyle,
          axisLabelVisible: true,
          title: "TP",
        });
        markerLinesRef.current.push(line);
      }

      if (ex.stopLoss > 0 && candleRef.current) {
        const line = candleRef.current.createPriceLine({
          price: ex.stopLoss,
          color: CHART_COLORS.slLine,
          lineWidth: 1,
          lineStyle: 2 as LineStyle,
          axisLabelVisible: true,
          title: "SL",
        });
        markerLinesRef.current.push(line);
      }
    }

    // Fit content
    chartRef.current?.timeScale().fitContent();
  }, [klines, pairSignals, latestSignal]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !chartRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chartRef.current?.applyOptions({ width, height });
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Current ticker for selected pair
  const currentTicker = tickerMap?.get(sodexSymbol);
  const displayPrice = currentTicker
    ? parseFloat(currentTicker.lastPx)
    : currentPrice;
  const displayChange = currentTicker?.changePct;

  // Data freshness
  const lastKline = klines?.[klines.length - 1];
  const dataAge = lastKline ? Date.now() - lastKline.t : null;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-card border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex flex-col gap-2 shrink-0 border-b border-border-default">
        <div className="flex items-center justify-between">
          {/* Left: pair selector + price */}
          <div className="flex items-center gap-3">
            {/* Pair selector */}
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="bg-elevated text-txt-primary text-sm font-semibold font-mono px-2 py-1 rounded border border-border-default cursor-pointer focus:outline-none focus:border-accent/50 appearance-none pr-6"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2364748B' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              {AVAILABLE_PAIRS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Current price */}
            {displayPrice != null && (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold font-mono text-txt-primary tabular-nums">
                  {fmtPrice(displayPrice)}
                </span>
                {displayChange !== undefined && (
                  <span className={`text-xs font-mono font-semibold tabular-nums ${displayChange >= 0 ? "text-buy" : "text-sell"}`}>
                    {displayChange >= 0 ? "+" : ""}{displayChange.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: timeframe + freshness */}
          <div className="flex items-center gap-3">
            {/* Signal badge */}
            {latestSignal && (
              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                latestSignal.action === "BUY"
                  ? "bg-buy-muted text-buy"
                  : latestSignal.action === "SELL"
                    ? "bg-sell-muted text-sell"
                    : "bg-hold-muted text-hold"
              }`}>
                {latestSignal.action} {latestSignal.confidence}%
              </span>
            )}

            {/* Data freshness */}
            {dataAge !== null && dataAge < 120_000 && (
              <span className="text-[9px] text-txt-faint flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Timeframe pills + signal info row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {(Object.keys(TF_CONFIG) as Timeframe[]).map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded transition-all cursor-pointer tracking-wide ${
                  tf === t
                    ? "text-txt-primary bg-elevated shadow-sm border border-border-default"
                    : "text-txt-dim hover:text-txt-secondary hover:bg-inset/60"
                }`}
              >
                {t}
              </button>
            ))}
            {loading && (
              <span className="ml-2 text-[10px] text-accent animate-pulse">loading</span>
            )}
          </div>

          {/* Latest signal info */}
          {latestSignal?.execution && (
            <div className="flex items-center gap-3 text-[9px] font-mono text-txt-faint">
              <span>Entry <span className="text-accent">{fmtPrice(latestSignal.execution.entry)}</span></span>
              <span>TP <span className="text-buy">{fmtPrice(latestSignal.execution.takeProfit)}</span></span>
              <span>SL <span className="text-sell">{fmtPrice(latestSignal.execution.stopLoss)}</span></span>
              <span>R:R <span className="text-txt-secondary">{latestSignal.execution.riskReward}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div className="flex-1 min-h-0 relative">
        <div ref={containerRef} className="absolute inset-0" />

        {/* OHLCV tooltip overlay */}
        {hoverData && (
          <div className="absolute top-2 left-3 flex items-center gap-3 text-[10px] font-mono z-10 pointer-events-none">
            <span className="text-txt-faint">{formatTooltipTime(hoverData.time, tf)}</span>
            <span className="text-txt-faint">O <span className="text-txt-secondary">{fmtPrice(hoverData.open)}</span></span>
            <span className="text-txt-faint">H <span className="text-buy">{fmtPrice(hoverData.high)}</span></span>
            <span className="text-txt-faint">L <span className="text-sell">{fmtPrice(hoverData.low)}</span></span>
            <span className="text-txt-faint">C <span className="text-txt-primary">{fmtPrice(hoverData.close)}</span></span>
            <span className="text-txt-faint">V <span className="text-txt-secondary">{hoverData.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
