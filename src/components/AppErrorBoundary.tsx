import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReload?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * 앱 전역 에러 바운더리.
 * 리디자인 — Phase F/G 이후 토큰 기반, 친절한 카피, 두 개의 복구 경로.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary caught an app render error", error, errorInfo);
  }

  private handleReload = () => {
    if (this.props.onReload) this.props.onReload();
    else window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-6 py-10">
        <div className="w-full max-w-md text-center">
          {/* 일러스트 — 순한 경고 아이콘 */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" strokeWidth={1.8} />
          </div>

          <h1 className="font-display text-[22px] font-semibold text-[hsl(var(--foreground))] tracking-tight">
            잠깐 화면에 문제가 생겼어요
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            안전 화면으로 전환했습니다. 새로고침 후에도 계속되면<br />
            잠시 뒤 다시 시도하거나 홈으로 돌아가 주세요.
          </p>

          {this.state.errorMessage && (
            <details className="mt-5 text-left">
              <summary className="cursor-pointer text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                기술 정보 보기
              </summary>
              <div className="mt-2 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] px-3 py-2 font-mono text-[11px] text-[hsl(var(--muted-foreground))] break-all">
                {this.state.errorMessage}
              </div>
            </details>
          )}

          <div className="mt-7 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-4 py-2 text-[13px] font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2))] transition-colors"
            >
              <Home className="h-4 w-4" />
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }
}
