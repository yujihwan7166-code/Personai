import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReload?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
  errorStack: string | null;
  componentStack: string | null;
  /** error 발생 시점의 pathname — 이후 다른 경로로 이동하면 자동 reset. */
  errorPath: string | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
    errorStack: null,
    componentStack: null,
    errorPath: null,
  };

  private popstateHandler?: () => void;
  private originalPushState?: History['pushState'];
  private originalReplaceState?: History['replaceState'];
  private patchedPushState?: History['pushState'];
  private patchedReplaceState?: History['replaceState'];

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
      errorStack: error.stack ?? null,
      componentStack: null,
      errorPath: typeof window !== 'undefined' ? window.location.pathname : null,
    };
  }

  componentDidMount() {
    if (typeof window === 'undefined') return;
    // 라우트 변경 자동 감지 — pushState/popstate 둘 다.
    this.popstateHandler = () => {
      if (this.state.hasError && this.state.errorPath !== null
          && window.location.pathname !== this.state.errorPath) {
        this.reset();
      }
    };
    window.addEventListener('popstate', this.popstateHandler);
    // pushState/replaceState 도 감지 — patch 한 번만.
    this.originalPushState = window.history.pushState;
    this.originalReplaceState = window.history.replaceState;
    this.patchedPushState = ((...args: Parameters<History['pushState']>) => {
      this.originalPushState?.apply(window.history, args);
      this.popstateHandler?.();
    }) as History['pushState'];
    this.patchedReplaceState = ((...args: Parameters<History['replaceState']>) => {
      this.originalReplaceState?.apply(window.history, args);
      this.popstateHandler?.();
    }) as History['replaceState'];
    window.history.pushState = this.patchedPushState;
    window.history.replaceState = this.patchedReplaceState;
  }

  componentWillUnmount() {
    if (typeof window === 'undefined' || !this.popstateHandler) return;
    window.removeEventListener('popstate', this.popstateHandler);
    if (this.patchedPushState && window.history.pushState === this.patchedPushState && this.originalPushState) {
      window.history.pushState = this.originalPushState;
    }
    if (this.patchedReplaceState && window.history.replaceState === this.patchedReplaceState && this.originalReplaceState) {
      window.history.replaceState = this.originalReplaceState;
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary caught an app render error", error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack ?? null });
    // Sentry — init 안 됐으면 자체 no-op. componentStack 도 함께 첨부.
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack ?? undefined } },
    });
  }

  private reset = () => {
    this.setState({
      hasError: false,
      errorMessage: null,
      errorStack: null,
      componentStack: null,
      errorPath: null,
    });
  };

  private handleClearStorage = () => {
    if (typeof window === 'undefined') return;
    const ok = window.confirm(
      '모든 localStorage 데이터를 지우고 새로고침합니다.\n' +
      '(메모/할 일/일기/위키 IndexedDB 는 유지됩니다)\n\n계속할까요?'
    );
    if (!ok) return;
    try { window.localStorage.clear(); } catch { /* ignore */ }
    try { window.sessionStorage.clear(); } catch { /* ignore */ }
    window.location.assign('/');
  };

  private handleReload = () => {
    if (this.props.onReload) {
      this.props.onReload();
    } else {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">Runtime Recovery</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">앱 화면을 불러오던 중 문제가 발생했어요.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            예외가 발생했지만 전체 화면이 완전히 비지 않도록 안전 화면으로 전환했습니다.
            다른 페이지로 이동하거나 새로고침하면 복구돼요.
          </p>
          {this.state.errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              <div className="font-mono">{this.state.errorMessage}</div>
              {(this.state.errorStack || this.state.componentStack) && (
                <details className="mt-2 text-[11px] text-rose-200/80">
                  <summary className="cursor-pointer select-none hover:text-rose-100">
                    상세 (개발자용)
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[10.5px] leading-snug">
                    {this.state.errorStack}
                    {this.state.componentStack ? `\n\n--- component stack ---\n${this.state.componentStack}` : ''}
                  </pre>
                </details>
              )}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="rounded-xl border border-white/30 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              홈으로
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl border border-white/30 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={this.handleClearStorage}
              className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
              title="저장된 설정값을 모두 비우고 다시 시작"
            >
              저장값 초기화
            </button>
          </div>
        </div>
      </div>
    );
  }
}
