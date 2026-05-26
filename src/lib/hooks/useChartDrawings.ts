"use client";

import { useState, useCallback, useEffect } from "react";
import type { ChartDrawing, DrawingTool, PendingDrawing, Point } from "../chart-drawings/types";
import { FIB_LEVELS as DEFAULT_FIB_LEVELS } from "../chart-drawings/types";
import { loadDrawings, saveDrawing, removeDrawing, clearDrawings as clearStorage } from "../chart-drawings/storage";
import { generateDrawingId } from "../chart-drawings/math";

export type { ChartDrawing, DrawingTool };

export function useChartDrawings(pair: string, timeframe: string) {
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>("select");
  const [pending, setPending] = useState<PendingDrawing>({ tool: "select", firstClick: null });
  const [hidden, setHidden] = useState(false);

  // Load drawings when pair/timeframe changes
  useEffect(() => {
    const loaded = loadDrawings(pair, timeframe);
    setDrawings(loaded);
    setPending({ tool: activeTool, firstClick: null });
  }, [pair, timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch tool
  const selectTool = useCallback((tool: DrawingTool) => {
    setActiveTool(tool);
    setPending({ tool, firstClick: null });
  }, []);

  // Handle chart click — dispatch to appropriate tool handler
  const handleChartClick = useCallback(
    (time: number, price: number) => {
      if (activeTool === "select") return;

      const point: Point = { time, price };

      if (activeTool === "horizontal_line") {
        // Single click — create immediately
        const drawing: ChartDrawing = {
          id: generateDrawingId(),
          type: "horizontal_line",
          pair,
          timeframe,
          price,
          createdAt: new Date().toISOString(),
        };
        saveDrawing(drawing);
        setDrawings((prev) => [...prev, drawing]);
        return;
      }

      // Two-click tools: measure, trendline, fib_retracement
      if (!pending.firstClick) {
        // First click
        setPending({ tool: activeTool, firstClick: point });
      } else {
        // Second click — create drawing
        const drawing: ChartDrawing = {
          id: generateDrawingId(),
          type: activeTool as "measure" | "trendline" | "fib_retracement",
          pair,
          timeframe,
          start: pending.firstClick,
          end: point,
          ...(activeTool === "fib_retracement" ? { levels: [...DEFAULT_FIB_LEVELS] } : {}),
          createdAt: new Date().toISOString(),
        } as ChartDrawing;
        saveDrawing(drawing);
        setDrawings((prev) => [...prev, drawing]);
        setPending({ tool: activeTool, firstClick: null });
      }
    },
    [activeTool, pending, pair, timeframe],
  );

  // Cancel pending drawing (e.g. on Escape)
  const cancelPending = useCallback(() => {
    setPending({ tool: activeTool, firstClick: null });
  }, [activeTool]);

  // Remove a single drawing
  const deleteDrawing = useCallback(
    (drawingId: string) => {
      removeDrawing(pair, timeframe, drawingId);
      setDrawings((prev) => prev.filter((d) => d.id !== drawingId));
    },
    [pair, timeframe],
  );

  // Clear all drawings
  const clearAll = useCallback(() => {
    clearStorage(pair, timeframe);
    setDrawings([]);
    setPending({ tool: activeTool, firstClick: null });
  }, [pair, timeframe, activeTool]);

  // Toggle visibility
  const toggleHidden = useCallback(() => {
    setHidden((h) => !h);
  }, []);

  return {
    drawings,
    activeTool,
    pending,
    hidden,
    selectTool,
    handleChartClick,
    cancelPending,
    deleteDrawing,
    clearAll,
    toggleHidden,
  };
}
