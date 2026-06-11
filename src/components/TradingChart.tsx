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

type Timeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1D" | "1W" | "1M";

const TF_CONFIG: Record<Timeframe, { interval: string; limit: number }> = {
  "1m":  { interval: "1m", limit: 120 },
  "3m":  { interval: "3m", limit: 120 },
  "5m":  { interval: "5m", limit: 120 },
  "15m": { interval: "15m", limit: 96 },
  "30m": { interval: "30m", limit: 120 },
  "1h":  { interval: "1h", limit: 168 },
  "4h":  { interval: "4h", limit: 180 },
  "1D":  { interval: "1d", limit: 90 },
  "1W":  { interval: "1w", limit: 52 },
  "1M":  { interval: "1M", limit: 12 },
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

// Clean mode = more TV-pro feel (subtler grid, slightly higher contrast text, refined crosshair)
// Keeps the project dark fintech palette as requested.
function getChartTheme(clean: boolean) {
  if (!clean) return CHART_COLORS;
  return {
    ...CHART_COLORS,
    grid: "#242b40",           // slightly more visible but still subtle
    crosshair: "#64748b",
    text: "#94a3b8",
    textDim: "#64748b",
  };
}

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

function calculateEMA(prices: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length === 0) return ema;
  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      sum += prices[i];
      if (i === period - 1) ema[i] = sum / period;
    } else {
      const multiplier = 2 / (period + 1);
      ema[i] = prices[i] * multiplier + (ema[i - 1] as number) * (1 - multiplier);
    }
  }
  return ema;
}

function calculateSMA(prices: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = new Array(prices.length).fill(null);
  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    sum += prices[i];
    if (i >= period - 1) {
      if (i >= period) sum -= prices[i - period];
      sma[i] = sum / period;
    }
  }
  return sma;
}

/* ── Props ── */

