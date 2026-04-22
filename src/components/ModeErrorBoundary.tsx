// 모드 단위 Error Boundary — 한 모드 충돌이 앱 전체 하얘지지 않도록 격리.
// FileConvertChat에 있던 패턴을 범용화 (resetKey 기반 자동 초기화 지원).

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** 라벨 (예: "파일 변환") — 에러 화면 제목 */
  modeLabel?: string;
  /** 이 값이 변하면 에러 상태 자동 초기화 */
  resetKey?: unknown;
  /** "처음으로" 버튼 클릭 콜백 (옵션) */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ModeErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 개발자 콘솔에는 상세 기록
    console.error('[ModeErrorBoundary]', this.props.modeLabel ?? 'mode', error, info);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const label = this.props.modeLabel ?? '이 모드';
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <div>
          <h2 className="text-[17px] font-bold text-slate-800 mb-1">{label}에서 문제가 생겼어요</h2>
          <p className="text-[13px] text-slate-600 max-w-md leading-relaxed">
            예상치 못한 오류가 발생해서 화면을 그릴 수 없어요. 잠시 후 다시 시도하거나 다른 모드로 이동해 주세요.
          </p>
        </div>
        <details className="text-[11px] text-slate-400 max-w-md">
          <summary className="cursor-pointer select-none">오류 상세 보기</summary>
          <pre className="mt-2 whitespace-pre-wrap text-left bg-slate-50 border border-slate-200 rounded-md p-2.5">
            {error.message}
            {error.stack ? `\n\n${error.stack.split('\n').slice(0, 4).join('\n')}` : ''}
          </pre>
        </details>
        <button
          type="button"
          onClick={this.handleReset}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시작
        </button>
      </div>
    );
  }
}
