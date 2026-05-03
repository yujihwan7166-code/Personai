import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReload?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
  /** error 발생 시점의 pathname — 이후 다른 경로로 이동하면 자동 reset. */
  errorPath: string | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
    errorPath: null,
  };

  private popstateHandler?: () => void;

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
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
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    window.history.pushState = (...args) => {
      origPush.apply(window.history, args);
      this.popstateHandler?.();
    };
    window.history.replaceState = (...args) => {
      origReplace.apply(window.history, args);
      this.popstateHandler?.();
    };
  }

  componentWillUnmount() {
    if (typeof window === 'undefined' || !this.popstateHandler) return;
    window.removeEventListener('popstate', this.popstateHandler);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary caught an app render error", error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false, errorMessage: null, errorPath: null });
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
              {this.state.errorMessage}
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
          </div>
        </div>
      </div>
    );
  }
}
