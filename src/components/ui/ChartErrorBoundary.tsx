"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary for chart components.
 * Prevents chart crashes from taking down the entire dashboard.
 * Shows a graceful fallback with retry option.
 */
export default class ChartErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ChartErrorBoundary${this.props.name ? ` ${this.props.name}` : ""}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 bg-surface-1 border border-border rounded-lg min-h-[200px]">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm font-medium text-txt-primary mb-1">
            Chart unavailable
          </div>
          <div className="text-xs text-txt-dim mb-3 text-center max-w-[240px]">
            The chart encountered an error. This won&apos;t affect other features.
          </div>
          <button
            onClick={this.handleRetry}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
