"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createChart, ColorType, CrosshairMode, createSeriesMarkers, CandlestickSeries, HistogramSeries, LineSeries } from "lightweight-charts";
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
import { useChartDrawings } from "@/lib/hooks/useChartDrawings";
import ChartDrawingToolbar from "./charts/ChartDrawingToolbar";
import ChartDrawingOverlay from "./charts/ChartDrawingOverlay";

/* ── Constants ── */

type Timeframe = "1m" | "3m" | "5m" | "15m" | "1h" | "4h" | "1D" | "1W";

const TF_CONFIG: Record<Timeframe, { interval: string; limit: number }> = {
  "1m":  { interval: "1m", limit: 120 },
  "3m":  { interval: "3m", limit: 120 },
  "5m":  { interval: "5m", limit: 120 },
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

function isValidCandle(k: SoDEXKline): boolean {
  const o = parseFloat(k.o);
  const h = parseFloat(k.h);
  const l = parseFloat(k.l);
  const c = parseFloat(k.c);
  const v = parseFloat(k.v);
  if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) || isNaN(v)) return false;
  if (o <= 0 || h <= 0 || l <= 0 || c <= 0) return false;
  if (h < l) return false;
  if (v < 0) return false;
  return true;
}

function normalizeKlines(raw: SoDEXKline[]): SoDEXKline[] {
  // Sort ascending by timestamp
  const sorted = [...raw].sort((a, b) => a.t - b.t);
  // Remove duplicates (keep last occurrence per timestamp)
  const seen = new Map<number, SoDEXKline>();
  for (const k of sorted) {
    seen.set(k.t, k);
  }
  // Filter invalid candles
  return Array.from(seen.values()).filter(isValidCandle);
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
  if (tf === "1m" || tf === "3m" || tf === "5m" || tf === "15m" || tf === "1h") {
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
  tradeMode?: "paper" | "live";
  onModeChange?: (mode: "paper" | "live") => void;
}

/* ── Component ── */

export default function TradingChart({
  klines: initialKlines,
  symbol: initialSymbol = "BTC/USDC",
  currentPrice,
  liveSignals = [],
  tickerMap,
  tradeMode,
  onModeChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const markerLinesRef = useRef<IPriceLine[]>([]);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const [tf, setTf] = useState<Timeframe>("1h");
  const [pair, setPair] = useState(initialSymbol);
  const [klines, setKlines] = useState<SoDEXKline[] | null>(
    initialKlines ? normalizeKlines(initialKlines) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<{
    time: number; open: number; high: number; low: number; close: number; volume: number;
  } | null>(null);

  // Chart display toggles
  const [chartType, setChartType] = useState<"candles" | "line">("candles");
  const [showSignals, setShowSignals] = useState(true);
  const [showTradePlan, setShowTradePlan] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  const sodexSymbol = pairToSodexSymbol(pair.split("/")[0]);

  // Chart drawings
  const {
    drawings,
    activeTool,
    pending,
    hidden,
    selectTool,
    handleChartClick,
    cancelPending,
    clearAll,
    toggleHidden,
  } = useChartDrawings(pair, tf);

  // Cancel pending drawing on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelPending();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelPending]);

  // Fetch klines for selected pair + timeframe
  const fetchTfKlines = useCallback(async () => {
    if (!sodexSymbol) return;
    const config = TF_CONFIG[tf];
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchKlines(sodexSymbol, config.interval, config.limit);
      if (raw && raw.length > 0) {
        const normalized = normalizeKlines(raw);
        setKlines(normalized.length > 0 ? normalized : null);
        if (normalized.length === 0) setError("All candles were invalid or duplicate");
      } else {
        setKlines(null);
        if (raw && raw.length === 0) setError("No data available for this timeframe");
      }
    } catch (err) {
      setKlines(null);
      setError(err instanceof Error ? err.message : "Failed to fetch chart data");
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

    // Line series (for "Line" chart mode)
    const lineSeries = chart.addSeries(LineSeries, {
      color: "#00E5A8",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      crosshairMarkerBackgroundColor: "#00E5A8",
      lastValueVisible: false,
      priceLineVisible: false,
      visible: false, // hidden by default (candles mode)
    });
    lineSeriesRef.current = lineSeries;

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
      lineSeriesRef.current = null;
      markersPluginRef.current = null;
    };
  }, []);

  // Update data when klines change
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current || !klines || klines.length === 0) return;

    const candles = klines.map(klineToCandle);
    const volumes = klines.map(klineToVolume);

    // Safety: ensure ascending order (normalizeKlines should handle this, but belt-and-suspenders)
    const sortedCandles = [...candles].sort((a, b) => (a.time as number) - (b.time as number));
    candleRef.current.setData(sortedCandles);

    // Line series data (close prices)
    if (lineSeriesRef.current) {
      const lineData = klines.map((k) => ({
        time: (k.t / 1000) as Time,
        value: parseFloat(k.c),
      }));
      const sortedLineData = [...lineData].sort((a, b) => (a.time as number) - (b.time as number));
      lineSeriesRef.current.setData(sortedLineData);
    }

    // Candle vs Line mode toggle
    candleRef.current.applyOptions({ visible: chartType === "candles" });
    if (lineSeriesRef.current) {
      lineSeriesRef.current.applyOptions({ visible: chartType === "line" });
    }

    // Volume visibility
    const sortedVolumes = [...volumes].sort((a, b) => (a.time as number) - (b.time as number));
    volumeRef.current.setData(sortedVolumes);
    volumeRef.current.applyOptions({ visible: showVolume });

    // Remove old marker lines
    markerLinesRef.current.forEach((line) => {
      try { candleRef.current?.removePriceLine(line); } catch {}
    });
    markerLinesRef.current = [];

    // Add signal markers (BUY/SELL/HOLD) on chart — only when showSignals is on
    if (showSignals) {
      const latestKlineTime = klines[klines.length - 1].t / 1000;
      const markers = pairSignals
        .filter((s) => s.execution?.entry)
        .map((s) => {
          // Find closest kline to signal time (use latest kline as proxy since signals don't have exact timestamps)
          const closestKline = klines.reduce((best, k) => {
            const diff = Math.abs(k.t / 1000 - latestKlineTime);
            return diff < Math.abs(best.t / 1000 - latestKlineTime) ? k : best;
          });

          return {
            time: (closestKline.t / 1000) as Time,
            position: "belowBar" as const,
            color: s.action === "LONG" ? CHART_COLORS.buyLine : s.action === "SHORT" ? CHART_COLORS.sellLine : CHART_COLORS.holdLine,
            shape: s.action === "LONG" ? "arrowUp" as const : s.action === "SHORT" ? "arrowDown" as const : "circle" as const,
            text: s.action,
          };
        })
        .sort((a, b) => (a.time as number) - (b.time as number));

      if (markers.length > 0 && markersPluginRef.current) {
        markersPluginRef.current.setMarkers(markers);
      }
    } else if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers([]);
    }

    // Add entry / TP / SL lines for latest signal — only when showTradePlan is on
    if (showTradePlan && latestSignal?.execution) {
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
  }, [klines, pairSignals, latestSignal, showVolume, showSignals, showTradePlan, chartType]);

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
      <div className="px-4 pt-3 pb-2 flex flex-col gap-1.5 shrink-0 border-b border-border-default">
        {/* Row 1: Pair + Price + Signal badge + freshness */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-3">
            {latestSignal && (
              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                latestSignal.action === "LONG"
                  ? "bg-buy-muted text-buy"
                  : latestSignal.action === "SHORT"
                    ? "bg-sell-muted text-sell"
                    : "bg-hold-muted text-hold"
              }`}>
                {latestSignal.action} {latestSignal.confidence}%
              </span>
            )}
            {dataAge !== null && dataAge < 120_000 && (
              <span className="text-[9px] text-txt-faint flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
                Live
              </span>
            )}
            {tradeMode && onModeChange && (
              <div className="flex items-center gap-0.5 bg-inset rounded-lg p-0.5 border border-border-default">
                <button onClick={() => onModeChange("paper")} className={`text-[9px] px-2 py-1 rounded-md cursor-pointer font-semibold transition-colors ${tradeMode === "paper" ? "bg-accent/15 text-accent border border-accent/20" : "text-txt-faint hover:text-txt-muted border border-transparent"}`}>Paper</button>
                <button onClick={() => onModeChange("live")} className={`text-[9px] px-2 py-1 rounded-md cursor-pointer font-semibold transition-colors ${tradeMode === "live" ? "bg-sell/15 text-sell border border-sell/20" : "text-txt-faint hover:text-txt-muted border border-transparent"}`}>Live</button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Context line */}
        <div className="flex items-center gap-2 text-[10px] text-txt-dim">
          <span>SoDEX Klines</span>
          <span className="text-txt-faint">·</span>
          {lastKline && (
            <>
              <span>Updated {dataAge !== null ? `${Math.floor(dataAge / 1000)}s ago` : "—"}</span>
              <span className="text-txt-faint">·</span>
            </>
          )}
          {latestSignal && (
            <span>
              Latest Signal: <span className={
                latestSignal.action === "LONG" ? "text-buy" :
                latestSignal.action === "SHORT" ? "text-sell" : "text-hold"
              }>{latestSignal.action}</span>{" "}
              <span className="text-txt-muted">{latestSignal.confidence}% confidence</span>
            </span>
          )}
        </div>

        {/* Row 3: Timeframe pills + toggles */}
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

          <div className="flex items-center gap-2">
            {/* Candles | Line toggle */}
            <div className="flex items-center bg-inset rounded border border-border-default overflow-hidden">
              <button
                onClick={() => setChartType("candles")}
                className={`text-[9px] px-2 py-0.5 transition-all cursor-pointer ${
                  chartType === "candles" ? "text-accent bg-elevated" : "text-txt-dim hover:text-txt-secondary"
                }`}
              >
                Candles
              </button>
              <div className="w-px h-3 bg-border-default" />
              <button
                onClick={() => setChartType("line")}
                className={`text-[9px] px-2 py-0.5 transition-all cursor-pointer ${
                  chartType === "line" ? "text-accent bg-elevated" : "text-txt-dim hover:text-txt-secondary"
                }`}
              >
                Line
              </button>
            </div>

            {/* Separator */}
            <div className="w-px h-3 bg-border-default" />

            {/* Signals toggle */}
            <button
              onClick={() => setShowSignals((v) => !v)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                showSignals ? "text-accent bg-accent/10" : "text-txt-faint hover:text-txt-dim"
              }`}
            >
              Signals {showSignals ? "On" : "Off"}
            </button>

            {/* Trade Plan toggle */}
            <button
              onClick={() => setShowTradePlan((v) => !v)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                showTradePlan ? "text-accent bg-accent/10" : "text-txt-faint hover:text-txt-dim"
              }`}
            >
              Trade Plan {showTradePlan ? "On" : "Off"}
            </button>

            {/* Volume toggle */}
            <button
              onClick={() => setShowVolume((v) => !v)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                showVolume ? "text-accent bg-accent/10" : "text-txt-faint hover:text-txt-dim"
              }`}
            >
              Volume {showVolume ? "On" : "Off"}
            </button>
          </div>
        </div>

        {/* Row 4: Trade plan info (only when visible) */}
        {showTradePlan && latestSignal?.execution && (
          <div className="flex items-center gap-3 text-[9px] font-mono text-txt-faint">
            <span>Entry <span className="text-accent">{fmtPrice(latestSignal.execution.entry)}</span></span>
            <span>TP <span className="text-buy">{fmtPrice(latestSignal.execution.takeProfit)}</span></span>
            <span>SL <span className="text-sell">{fmtPrice(latestSignal.execution.stopLoss)}</span></span>
            <span>R:R <span className="text-txt-secondary">{latestSignal.execution.riskReward}</span></span>
          </div>
        )}
      </div>

      {/* Chart container */}
      <div className="flex-1 min-h-0 relative">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Drawing toolbar + overlay */}
        <ChartDrawingToolbar
          activeTool={activeTool}
          onSelectTool={selectTool}
          onClear={clearAll}
          onToggleHidden={toggleHidden}
          hidden={hidden}
          drawingCount={drawings.length}
          pendingFirstClick={pending.firstClick !== null}
        />
        <ChartDrawingOverlay
          chart={chartRef.current}
          series={candleRef.current}
          drawings={drawings}
          hidden={hidden}
          pendingFirstClick={pending.firstClick}
          activeTool={activeTool}
          onClick={handleChartClick}
        />

        {/* Empty / Error state overlay */}
        {!klines && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-inset border border-border-default flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-txt-dim">
                  {error ? (
                    <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
                  ) : (
                    <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>
                  )}
                </svg>
              </div>
              <div>
                <p className="text-sm text-txt-muted font-medium">
                  {error ? "Chart Error" : "No Data Available"}
                </p>
                <p className="text-xs text-txt-dim mt-1 max-w-xs">
                  {error || `SoDEX has no ${tf} klines for ${pair}. Try a different timeframe or pair.`}
                </p>
              </div>
            </div>
          </div>
        )}

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
