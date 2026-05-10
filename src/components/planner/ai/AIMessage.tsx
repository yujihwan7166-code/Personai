/**
 * 단일 AI 메시지 버블 — user/assistant 톤 구분.
 *
 * - user: 우측 정렬, accent 톤
 * - assistant: 좌측 정렬, surface 톤
 * - streaming: 끝에 깜빡이는 dot
 * - error: 빨간 톤 + 재시도 버튼
 */
import { cn } from '@/lib/utils';
import type { AIMessage as AIMessageType } from '@/types/plannerAI';
import { RefreshCw } from 'lucide-react';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { AIActionCard } from './AIActionCard';

interface AIMessageProps {
  message: AIMessageType;
  onRetry?: () => void;
  onApplyAction?: (idx: number) => void;
  onCancelAction?: (idx: number) => void;
  onUndoAction?: (idx: number) => void;
}

export const AIMessage = ({ message, onRetry, onApplyAction, onCancelAction, onUndoAction }: AIMessageProps) => {
  const isUser = message.role === 'user';
  const hasError = Boolean(message.error);

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed break-words',
          isUser
            ? 'bg-primary/12 text-foreground whitespace-pre-wrap'
            : 'bg-card border hairline text-foreground',
          hasError && 'border-destructive/40 bg-destructive/5 text-foreground',
        )}
      >
        {hasError ? (
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-destructive text-[12.5px] font-medium mb-1">응답 실패</div>
              <div className="text-[12px] text-muted-foreground">{message.error}</div>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                aria-label="다시 시도"
                className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : isUser ? (
          <>
            {message.content}
          </>
        ) : (
          // assistant: markdown 렌더 (목록·굵게 등). 빈 본문 + 스트리밍이면 caret 만 표시.
          <div className="ai-md prose-tight">
            {message.content
              ? <LazyMarkdown content={message.content} />
              : null}
            {message.streaming && (
              <span className="inline-block ml-0.5 w-1.5 h-3 bg-foreground/60 animate-pulse align-text-bottom" aria-hidden />
            )}
            {/* AI 가 제안한 액션 카드들 — 사용자가 [추가]/[취소] 결정. */}
            {!message.streaming && message.actions && message.actions.length > 0 && (
              <div className="mt-1">
                {message.actions.map((inst, idx) => (
                  <AIActionCard
                    key={idx}
                    instance={inst}
                    onApply={() => onApplyAction?.(idx)}
                    onCancel={() => onCancelAction?.(idx)}
                    onUndo={() => onUndoAction?.(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
