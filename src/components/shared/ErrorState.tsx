// 모든 모드에서 공통으로 쓰는 에러 표시 UI.
// errorMessages.ts의 ErrorDescriptor를 받아 제목·설명·액션 버튼을 일관된 형태로 렌더.

import { AlertTriangle, HelpCircle, RefreshCw } from 'lucide-react';
import type { ErrorDescriptor } from '@/lib/errorMessages';
import { describeError } from '@/lib/errorMessages';

interface ErrorStateProps {
  error?: unknown;
  descriptor?: ErrorDescriptor;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onHelp?: () => void;
  /** 재시도 버튼 라벨 override — 기본값: descriptor.primary.label ?? '다시 시도' */
  primaryLabel?: string;
  /** 보조 버튼 라벨 override — descriptor에 secondary가 없어도 onSecondary가 있으면 이 라벨로 표시 */
  secondaryLabel?: string;
  /** 에러 원문 보기 토글 (디버그용) */
  showDetails?: boolean;
  /** 컴팩트 레이아웃 (인라인 에러 슬롯용) */
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  error,
  descriptor,
  onPrimary,
  onSecondary,
  onHelp,
  primaryLabel,
  secondaryLabel,
  showDetails = true,
  compact = false,
  className = '',
}: ErrorStateProps) {
  const d = descriptor ?? describeError(error);
  const rawMessage = error instanceof Error ? error.message : error ? String(error) : '';
  const primaryText = primaryLabel ?? d.primary?.label ?? (onPrimary ? '다시 시도' : undefined);
  const secondaryText = secondaryLabel ?? d.secondary?.label ?? (onSecondary ? '처음으로' : undefined);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${
        compact ? 'py-6 px-4' : 'h-full py-10 px-6'
      } ${className}`}
    >
      <AlertTriangle className={compact ? 'w-8 h-8 text-amber-500' : 'w-12 h-12 text-amber-500'} />
      <div>
        <h2 className={`font-bold text-slate-800 mb-1 ${compact ? 'text-[14px]' : 'text-[17px]'}`}>{d.title}</h2>
        <p className={`text-slate-600 max-w-md leading-relaxed ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
          {d.description}
        </p>
      </div>

      {showDetails && rawMessage && rawMessage !== d.description && (
        <details className="text-[11px] text-slate-400 max-w-md">
          <summary className="cursor-pointer select-none">오류 원문 보기</summary>
          <pre className="mt-2 whitespace-pre-wrap text-left bg-slate-50 border border-slate-200 rounded-md p-2.5">
            {rawMessage}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
        {primaryText && onPrimary && (
          <button
            type="button"
            onClick={onPrimary}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {primaryText}
          </button>
        )}
        {secondaryText && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="inline-flex items-center h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-semibold transition-colors"
          >
            {secondaryText}
          </button>
        )}
        {d.help && (
          <button
            type="button"
            onClick={onHelp}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-slate-500 hover:text-slate-700 text-[12px] transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {d.help.label}
          </button>
        )}
      </div>
    </div>
  );
}
