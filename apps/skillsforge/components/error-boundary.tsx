"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@quikit/ui";
import { useT } from "@/lib/i18n/useT";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset?: () => void;
}

interface InternalErrorBoundaryProps extends ErrorBoundaryProps {
  t: (key: string, params?: Record<string, string | number | undefined>) => string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundaryClass extends Component<
  InternalErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: InternalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { t, fallbackTitle, fallbackDescription } = this.props;
      const title = fallbackTitle || t("errorBoundary.title");
      const description =
        fallbackDescription ||
        this.state.error?.message ||
        t("errorBoundary.description");

      return (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-center justify-center text-center space-y-3"
        >
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-red-700 dark:text-red-400">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">
              {description}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={this.handleReset}
            className="gap-1.5 text-xs border-red-500/30 hover:bg-red-500/10 text-red-700 dark:text-red-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("errorBoundary.retry")}</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  const { t } = useT();
  return <ErrorBoundaryClass {...props} t={t} />;
}
