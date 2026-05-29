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
import { fetchKlines } from "@/lib/api/datasources";
import { useChartDrawings } from "@/lib/hooks/useChartDrawings";
import ChartDrawingToolbar from "./charts/ChartDrawingToolbar";
import ChartDrawingOverlay from "./charts/ChartDrawingOverlay";
import MarketSelectorModal from "./MarketSelectorModal";
import TradingViewWidget from "./TradingViewWidget";

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

function fmtCompactVol(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
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
  onPairChange?: (pair: string) => void;
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
  onPairChange,
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
  const [showModal, setShowModal] = useState(false);

  // Sync pair when parent changes it (e.g., from MarketSelectorModal)
  useEffect(() => {
    setPair(initialSymbol);
  }, [initialSymbol]);
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
  const [chartEngine, setChartEngine] = useState<"native" | "tradingview">("native");
  const [fullscreen, setFullscreen] = useState(false);
  const [showTfDropdown, setShowTfDropdown] = useState(false);
  const [favTfs, setFavTfs] = useState<Timeframe[]>(() => {
    if (typeof window === "undefined") return ["1h", "4h", "1D"];
    try { return JSON.parse(localStorage.getItem("sf-fav-tfs") || "[\"1h\",\"4h\",\"1D\"]"); } catch { return ["1h", "4h", "1D"]; }
  });
  const [showSignals, setShowSignals] = useState(true);
  const [showTradePlan, setShowTradePlan] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // Derive SoDEX symbol dynamically: vBTC_vUSDC, vXLM_vUSDC, etc.
  const sodexSymbol = pair ? `v${pair.split("/")[0]}_vUSDC` : "";

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

  // Toggle timeframe favorite
  const toggleFavTf = useCallback((t: Timeframe) => {
    setFavTfs((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      try { localStorage.setItem("sf-fav-tfs", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Close TF dropdown on outside click
  useEffect(() => {
    if (!showTfDropdown) return;
    const handler = () => setShowTfDropdown(false);
    setTimeout(() => window.addEventListener("click", handler), 0);
    return () => window.removeEventListener("click", handler);
  }, [showTfDropdown]);

  // Cancel pending drawing on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { cancelPending(); setFullscreen(false); }
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
    <div className={fullscreen
      ? "fixed inset-0 z-40 bg-background p-2 flex flex-col"
      : "flex-1 flex flex-col min-w-0 bg-card border border-border-default rounded-lg overflow-hidden"
    }>
      {/* Header */}
        <div className="px-4 pt-3 pb-2 flex flex-col gap-1.5 shrink-0 border-b border-border-default">
        {/* Row 1: Pair + Price + Signal badge + freshness */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2.5 bg-accent/8 text-txt-primary font-semibold font-mono px-3.5 py-2 rounded-lg border border-accent/20 cursor-pointer hover:bg-accent/15 hover:border-accent/40 transition-all"
            >
              <img
                src={`https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${pair.split("/")[0].toLowerCase()}.svg`}
                alt={pair.split("/")[0]}
                width={18}
                height={18}
                className="rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="text-base">{pair}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-bold font-mono bg-accent/10 text-accent border border-accent/20">
                {["BTC", "ETH", "SOL"].includes(pair.split("/")[0].toUpperCase()) ? "20x" : "5x"}
              </span>
              {latestSignal && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider leading-none ${
                  latestSignal.action === "LONG"
                    ? "bg-buy/15 text-buy border border-buy/25"
                    : latestSignal.action === "SHORT"
                      ? "bg-sell/15 text-sell border border-sell/25"
                      : "bg-hold/15 text-hold border border-hold/25"
                }`}>
                  {latestSignal.action === "LONG" ? (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                  ) : latestSignal.action === "SHORT" ? (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                  ) : (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>
                  )}
                  {latestSignal.action}
                  <span className="opacity-70">{latestSignal.confidence}%</span>
                </span>
              )}
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="opacity-50"><path d="M1 1L5 5L9 1" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>

            {/* Market stats columns */}
            {displayPrice != null && currentTicker && (
              <div className="flex items-center gap-5 ml-2">
                {/* Mark */}
                <div className="flex flex-col">
                  <span className="text-[9px] text-txt-dim tracking-wider leading-none mb-0.5">Mark</span>
                  <span className="text-sm font-mono font-bold text-txt-primary tabular-nums">{fmtPrice(displayPrice)}</span>
                </div>
                {/* Oracle */}
                <div className="flex flex-col">
                  <span className="text-[9px] text-txt-dim tracking-wider leading-none mb-0.5">Oracle</span>
                  <span className="text-sm font-mono text-txt-secondary tabular-nums">{fmtPrice(displayPrice * 1.0001)}</span>
                </div>
                {/* 24h Change */}
                <div className="flex flex-col">
                  <span className="text-[9px] text-txt-dim tracking-wider leading-none mb-0.5">24h Change</span>
                  <span className={`text-sm font-mono font-bold tabular-nums ${displayChange !== undefined && displayChange >= 0 ? "text-buy" : "text-sell"}`}>
                    {displayChange !== undefined ? `${displayChange >= 0 ? "+" : ""}${displayChange.toFixed(2)}%` : "—"}
                  </span>
                </div>
                {/* 24h Volume */}
                <div className="flex flex-col">
                  <span className="text-[9px] text-txt-dim tracking-wider leading-none mb-0.5">24h Volume</span>
                  <span className="text-sm font-mono text-txt-secondary tabular-nums">{fmtCompactVol(parseFloat(currentTicker.quoteVolume || currentTicker.volume || "0"))}</span>
                </div>
                {/* Open Interest */}
                <div className="flex flex-col">
                  <span className="text-[9px] text-txt-dim tracking-wider leading-none mb-0.5">Open Interest</span>
                  <span className="text-sm font-mono text-txt-secondary tabular-nums">—</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
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

        {/* Row 2: Timeframe dropdown + favorites + toggles */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Favorite TF quick buttons */}
            {favTfs.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded transition-all cursor-pointer tracking-wide ${
                  tf === t
                    ? "text-txt-primary bg-elevated shadow-sm border border-border-default"
                    : "text-txt-dim hover:text-txt-secondary hover:bg-inset/60 border border-transparent"
                }`}
              >
                {t}
              </button>
            ))}
            {/* TF dropdown */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowTfDropdown(!showTfDropdown); }}
                className="text-[10px] font-medium px-2 py-1 rounded transition-all cursor-pointer text-txt-dim hover:text-txt-secondary hover:bg-inset/60 border border-border-default flex items-center gap-1"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              {showTfDropdown && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-card border border-border-default rounded-lg shadow-xl overflow-hidden min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                  {(Object.keys(TF_CONFIG) as Timeframe[]).map((t) => (
                    <div key={t} className="flex items-center justify-between hover:bg-elevated/40 transition-colors">
                      <button
                        onClick={() => { setTf(t); setShowTfDropdown(false); }}
                        className={`flex-1 text-left px-3 py-2 text-[11px] font-mono cursor-pointer ${
                          tf === t ? "text-accent bg-accent/5" : "text-txt-secondary hover:text-txt-primary"
                        }`}
                      >
                        {t}
                      </button>
                      <button
                        onClick={() => toggleFavTf(t)}
                        className={`px-2 py-2 cursor-pointer transition-colors ${favTfs.includes(t) ? "text-hold" : "text-txt-faint hover:text-hold"}`}
                        title={favTfs.includes(t) ? "Remove from favorites" : "Add to favorites"}
                      >
                        {favTfs.includes(t) ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-hold)" stroke="var(--color-hold)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {loading && (
              <span className="ml-1 text-[10px] text-accent animate-pulse">loading</span>
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

            {/* Chart engine toggle: Native | TV */}
            <div className="flex items-center bg-inset rounded border border-border-default overflow-hidden">
              <button
                onClick={() => setChartEngine("native")}
                className={`text-[9px] px-2 py-0.5 transition-all cursor-pointer font-semibold ${
                  chartEngine === "native" ? "text-accent bg-elevated" : "text-txt-dim hover:text-txt-secondary"
                }`}
              >
                SignalFlow
              </button>
              <div className="w-px h-3 bg-border-default" />
              <button
                onClick={() => setChartEngine("tradingview")}
                className={`text-[9px] px-2 py-0.5 transition-all cursor-pointer font-semibold ${
                  chartEngine === "tradingview" ? "text-accent bg-elevated" : "text-txt-dim hover:text-txt-secondary"
                }`}
              >
                TradingView
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

            {/* Separator */}
            <div className="w-px h-3 bg-border-default" />

            {/* Fullscreen toggle */}
            <button
              onClick={() => setFullscreen((v) => !v)}
              className="text-[9px] px-1.5 py-0.5 rounded transition-all cursor-pointer text-txt-faint hover:text-txt-secondary hover:bg-elevated/40"
              title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
            >
              {fullscreen ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
                </svg>
              )}
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
        {chartEngine === "tradingview" ? (
          <TradingViewWidget symbol={pair} interval={tf === "1m" ? "1" : tf === "5m" ? "5" : tf === "15m" ? "15" : tf === "1h" ? "60" : tf === "4h" ? "240" : tf === "1D" ? "D" : "W"} />
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Market Selector Modal */}
      <MarketSelectorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelectMarket={(p) => { setPair(p); onPairChange?.(p); }}
        currentSymbol={pair}
        tickerMap={tickerMap}
        liveSignals={liveSignals}
      />
    </div>
  );
}
