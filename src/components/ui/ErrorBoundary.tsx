"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary${this.props.name ? ` ${this.props.name}` : ""}]`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="bg-card border border-sell/20 rounded-lg overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-sell/60 to-transparent" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="text-xs font-semibold text-sell">
                {this.props.name ? `${this.props.name} crashed` : "Component error"}
              </span>
            </div>

            <p className="text-[10px] text-txt-muted mb-3 leading-relaxed">
              {this.state.error?.message ?? "An unexpected error occurred"}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={this.handleReset}
                className="text-[10px] px-3 py-1.5 rounded bg-elevated text-txt-secondary hover:text-txt-primary border border-border-default hover:border-border-muted transition-colors cursor-pointer"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-[10px] px-3 py-1.5 rounded text-txt-faint hover:text-txt-muted transition-colors cursor-pointer"
              >
                Reload page
              </button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-3">
                <summary className="text-[9px] text-txt-faint cursor-pointer hover:text-txt-muted">
                  Stack trace
                </summary>
                <pre className="mt-2 text-[8px] text-txt-faint bg-inset rounded p-2 overflow-x-auto max-h-32 overflow-y-auto font-mono leading-relaxed">
                  {this.state.error?.stack}
                  {"\n\n"}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
