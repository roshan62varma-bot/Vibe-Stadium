import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl border border-red-500/20 bg-red-950/10 text-center space-y-4 my-4 backdrop-blur-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-white text-base">
              {this.props.fallbackTitle || "Component Load Error"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              We encountered an issue loading this section. Stadium live data streaming is recovering.
            </p>
          </div>
          <Button 
            onClick={this.handleReset}
            size="sm"
            className="rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-200 border border-red-500/30 text-xs"
          >
            Attempt Reload
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