interface Props {
  klines?: SoDEXKline[] | null;
  symbol?: string;
  currentPrice?: number | null;
  liveSignals?: Signal[];
  aiSignal?: Signal | null;
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
  aiSignal = null,
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
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const ema9Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50Ref = useRef<ISeriesApi<"Line"> | null>(null);
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
  const [chartType, setChartType] = useState<"area" | "candles">("area");
  const [chartEngine, setChartEngine] = useState<"native" | "tradingview">("native");
  const [fullscreen, setFullscreen] = useState(false);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [cleanMode, setCleanMode] = useState(false); // Visual preset: cleaner TV-like grid / contrast (no feature hiding)
  const [showIndicatorsDropdown, setShowIndicatorsDropdown] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);
  const [showTfDropdown, setShowTfDropdown] = useState(false);

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

  const isDrawingActive = activeTool !== "select";

  // Toggle timeframe favorite
  const toggleFavTf = useCallback((t: Timeframe) => {
    setFavTfs((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      try { localStorage.setItem("sf-fav-tfs", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Cancel pending drawing on Escape + sync browser fullscreen state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { cancelPending(); setFullscreen(false); }
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [cancelPending]);

  // Toggle true fullscreen (Browser Fullscreen API) with CSS fallback
  const toggleFullscreen = useCallback(async () => {
    const el = chartWrapperRef.current;
    if (!el) return;

    if (!fullscreen) {
      // Enter fullscreen
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (el as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.();
        }
      } catch {
        // Fallback: CSS-only fullscreen if browser API fails
      }
      setFullscreen(true);
    } else {
      // Exit fullscreen
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen?.();
        }
      } catch {
        // ignore
      }
      setFullscreen(false);
    }
  }, [fullscreen]);

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

  // Get the latest signal for entry/SL/TP lines — prefer aiSignal (from Generate Signal) if matches pair
  const latestSignal = useMemo(() => {
    const base = pair.split("/")[0];
    const normalize = (p: string) => p.replace(/^v/, "").replace(/_vUSDC$/, "/USDC").toUpperCase();
    const aiForPair = aiSignal && normalize(aiSignal.pair) === normalize(pair) ? aiSignal : null;
    if (aiForPair?.execution) return aiForPair;
    return pairSignals[0] ?? null;
  }, [pairSignals, pair, aiSignal]);

  // Create chart (native Klines mode)
  useEffect(() => {
    if (!containerRef.current) return;

    const theme = getChartTheme(cleanMode);

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: theme.bg },
        textColor: theme.text,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
      },
      grid: {
        vertLines: { color: theme.grid, style: 0 as LineStyle },
        horzLines: { color: theme.grid, style: 0 as LineStyle },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: theme.crosshair,
          width: 1,
          style: 0 as LineStyle, // solid for cleaner TV feel
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: theme.crosshair,
          width: 1,
          style: 0 as LineStyle,
          labelBackgroundColor: "#1e293b",
        },
      },
      rightPriceScale: {
        borderColor: theme.grid,
        borderVisible: false, // cleaner, TV often minimal
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: theme.grid,
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 7,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Candlestick series - TV-like clean style
    const isClean = cleanMode;
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: isClean ? "#22c55e" : "#00E676",      // slightly more classic green in clean
      downColor: isClean ? "#ef4444" : "#EF4444",
      borderUpColor: isClean ? "#16a34a" : "#00E676",
      borderDownColor: isClean ? "#dc2626" : "#EF4444",
      wickUpColor: isClean ? "#4ade80" : "#00E676",
      wickDownColor: isClean ? "#f87171" : "#EF4444",
      borderVisible: true,
    });
    candleRef.current = candleSeries;

    // Markers plugin
    markersPluginRef.current = createSeriesMarkers(candleSeries, []);

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: isClean ? "rgba(148, 163, 184, 0.35)" : "rgba(100, 116, 139, 0.55)",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeRef.current = volumeSeries;

    // Area series (default "Area" chart mode) - cleaner in cleanMode
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: isClean ? "#64748b" : "#00E5A8",
      lineWidth: isClean ? 1 : 2,
      topColor: isClean ? "rgba(100, 116, 139, 0.18)" : "rgba(0, 229, 168, 0.25)",
      bottomColor: isClean ? "rgba(15, 23, 42, 0.02)" : "rgba(0, 229, 168, 0.02)",
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      crosshairMarkerBackgroundColor: isClean ? "#475569" : "#00E5A8",
      crosshairMarkerBorderColor: "#0B1020",
      lastValueVisible: false,
      priceLineVisible: false,
      visible: true,
    });
    areaSeriesRef.current = areaSeries;

    // EMA indicators (for indikator dropdown, hidden by default)
    const ema9Series = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: false,
      crosshairMarkerVisible: false,
    });
    ema9Ref.current = ema9Series;

    const ema21Series = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: false,
      crosshairMarkerVisible: false,
    });
    ema21Ref.current = ema21Series;

    const sma50Series = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: false,
      crosshairMarkerVisible: false,
    });
    sma50Ref.current = sma50Series;

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
      areaSeriesRef.current = null;
      ema9Ref.current = null;
      ema21Ref.current = null;
      sma50Ref.current = null;
      markersPluginRef.current = null;
    };
  }, [cleanMode]); // recreate on clean toggle for simplicity & correct initial series styles

  // Sync cleanMode visual preset to existing chart (colors, grid, crosshair, series styles)
  useEffect(() => {
    if (!chartRef.current) return;
    const theme = getChartTheme(cleanMode);

    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: theme.bg },
        textColor: theme.text,
      },
      grid: {
        vertLines: { color: theme.grid, style: 0 as LineStyle },
        horzLines: { color: theme.grid, style: 0 as LineStyle },
      },
      crosshair: {
        vertLine: { color: theme.crosshair, labelBackgroundColor: "#1e293b" },
        horzLine: { color: theme.crosshair, labelBackgroundColor: "#1e293b" },
      },
      rightPriceScale: { borderColor: theme.grid },
      timeScale: { borderColor: theme.grid },
    });

    const isClean = cleanMode;

    if (candleRef.current) {
      candleRef.current.applyOptions({
        upColor: isClean ? "#22c55e" : "#00E676",
        downColor: isClean ? "#ef4444" : "#EF4444",
        borderUpColor: isClean ? "#16a34a" : "#00E676",
        borderDownColor: isClean ? "#dc2626" : "#EF4444",
        wickUpColor: isClean ? "#4ade80" : "#00E676",
        wickDownColor: isClean ? "#f87171" : "#EF4444",
      });
    }

    if (volumeRef.current) {
      volumeRef.current.applyOptions({
        color: isClean ? "rgba(148, 163, 184, 0.35)" : "rgba(100, 116, 139, 0.55)",
      });
    }

    if (areaSeriesRef.current) {
      areaSeriesRef.current.applyOptions({
        lineColor: isClean ? "#64748b" : "#00E5A8",
        lineWidth: isClean ? 1 : 2,
        topColor: isClean ? "rgba(100, 116, 139, 0.18)" : "rgba(0, 229, 168, 0.25)",
        bottomColor: isClean ? "rgba(15, 23, 42, 0.02)" : "rgba(0, 229, 168, 0.02)",
        crosshairMarkerBackgroundColor: isClean ? "#475569" : "#00E5A8",
      });
    }
  }, [cleanMode]);

  // Close indicators dropdown on outside click
  useEffect(() => {
    if (!showIndicatorsDropdown) return;
    const handler = () => setShowIndicatorsDropdown(false);
    const id = setTimeout(() => window.addEventListener("click", handler), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("click", handler);
    };
  }, [showIndicatorsDropdown]);

  // Close TF dropdown on outside click (minimal handler)
  useEffect(() => {
    if (!showTfDropdown) return;
    const handler = () => setShowTfDropdown(false);
    const id = setTimeout(() => window.addEventListener("click", handler), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("click", handler);
    };
  }, [showTfDropdown]);

  // Update data when klines change
  useEffect(() => {
    if (!chartRef.current || !candleRef.current || !volumeRef.current || !klines || klines.length === 0) return;

    const candles = klines.map(klineToCandle);
    const volumes = klines.map(klineToVolume);

    // Safety: ensure ascending order (normalizeKlines should handle this, but belt-and-suspenders)
    const sortedCandles = [...candles].sort((a, b) => (a.time as number) - (b.time as number));
    try { candleRef.current.setData(sortedCandles); } catch { return; }

    // Area series data (close prices)
    const areaData = klines.map((k) => ({
      time: (k.t / 1000) as Time,
      value: parseFloat(k.c),
    }));
    const sortedAreaData = [...areaData].sort((a, b) => (a.time as number) - (b.time as number));
    if (areaSeriesRef.current) {
      try { areaSeriesRef.current.setData(sortedAreaData as AreaData<Time>[]); } catch {}
    }

    // EMA indicators data (if active in dropdown)
    const closes = klines.map((k) => parseFloat(k.c));
    const ema9Values = calculateEMA(closes, 9);
    const ema21Values = calculateEMA(closes, 21);
    const sma50Values = calculateSMA(closes, 50);

    const ema9Data = ema9Values
      .map((val, i) => (val !== null ? { time: (klines[i].t / 1000) as Time, value: val } : null))
      .filter(Boolean) as any[];
    if (ema9Ref.current) {
      ema9Ref.current.setData(ema9Data);
      ema9Ref.current.applyOptions({ visible: activeIndicators.includes("EMA 9") });
    }

    const ema21Data = ema21Values
      .map((val, i) => (val !== null ? { time: (klines[i].t / 1000) as Time, value: val } : null))
      .filter(Boolean) as any[];
    if (ema21Ref.current) {
      ema21Ref.current.setData(ema21Data);
      ema21Ref.current.applyOptions({ visible: activeIndicators.includes("EMA 21") });
    }

    const sma50Data = sma50Values
      .map((val, i) => (val !== null ? { time: (klines[i].t / 1000) as Time, value: val } : null))
      .filter(Boolean) as any[];
    if (sma50Ref.current) {
      sma50Ref.current.setData(sma50Data);
      sma50Ref.current.applyOptions({ visible: activeIndicators.includes("SMA 50") });
    }

    // Chart type visibility toggle
    candleRef.current.applyOptions({ visible: chartType === "candles" });
    if (areaSeriesRef.current) {
      areaSeriesRef.current.applyOptions({ visible: chartType === "area" });
    }

    // Volume visibility
    const sortedVolumes = [...volumes].sort((a, b) => (a.time as number) - (b.time as number));
    try {
      volumeRef.current.setData(sortedVolumes);
      volumeRef.current.applyOptions({ visible: showVolume });
    } catch {}

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
        try { markersPluginRef.current.setMarkers(markers); } catch {}
      }
    } else if (markersPluginRef.current) {
      try { markersPluginRef.current.setMarkers([]); } catch {}
    }

    // Add entry / TP / SL lines for latest signal — only when showTradePlan is on
    if (showTradePlan && latestSignal?.execution && candleRef.current) {
      const ex = latestSignal.execution;

      if (typeof ex.entry === "number" && Number.isFinite(ex.entry) && ex.entry > 0) {
        try {
          const line = candleRef.current.createPriceLine({
            price: ex.entry,
            color: CHART_COLORS.entryLine,
            lineWidth: 1,
            lineStyle: 2 as LineStyle,
            axisLabelVisible: true,
            title: "Entry",
          });
          markerLinesRef.current.push(line);
        } catch {}
      }

      if (typeof ex.takeProfit === "number" && Number.isFinite(ex.takeProfit) && ex.takeProfit > 0) {
        try {
          const line = candleRef.current.createPriceLine({
            price: ex.takeProfit,
            color: CHART_COLORS.tpLine,
            lineWidth: 1,
            lineStyle: 2 as LineStyle,
            axisLabelVisible: true,
            title: "TP",
          });
          markerLinesRef.current.push(line);
        } catch {}
      }

      if (typeof ex.stopLoss === "number" && Number.isFinite(ex.stopLoss) && ex.stopLoss > 0) {
        try {
          const line = candleRef.current.createPriceLine({
            price: ex.stopLoss,
            color: CHART_COLORS.slLine,
            lineWidth: 1,
            lineStyle: 2 as LineStyle,
            axisLabelVisible: true,
            title: "SL",
          });
          markerLinesRef.current.push(line);
        } catch {}
      }
    }

    // Fit content
    chartRef.current?.timeScale().fitContent();
  }, [klines, pairSignals, latestSignal, showVolume, showSignals, showTradePlan, chartType, activeIndicators]);

  // Handle resize (re-observe on fullscreen/cleanMode change)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !chartRef.current) return;

    const resizeChart = () => {
      requestAnimationFrame(() => {
        if (!container || !chartRef.current) return;
        const { width, height } = container.getBoundingClientRect();
        if (width > 0 && height > 0) {
          chartRef.current.applyOptions({ width, height });
        }
      });
    };

    const observer = new ResizeObserver(() => resizeChart());
    observer.observe(container);

    // Immediately resize on effect fire (fullscreen toggle / cleanMode change)
    resizeChart();

    return () => observer.disconnect();
  }, [cleanMode, fullscreen]);

  // Current ticker for selected pair
  const currentTicker = tickerMap?.get(sodexSymbol);
  const displayPrice = currentTicker
    ? parseFloat(currentTicker.lastPx)
    : currentPrice;
  const displayChange = currentTicker?.changePct;

  // Data freshness
  const lastKline = klines?.[klines.length - 1];
  const dataAge = lastKline ? Date.now() - lastKline.t : null;

  // For TV-like status: prefer hovered bar data (from crosshair), fallback to last candle
  const displayOHLC = hoverData
    ? {
        o: hoverData.open,
        h: hoverData.high,
        l: hoverData.low,
        c: hoverData.close,
        v: hoverData.volume,
      }
    : lastKline
    ? {
        o: parseFloat(lastKline.o),
        h: parseFloat(lastKline.h),
        l: parseFloat(lastKline.l),
        c: parseFloat(lastKline.c),
        v: parseFloat(lastKline.v),
      }
    : null;

  return (
    <div ref={chartWrapperRef} className={fullscreen
      ? "fixed inset-0 z-[9999] bg-background p-2 flex flex-col"
      : "h-full w-full flex flex-col min-w-0 bg-card border border-border-default rounded-lg overflow-hidden"
    }>
      {/* Header — 2 rows (status on top, full toolbar row below)
          User request: jangan dipaksa single line kalau sempit. 
          Row 1: Status/info (ticker + price + OHLC + perps data) — readable, banyak info.
          Row 2: Toolbar terpisah (TF dropdown jelas + style + overlays + actions).
          Clear CTAs, better fonts (≥10px), tidak berantakan. */}
      <div className="px-3 pt-2 pb-1.5 flex flex-col gap-1.5 shrink-0 border-b border-border-default bg-inset/30">
        {/* Row 1: Status line */}
        <div className="flex items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-2 min-w-0 flex-[3] min-w-[200px]">
            <button
              onClick={() => setShowModal(true)}
              className="group flex items-center gap-1.5 min-w-0 rounded border border-border-default bg-inset/40 px-2 py-1 text-txt-primary hover:border-border-muted hover:bg-elevated/25 transition-colors cursor-pointer"
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
                      width={16}
                      height={16}
                      className="rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  );
                })()}
                {dataAge !== null && dataAge < 120_000 && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-buy border border-card" />
                )}
              </div>
              <span className="text-[12px] font-bold font-mono tracking-tight truncate">{pair}</span>
              <span className="text-[8px] font-mono text-white/50 shrink-0 hidden sm:inline">
                {["BTC", "ETH", "SOL"].includes(pair.split("/")[0].toUpperCase()) ? "20x" : "5x"}
              </span>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" className="text-txt-faint group-hover:text-txt-secondary transition-colors shrink-0"><path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>

            {displayPrice != null && (
              <div className="flex items-baseline gap-1 text-[14px] font-semibold font-mono text-txt-primary tabular-nums leading-none">
                {fmtPrice(displayPrice)}
                <span className={`text-[11px] font-semibold tabular-nums ${displayChange !== undefined && displayChange >= 0 ? "text-buy" : "text-sell"}`}>
                  {displayChange !== undefined ? `${displayChange >= 0 ? "+" : ""}${displayChange.toFixed(1)}%` : ""}
                </span>
              </div>
            )}

            {dataAge !== null && dataAge < 120_000 && (
              <span className="text-[9px] text-buy flex items-center gap-0.5 font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-txt-muted">
            {displayOHLC && (
              <span className="flex items-center gap-1.5">
                <span>O <span className="text-txt-secondary tabular-nums">{fmtPrice(displayOHLC.o)}</span></span>
                <span>H <span className="text-buy tabular-nums">{fmtPrice(displayOHLC.h)}</span></span>
                <span>L <span className="text-sell tabular-nums">{fmtPrice(displayOHLC.l)}</span></span>
                <span>C <span className="text-txt-primary tabular-nums">{fmtPrice(displayOHLC.c)}</span></span>
                <span>V <span className="text-txt-secondary tabular-nums">{fmtCompactVol(displayOHLC.v)}</span></span>
              </span>
            )}
            {fundingData && (
              <span className={`font-semibold ${fundingData.fundingRate > 0 ? "text-buy" : fundingData.fundingRate < 0 ? "text-sell" : "text-txt-muted"}`}>
                F {(fundingData.fundingRate * 100).toFixed(3)}%
              </span>
            )}
            {fundingData?.openInterest && <span className="text-[9px]">OI {fmtCompactVol(fundingData.openInterest)}</span>}
          </div>
        </div>

        {/* Row 2: Toolbar row */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1">
            {/* Favorite TFs as wrapping buttons - they line up side by side, wrap to next row when many added from dropdown */}
            <div className="flex items-center gap-0.5 flex-wrap">
              {(favTfs.length > 0 ? favTfs : ["1h", "4h", "1D"] as Timeframe[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  className={`text-[11px] font-mono px-2 py-1 rounded transition-all cursor-pointer border ${
                    tf === t
                      ? "text-accent bg-accent/12 border-accent/25"
                      : "text-txt-dim hover:text-txt-secondary hover:bg-elevated/30 border-transparent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Dropdown menu to add/remove from favorites (and select any TF) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTfDropdown((v) => !v);
                }}
                className="text-[11px] p-1.5 rounded hover:bg-elevated/40 text-txt-dim hover:text-txt-secondary transition-colors"
                title="Add/remove favorite timeframes"
              >
                +
              </button>
              {showTfDropdown && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-1 z-40 bg-card border border-border-default rounded-lg shadow-xl py-1 min-w-[120px] text-[11px]"
                >
                  {(Object.keys(TF_CONFIG) as Timeframe[]).map((t) => (
                    <div key={t} className="flex items-center justify-between px-2 py-0.5 hover:bg-elevated/50">
                      <button
                        onClick={() => {
                          setTf(t);
                          setShowTfDropdown(false);
                        }}
                        className={`flex-1 text-left font-mono ${tf === t ? "text-accent font-semibold" : "text-txt-dim"}`}
                      >
                        {t}
                      </button>
                      <button
                        onClick={() => toggleFavTf(t)}
                        className="text-[11px] px-1"
                        title={favTfs.includes(t) ? "Remove from favorites" : "Add to favorites"}
                      >
                        {favTfs.includes(t) ? "★" : "☆"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {loading && <span className="ml-1 text-[10px] text-accent animate-pulse">loading</span>}

            {/* Indicators button only - removed non-functional pencil and 2-bar icons as requested. Font increased 20% */}
            <div className="relative">
              <button
                onClick={() => setShowIndicatorsDropdown((v) => !v)}
                className="flex items-center gap-0.5 p-1.5 rounded hover:bg-elevated/40 text-txt-dim hover:text-txt-secondary transition-colors text-[11px]"
                title="Indicators"
              >
                {/* chart icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3,17 9,11 13,15 21,7" />
                  <polyline points="3,21 21,21" />
                  <polyline points="3,3 3,21" />
                </svg>
                <span>Indicators</span>
              </button>
              {showIndicatorsDropdown && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-1 z-40 bg-card border border-border-default rounded-lg shadow-xl py-1 min-w-[140px] text-[11px]"
                >
                  {["EMA 9", "EMA 21", "SMA 50", "Bollinger Bands"].map((ind) => (
                    <button
                      key={ind}
                      onClick={() => {
                        setActiveIndicators((prev) =>
                          prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
                        );
                        setShowIndicatorsDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1 font-mono transition-all flex items-center justify-between ${
                        activeIndicators.includes(ind)
                          ? "bg-accent/15 text-accent font-semibold"
                          : "text-txt-dim hover:text-txt-secondary hover:bg-elevated/50"
                      }`}
                    >
                      <span>{ind}</span>
                      {activeIndicators.includes(ind) && <span className="text-accent">✓</span>}
                    </button>
                  ))}
                  <div className="border-t border-border-default my-1" />
                  <button
                    onClick={() => {
                      setActiveIndicators([]);
                      setShowIndicatorsDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1 text-[11px] text-txt-faint hover:text-txt-secondary"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-px h-4 bg-border-default" />

            <div className="flex items-center bg-inset rounded border border-border-default overflow-hidden">
              {(["area", "candles"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-2.5 py-1 text-[10px] transition-all cursor-pointer font-medium ${chartType === type ? "text-accent bg-elevated" : "text-txt-dim hover:text-txt-secondary"}`}
                >
                  {type === "area" ? "Area" : "Candles"}
                </button>
              ))}
              <div className="w-px h-3 bg-border-default/60" />
              <button
                onClick={() => setChartEngine("native")}
                className={`px-2 py-1 text-[10px] transition-all cursor-pointer font-medium ${chartEngine === "native" ? "text-accent bg-elevated" : "text-txt-dim hover:text-txt-secondary"}`}
                title="Native Klines (signals + drawings)"
              >
                Klines
              </button>
              <button
                onClick={() => setChartEngine("tradingview")}
                className={`px-2 py-1 text-[10px] transition-all cursor-pointer font-medium ${chartEngine === "tradingview" ? "text-accent bg-elevated" : "text-txt-dim hover:text-txt-secondary"}`}
                title="TradingView widget"
              >
                TradingView
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setShowVolume(v => !v)} className={`px-2 py-1 rounded text-[10px] ${showVolume ? "text-accent bg-accent/10" : "text-txt-faint hover:text-txt-dim"}`} title="Volume">Vol</button>
              <button onClick={() => setShowSignals(v => !v)} className={`px-2 py-1 rounded text-[10px] ${showSignals ? "text-accent bg-accent/10" : "text-txt-faint hover:text-txt-dim"}`} title="Signals">Sig</button>
              <button onClick={() => setShowTradePlan(v => !v)} className={`px-2 py-1 rounded text-[10px] ${showTradePlan ? "text-accent bg-accent/10" : "text-txt-faint hover:text-txt-dim"}`} title="Trade Plan">Plan</button>
            </div>

            {tradeMode && onModeChange && (
              <div className="flex items-center gap-0.5 bg-inset rounded p-0.5 border border-border-default text-[10px]">
                <button onClick={() => onModeChange("paper")} className={`px-1.5 py-0.5 rounded font-semibold ${tradeMode === "paper" ? "bg-accent/15 text-accent" : "text-txt-faint hover:text-txt-muted"}`}>P</button>
                <button onClick={() => onModeChange("live")} className={`px-1.5 py-0.5 rounded font-semibold ${tradeMode === "live" ? "bg-hold/15 text-hold" : "text-txt-faint hover:text-txt-muted"}`}>L</button>
              </div>
            )}

            <button
              onClick={() => setCleanMode(!cleanMode)}
              className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${cleanMode ? "text-accent bg-accent/10 border-accent/30" : "text-txt-dim hover:text-txt-secondary border-border-default"}`}
              title="Clean visual preset (subtler grid, refined contrast)"
            >
              {cleanMode ? "Clean" : "Default"}
            </button>

            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center w-6 h-6 rounded text-txt-faint hover:text-txt-secondary hover:bg-elevated/40 transition-colors cursor-pointer"
              title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
            >
              {fullscreen ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" /></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" /></svg>
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

            {/* Crosshair time reference (OHLCV is shown in top status bar for TV-like experience) */}
            {hoverData && (
              <div className="absolute top-2 left-3 text-[9px] font-mono text-txt-faint z-10 pointer-events-none">
                {formatTooltipTime(hoverData.time, tf)}
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
