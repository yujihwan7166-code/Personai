/**
 * 플래너 AI 컴패니언 패널 — 우측 슬라이드, backdrop 없음.
 *
 * - 본문 100% 밝기 유지, 클릭 가능 (메모 drawer 와 의도적으로 다름)
 * - rail ✨ 클릭으로 토글
 * - Esc / X 로 닫힘
 * - 380px 너비
 */
import { useEffect, useRef } from 'react';
import { Sparkles, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChat } from '@/hooks/planner/ai/useAIChat';
import { AI_NAME } from '@/lib/planner/ai/aiName';
import type { PlannerView } from '@/components/planner/ViewToggle';
import { AIMessage } from './AIMessage';
import { AIQuickActions } from './AIQuickActions';
import { AIComposer } from './AIComposer';

interface PlannerAIPanelProps {
  open: boolean;
  onClose: () => void;
  view: PlannerView;
  anchorIso: string;
  /** 너비(px). 동적 — 사용자가 좌측 가장자리 드래그로 조정. */
  width: number;
  /** 너비 변경 콜백. 부모가 clamp + persist 책임. */
  onWidthChange: (next: number) => void;
  /** clamp 범위 — 부모 정의값 그대로 사용. */
  minWidth?: number;
  maxWidth?: number;
}

export const PlannerAIPanel = ({
  open,
  onClose,
  view,
  anchorIso,
  width,
  onWidthChange,
  minWidth = 280,
  maxWidth = 560,
}: PlannerAIPanelProps) => {
  const { state, send, stop, clear, applyAction, cancelAction, undoAction } = useAIChat({ view, anchorIso });
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 메시지 도착 + 스트리밍 중 본문 변경 시 자동 스크롤 끝.
  // 사용자가 스크롤을 위로 올렸으면 (끝에서 80px 이상) 따라가지 않음 — 읽기 방해 X.
  const lastContentLenRef = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const totalLen = state.messages.reduce((sum, m) => sum + m.content.length, 0);
    const grew = totalLen > lastContentLenRef.current;
    lastContentLenRef.current = totalLen;
    if (!grew) return;
    if (distanceFromBottom < 80) {
      el.scrollTop = el.scrollHeight;
    }
  }, [state.messages]);

  // Esc 닫기.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // ── 좌측 가장자리 드래그로 너비 조정 ──
  // pointermove 로 viewport 우측 끝에서 마우스 X 좌표만큼 빼면 너비.
  const dragRef = useRef<{ active: boolean }>({ active: false });
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragRef.current.active = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const next = window.innerWidth - e.clientX;
    onWidthChange(Math.max(minWidth, Math.min(maxWidth, Math.round(next))));
  };
  const stopResize = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  // 더블클릭 → 기본값 복귀.
  const resetToDefault = () => onWidthChange(340);

  return (
    <aside
      aria-hidden={!open}
      aria-label={`${AI_NAME} — AI 컴패니언`}
      className={cn(
        'fixed top-0 right-0 h-screen z-30 bg-background border-l hairline shadow-[-4px_0_20px_hsl(30_15%_8%/0.04)]',
        'transition-transform duration-200 ease-out',
        // 모바일: 풀스크린, sm 이상: 사용자 지정 너비 (CSS 변수로).
        'w-full sm:w-[var(--ai-w)]',
        open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
      )}
      style={{ ['--ai-w' as string]: `${width}px` }}
    >
      {/* 좌측 가장자리 — 드래그로 너비 조정. 모바일에선 숨김 (풀스크린이라 의미 X). */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="AI 패널 너비 조정"
        title="드래그로 너비 조정 · 더블클릭으로 기본값"
        className="hidden sm:block absolute top-0 left-0 h-full w-1.5 -ml-0.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
        onPointerDown={startResize}
        onPointerMove={onResizeMove}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        onDoubleClick={resetToDefault}
      />

      <div className="flex h-full flex-col">
        {/* ── 헤더 ── */}
        <div className="shrink-0 flex items-center justify-between px-3.5 pt-3 pb-2.5 border-b hairline">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
            <h2 className="text-[13.5px] font-semibold text-foreground truncate">{AI_NAME}</h2>
          </div>
          <div className="flex items-center gap-0.5">
            {state.messages.length > 0 && (
              <button
                type="button"
                onClick={clear}
                aria-label="대화 비우기"
                title="대화 비우기"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="패널 닫기"
              title="닫기 (Esc)"
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── 메시지 영역 ── */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5">
          {state.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="text-[13px] text-foreground/80 mb-1.5">현재 화면을 보고 답해드릴게요</div>
              <div className="text-[11.5px] text-muted-foreground mb-3 leading-relaxed">
                일정·할 일·습관 데이터를 참고해 짧게 답합니다.<br />
                <span className="text-muted-foreground/70">직접 추가·수정은 못 해요 — 방법만 안내해요.</span>
              </div>
              <AIQuickActions view={view} onPick={(p) => void send(p)} disabled={state.loading} />
            </div>
          ) : (
            state.messages.map((m) => (
              <AIMessage
                key={m.id}
                message={m}
                onRetry={m.error ? () => {
                  // 직전 user 메시지를 재전송.
                  const idx = state.messages.findIndex((x) => x.id === m.id);
                  const prev = state.messages.slice(0, idx).reverse().find((x) => x.role === 'user');
                  if (prev) void send(prev.content);
                } : undefined}
                onApplyAction={(i) => applyAction(m.id, i)}
                onCancelAction={(i) => cancelAction(m.id, i)}
                onUndoAction={(i) => undoAction(m.id, i)}
              />
            ))
          )}
        </div>

        {/* ── 메시지 있을 때만 하단 quick actions 한 줄 ── */}
        {state.messages.length > 0 && !state.loading && (
          <div className="shrink-0 px-3 pb-2">
            <AIQuickActions view={view} onPick={(p) => void send(p)} disabled={state.loading} />
          </div>
        )}

        {/* ── 입력창 ── */}
        <AIComposer
          onSend={(t) => void send(t)}
          onStop={state.loading ? stop : undefined}
          loading={state.loading}
        />
      </div>
    </aside>
  );
};
