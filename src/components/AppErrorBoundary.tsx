import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReload?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

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
    this.props.onReload?.() ?? window.location.reload();
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
            예외가 발생했지만 전체 화면이 완전히 비지 않도록 안전 화면으로 전환했습니다. 새로고침 후에도
            계속되면 최근 수정된 컴포넌트를 먼저 확인해 주세요.
          </p>
          {this.state.errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {this.state.errorMessage}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>
    );
  }
}
