"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createChart, ColorType, CrosshairMode, createSeriesMarkers, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries } from "lightweight-charts";
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
  AreaData,
} from "lightweight-charts";
import type { SoDEXKline, SoDEXTicker } from "@/lib/types/trade";
import type { Signal } from "@/lib/types/signal";
import { fetchKlines } from "@/lib/api/datasources";
import { useChartDrawings } from "@/lib/hooks/useChartDrawings";
import { getCoinIcon } from "@/lib/coin-icons";
import { useFundingRate } from "@/lib/hooks/useFundingRate";
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
  preferredTimeframe?: Timeframe;
  compact?: boolean;
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
  preferredTimeframe,
  compact = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const markerLinesRef = useRef<IPriceLine[]>([]);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const [tf, setTf] = useState<Timeframe>(preferredTimeframe ?? "1h");
  const [pair, setPair] = useState(initialSymbol);
  const [showModal, setShowModal] = useState(false);

  // Apply the active Trade Profile's anchor timeframe when the profile changes.
  // Manual timeframe buttons remain fully available afterward.
  useEffect(() => {
    if (preferredTimeframe) setTf(preferredTimeframe);
  }, [preferredTimeframe]);

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
  const [chartType, setChartType] = useState<"area" | "candles" | "line">("area");
  const [chartEngine, setChartEngine] = useState<"native" | "tradingview">("native");
  const [fullscreen, setFullscreen] = useState(false);
  const [showTfDropdown, setShowTfDropdown] = useState(false);
  const [showCompactControls, setShowCompactControls] = useState(false);

  const [favTfs, setFavTfs] = useState<Timeframe[]>(() => {
    if (typeof window === "undefined") return ["1h", "4h", "1D"];
    try { return JSON.parse(localStorage.getItem("sf-fav-tfs") || "[\"1h\",\"4h\",\"1D\"]"); } catch { return ["1h", "4h", "1D"]; }
  });

  // Funding rate for current pair
  const { data: fundingData } = useFundingRate(pair);
  // Derived
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
    if (!showTfDropdown && !showCompactControls) return;
    const handler = () => {
      setShowTfDropdown(false);
      setShowCompactControls(false);
    };
    setTimeout(() => window.addEventListener("click", handler), 0);
    return () => window.removeEventListener("click", handler);
  }, [showTfDropdown, showCompactControls]);

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
      visible: false,
    });
    lineSeriesRef.current = lineSeries;

    // Area series (default "Area" chart mode)
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#00E5A8",
      lineWidth: 2,
      topColor: "rgba(0, 229, 168, 0.25)",
      bottomColor: "rgba(0, 229, 168, 0.02)",
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: "#00E5A8",
      crosshairMarkerBorderColor: "#0B1020",
      lastValueVisible: false,
      priceLineVisible: false,
      visible: true, // visible by default (area mode)
    });
    areaSeriesRef.current = areaSeries;

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
      areaSeriesRef.current = null;
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
    const lineData = klines.map((k) => ({
      time: (k.t / 1000) as Time,
      value: parseFloat(k.c),
    }));
    const sortedLineData = [...lineData].sort((a, b) => (a.time as number) - (b.time as number));
    if (lineSeriesRef.current) {
      lineSeriesRef.current.setData(sortedLineData);
    }

    // Area series data (close prices, same as line)
    if (areaSeriesRef.current) {
      areaSeriesRef.current.setData(sortedLineData as AreaData<Time>[]);
    }

    // Chart type visibility toggle
    candleRef.current.applyOptions({ visible: chartType === "candles" });
    if (lineSeriesRef.current) {
      lineSeriesRef.current.applyOptions({ visible: chartType === "line" });
    }
    if (areaSeriesRef.current) {
      areaSeriesRef.current.applyOptions({ visible: chartType === "area" });
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
      : "h-full w-full flex flex-col min-w-0 bg-card border border-border-default rounded-lg overflow-hidden"
    }>
      {/* Header — 2 rows */}
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-1.5 shrink-0 border-b border-border-default">
        {/* Row 1: Pair + Price + Signal */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setShowModal(true)}
              className="group flex items-center gap-2 min-w-0 rounded-lg border border-border-default bg-inset/40 px-2 py-1 text-txt-primary hover:border-border-muted hover:bg-elevated/25 transition-colors cursor-pointer"
            >
              <div className="relative shrink-0">
                {(() => {
                  const base = pair.split("/")[0];
                  const icon = getCoinIcon(base);
                  if (!icon) return null;
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={icon}
                      alt={base}
                      width={20}
                      height={20}
                      className="rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  );
                })()}
                {dataAge !== null && dataAge < 120_000 && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-buy border-[1.5px] border-card" />
                )}
              </div>
              <span className="text-[13px] font-bold font-mono tracking-tight truncate">{pair}</span>
              <span className="text-[9px] font-mono text-white/50">
                {["BTC", "ETH", "SOL"].includes(pair.split("/")[0].toUpperCase()) ? "20x" : "5x"}
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-txt-faint group-hover:text-txt-secondary transition-colors shrink-0"><path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>

            {displayPrice != null && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[15px] font-semibold font-mono text-txt-primary tabular-nums leading-none">
                  {fmtPrice(displayPrice)}
                </span>
                <span className={`text-[11px] font-semibold font-mono tabular-nums ${displayChange !== undefined && displayChange >= 0 ? "text-buy" : "text-sell"}`}>
                  {displayChange !== undefined ? `${displayChange >= 0 ? "+" : ""}${displayChange.toFixed(2)}%` : "—"}
                </span>
              </div>
            )}

            {dataAge !== null && dataAge < 120_000 && (
              <span className="text-[9px] text-buy flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
          {/* Market info compact */}
          {displayPrice != null && currentTicker && (
            <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-txt-muted">
              <span>Mark <span className="text-txt-secondary font-semibold">{fmtPrice(displayPrice)}</span></span>
              <span>Vol <span className="text-txt-secondary font-semibold">{fmtCompactVol(parseFloat(currentTicker.quoteVolume || currentTicker.volume || "0"))}</span></span>
            </div>
          )}
          {/* Funding rate */}
          {fundingData && (
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-txt-muted">Funding</span>
              <span className={`font-semibold tabular-nums ${
                fundingData.fundingRate > 0 ? "text-buy" : fundingData.fundingRate < 0 ? "text-sell" : "text-txt-muted"
              }`}>
                {fundingData.fundingRate > 0 ? "+" : ""}{(fundingData.fundingRate * 100).toFixed(4)}%
              </span>
            </div>
          )}
          {/* Trade plan compact */}
          {showTradePlan && latestSignal?.execution && !compact && (
            <div className="hidden lg:flex items-center gap-2.5 text-[11px] font-mono text-txt-muted">
              <span>Entry <span className="text-accent font-semibold">{fmtPrice(latestSignal.execution.entry)}</span></span>
              <span>Take Profit <span className="text-buy font-semibold">{fmtPrice(latestSignal.execution.takeProfit)}</span></span>
              <span>Stop Loss <span className="text-sell font-semibold">{fmtPrice(latestSignal.execution.stopLoss)}</span></span>
            </div>
          )}
          <div className="w-px h-4 bg-border-default" />
          {tradeMode && onModeChange && (
              <div className="flex items-center gap-0.5 bg-inset rounded-md p-0.5 border border-border-default">
                <button onClick={() => onModeChange("paper")} className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer font-semibold transition-colors ${tradeMode === "paper" ? "bg-accent/15 text-accent border border-accent/20" : "text-txt-faint hover:text-txt-muted border border-transparent"}`}>Paper</button>
                <button onClick={() => onModeChange("live")} className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer font-semibold transition-colors ${tradeMode === "live" ? "bg-sell/15 text-sell border border-sell/20" : "text-txt-faint hover:text-txt-muted border border-transparent"}`}>Live</button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: TF + Chart Type + Market Info + Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {/* TF inline buttons */}
            {(Object.keys(TF_CONFIG) as Timeframe[]).map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-all cursor-pointer ${
                  tf === t
                    ? "text-accent bg-accent/12 border border-accent/25"
                    : "text-txt-dim hover:text-txt-secondary hover:bg-elevated/30 border border-transparent"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
            {loading && (
              <span className="ml-1 text-[9px] text-accent animate-pulse">loading</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-px h-4 bg-border-default" />
            {/* Chart type toggle */}
            {/* Chart type toggle */}
            <div className="flex items-center bg-inset rounded-md border border-border-default overflow-hidden">
              {(["area", "candles", "line"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`text-[10px] px-2 py-0.5 transition-all cursor-pointer font-medium capitalize ${
                    chartType === type ? "text-accent bg-elevated" : "text-txt-dim hover:text-txt-secondary"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Volume toggle */}
            <button
              onClick={() => setShowVolume((v) => !v)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-all cursor-pointer font-medium ${
                showVolume ? "text-accent bg-accent/10" : "text-txt-faint hover:text-txt-dim"
              }`}
            >
              Vol
            </button>

            {/* Controls dropdown (⋯) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCompactControls((v) => !v);
                  setShowTfDropdown(false);
                }}
                className="flex items-center justify-center w-6 h-6 rounded-md border border-border-default text-txt-dim hover:text-txt-secondary hover:bg-elevated/40 transition-colors cursor-pointer"
                title="Chart settings"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
              </button>
              {showCompactControls && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 z-30 bg-card border border-border-muted rounded-xl overflow-hidden min-w-[180px] shadow-2xl shadow-black/50"
                >
                  <div className="px-3 py-2 border-b border-border-default bg-inset/30">
                    <span className="text-[9px] text-txt-muted font-semibold uppercase tracking-wider">Chart Settings</span>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => setChartEngine((v) => (v === "native" ? "tradingview" : "native"))}
                      className="w-full flex items-center justify-between text-[11px] px-3 py-2 rounded-lg hover:bg-elevated/40 transition-colors text-txt-secondary"
                    >
                      <span>Engine</span>
                      <span className="text-txt-primary font-semibold text-[10px]">{chartEngine === "native" ? "SignalFlow" : "TradingView"}</span>
                    </button>
                    <button
                      onClick={() => setShowSignals((v) => !v)}
                      className="w-full flex items-center justify-between text-[11px] px-3 py-2 rounded-lg hover:bg-elevated/40 transition-colors text-txt-secondary"
                    >
                      <span>Signals</span>
                      <span className={showSignals ? "text-accent font-semibold text-[10px]" : "text-txt-faint text-[10px]"}>{showSignals ? "On" : "Off"}</span>
                    </button>
                    <button
                      onClick={() => setShowTradePlan((v) => !v)}
                      className="w-full flex items-center justify-between text-[11px] px-3 py-2 rounded-lg hover:bg-elevated/40 transition-colors text-txt-secondary"
                    >
                      <span>Trade Plan</span>
                      <span className={showTradePlan ? "text-accent font-semibold text-[10px]" : "text-txt-faint text-[10px]"}>{showTradePlan ? "On" : "Off"}</span>
                    </button>
                    <button
                      onClick={() => setChartEngine((v) => (v === "native" ? "tradingview" : "native"))}
                      className="w-full flex items-center justify-between text-[11px] px-3 py-2 rounded-lg hover:bg-elevated/40 transition-colors text-txt-secondary"
                    >
                      <span>Chart Engine</span>
                      <span className="text-txt-primary font-semibold text-[10px]">{chartEngine === "native" ? "Native" : "TV"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setFullscreen((v) => !v)}
              className="flex items-center justify-center w-6 h-6 rounded-md text-txt-faint hover:text-txt-secondary hover:bg-elevated/40 transition-colors cursor-pointer"
              title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
            >
              {fullscreen ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
                </svg>
              )}
            </button>
          </div>
        </div>
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
