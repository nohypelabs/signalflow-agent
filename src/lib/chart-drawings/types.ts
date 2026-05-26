/* ── Chart Drawing Types ── */

export type DrawingTool = "select" | "measure" | "horizontal_line" | "trendline" | "fib_retracement";

export interface Point {
  time: number;  // UNIX seconds (matching lightweight-charts Time)
  price: number;
}

export interface BaseDrawing {
  id: string;
  pair: string;
  timeframe: string;
  createdAt: string;
}

export interface MeasureDrawing extends BaseDrawing {
  type: "measure";
  start: Point;
  end: Point;
}

export interface HorizontalLineDrawing extends BaseDrawing {
  type: "horizontal_line";
  price: number;
}

export interface TrendlineDrawing extends BaseDrawing {
  type: "trendline";
  start: Point;
  end: Point;
}

export interface FibRetracementDrawing extends BaseDrawing {
  type: "fib_retracement";
  start: Point;
  end: Point;
  levels: number[];
}

export type ChartDrawing =
  | MeasureDrawing
  | HorizontalLineDrawing
  | TrendlineDrawing
  | FibRetracementDrawing;

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export const FIB_COLORS: Record<number, string> = {
  0: "#EF4444",      // red
  0.236: "#F59E0B",   // amber
  0.382: "#22D3EE",   // cyan
  0.5: "#A78BFA",     // violet
  0.618: "#22D3EE",   // cyan
  0.786: "#F59E0B",   // amber
  1: "#00E5A8",       // green
};

/* ── Drawing-in-progress state (for two-click tools) ── */

export interface PendingDrawing {
  tool: DrawingTool;
  firstClick: Point | null;
}
