"use client";

import { useEffect, useRef, useCallback } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { ChartDrawing, Point } from "@/lib/chart-drawings/types";
import { FIB_COLORS } from "@/lib/chart-drawings/types";
import {
  formatMeasureLabel,
  measureColor,
  fibPriceAtLevel,
  fmtFibLevel,
  fmtDrawingPrice,
} from "@/lib/chart-drawings/math";

interface Props {
  chart: IChartApi | null;
  series: ISeriesApi<"Candlestick"> | null;
  drawings: ChartDrawing[];
  hidden: boolean;
  pendingFirstClick: Point | null;
  activeTool: string;
  onClick: (time: number, price: number) => void;
}

export default function ChartDrawingOverlay({
  chart,
  series,
  drawings,
  hidden,
  pendingFirstClick,
  activeTool,
  onClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Convert chart coordinates to pixel coordinates
  const toPixel = useCallback(
    (time: number, price: number): { x: number; y: number } | null => {
      if (!chart || !series) return null;
      try {
        const timeScale = chart.timeScale();
        const x = timeScale.timeToCoordinate(time as Time);
        const y = series.priceToCoordinate(price);
        if (x === null || y === null) return null;
        return { x, y };
      } catch {
        return null;
      }
    },
    [chart, series],
  );

  // Convert pixel coordinates to chart coordinates
  const fromPixel = useCallback(
    (x: number, y: number): Point | null => {
      if (!chart || !series) return null;
      try {
        const timeScale = chart.timeScale();
        const time = timeScale.coordinateToTime(x);
        const price = series.coordinateToPrice(y);
        if (time === null || price === null) return null;
        return { time: time as number, price };
      } catch {
        return null;
      }
    },
    [chart, series],
  );

  // Handle canvas click — convert to chart coordinates and dispatch
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool === "select") return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = fromPixel(x, y);
      if (point) onClick(point.time, point.price);
    },
    [activeTool, fromPixel, onClick],
  );

  // Redraw all drawings
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart) return;

    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (canvas.width !== width * 2 || canvas.height !== height * 2) {
      canvas.width = width * 2;
      canvas.height = height * 2;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(2, 0, 0, 2, 0, 0); // retina scale
    ctx.clearRect(0, 0, width, height);

    if (hidden) return;

    // Draw pending first click marker
    if (pendingFirstClick) {
      const p = toPixel(pendingFirstClick.time, pendingFirstClick.price);
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#00E5A860";
        ctx.fill();
        ctx.strokeStyle = "#00E5A8";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw each drawing
    for (const d of drawings) {
      switch (d.type) {
        case "measure":
          drawMeasure(ctx, d, toPixel);
          break;
        case "horizontal_line":
          drawHorizontalLine(ctx, d, toPixel, width);
          break;
        case "trendline":
          drawTrendline(ctx, d, toPixel);
          break;
        case "fib_retracement":
          drawFib(ctx, d, toPixel, width);
          break;
      }
    }
  }, [chart, drawings, hidden, pendingFirstClick, toPixel]);

  // Sync with chart — redraw on any visible range or size change
  useEffect(() => {
    if (!chart) return;

    const redraw = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw);
      cancelAnimationFrame(rafRef.current);
    };
  }, [chart, draw]);

  // Redraw when drawings change
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Resize observer for canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    });
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className={`absolute inset-0 z-10 ${
        activeTool !== "select" ? "cursor-crosshair" : "pointer-events-none"
      }`}
      style={{ pointerEvents: activeTool !== "select" ? "auto" : "none" }}
    />
  );
}

/* ── Drawing renderers ── */

function drawMeasure(
  ctx: CanvasRenderingContext2D,
  d: Extract<ChartDrawing, { type: "measure" }>,
  toPixel: (time: number, price: number) => { x: number; y: number } | null,
) {
  const p1 = toPixel(d.start.time, d.start.price);
  const p2 = toPixel(d.end.time, d.end.price);
  if (!p1 || !p2) return;

  const color = measureColor(d.start.price, d.end.price);

  // Dashed line
  ctx.beginPath();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dots at endpoints
  for (const p of [p1, p2]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Label at midpoint
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const label = formatMeasureLabel(d.start, d.end, d.timeframe);

  ctx.font = "10px 'JetBrains Mono', monospace";
  const textWidth = ctx.measureText(label).width;
  const padX = 6;
  const boxW = textWidth + padX * 2;
  const boxH = 16;

  ctx.fillStyle = `${color}20`;
  ctx.strokeStyle = `${color}60`;
  ctx.lineWidth = 1;
  roundRect(ctx, midX - boxW / 2, midY - boxH - 6, boxW, boxH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, midX, midY - 6 - boxH / 2);
}

function drawHorizontalLine(
  ctx: CanvasRenderingContext2D,
  d: Extract<ChartDrawing, { type: "horizontal_line" }>,
  toPixel: (time: number, price: number) => { x: number; y: number } | null,
  canvasWidth: number,
) {
  // Use a dummy time — we only need the y coordinate
  const p = toPixel(Date.now() / 1000, d.price);
  if (!p) return;

  // Line across full width
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "#64748B80";
  ctx.lineWidth = 1;
  ctx.moveTo(0, p.y);
  ctx.lineTo(canvasWidth, p.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Price label at right edge
  const label = fmtDrawingPrice(d.price);
  ctx.font = "9px 'JetBrains Mono', monospace";
  const textWidth = ctx.measureText(label).width;
  const padX = 4;
  const boxW = textWidth + padX * 2;
  const boxH = 14;

  const labelX = canvasWidth - boxW - 4;

  ctx.fillStyle = "#1E293B";
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  roundRect(ctx, labelX, p.y - boxH / 2, boxW, boxH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#CBD5E1";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, labelX + boxW / 2, p.y);
}

function drawTrendline(
  ctx: CanvasRenderingContext2D,
  d: Extract<ChartDrawing, { type: "trendline" }>,
  toPixel: (time: number, price: number) => { x: number; y: number } | null,
) {
  const p1 = toPixel(d.start.time, d.start.price);
  const p2 = toPixel(d.end.time, d.end.price);
  if (!p1 || !p2) return;

  const color = measureColor(d.start.price, d.end.price);

  // Line
  ctx.beginPath();
  ctx.strokeStyle = `${color}90`;
  ctx.lineWidth = 1.5;
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // Dots
  for (const p of [p1, p2]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawFib(
  ctx: CanvasRenderingContext2D,
  d: Extract<ChartDrawing, { type: "fib_retracement" }>,
  toPixel: (time: number, price: number) => { x: number; y: number } | null,
  canvasWidth: number,
) {
  const high = Math.max(d.start.price, d.end.price);
  const low = Math.min(d.start.price, d.end.price);

  for (const level of d.levels) {
    const price = fibPriceAtLevel(high, low, level);
    const p = toPixel(Date.now() / 1000, price);
    if (!p) continue;

    const color = FIB_COLORS[level] ?? "#64748B";

    // Horizontal line
    ctx.beginPath();
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = `${color}40`;
    ctx.lineWidth = 1;
    ctx.moveTo(0, p.y);
    ctx.lineTo(canvasWidth, p.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    const label = `${fmtFibLevel(level)} · ${fmtDrawingPrice(price)}`;
    ctx.font = "9px 'JetBrains Mono', monospace";
    const textWidth = ctx.measureText(label).width;
    const padX = 4;
    const boxW = textWidth + padX * 2;
    const boxH = 13;

    ctx.fillStyle = `${color}15`;
    ctx.strokeStyle = `${color}30`;
    ctx.lineWidth = 1;
    roundRect(ctx, 4, p.y - boxH / 2, boxW, boxH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `${color}CC`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 4 + padX, p.y);
  }
}

/* ── Canvas helper: rounded rect ── */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
