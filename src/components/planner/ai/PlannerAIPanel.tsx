/**
 * 플래너 AI 컴패니언 패널 — 우측 슬라이드, backdrop 없음.
 *
 * - 본문 100% 밝기 유지, 클릭 가능 (메모 drawer 와 의도적으로 다름)
 * - rail ✨ 클릭으로 토글
 * - Esc / X 로 닫힘
 * - 공통 AI 패널 폭 토큰 사용
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { PageAiPanelHeader } from '@/components/PageAiPanelHeader';
import {
  AuxiliaryToolTab,
  AuxiliaryToolTabs,
  PageAiEmptyState,
  PageAiResizeHandle,
  PageAiTypingIndicator,
  getAuxiliaryToolsForSurface,
} from '@/components/PageAiScaffold';
import {
  PAGE_AI_PANEL_SCROLL_CLASS,
  PAGE_AI_PANEL_SURFACE_CLASS,
  PAGE_AI_PANEL_TRANSITION_CLASS,
  PAGE_AI_PANEL_WIDTH,
} from '@/components/PageAiTokens';
import { useAIChat } from '@/hooks/planner/ai/useAIChat';
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

const EMPTY_COPY: Record<PlannerView, { title: string; description: string }> = {
  day: {
    title: '오늘을 실행 가능한 순서로 다듬을까요?',
    description: '일정, 할 일, 빈 시간, 부담 구간을 함께 보고 바로 움직일 제안을 만듭니다.',
  },
  week: {
    title: '이번 주 흐름을 정리해볼까요?',
    description: '몰린 요일, 미완료 위험, 다음 주 준비까지 한 번에 점검합니다.',
  },
  month: {
    title: '이번 달의 쏠림과 빈틈을 볼까요?',
    description: '바쁜 주차, 소홀한 영역, 반복 패턴을 찾아 다음 달 운영안을 만듭니다.',
  },
  year: {
    title: '올해의 큰 흐름을 읽어볼까요?',
    description: '분기별 변화와 남은 기간 페이스를 보고 조정할 일을 제안합니다.',
  },
  habits: {
    title: '오늘 습관 흐름을 이어볼까요?',
    description: '끊길 위험, 넣을 시간, 잘 되는 패턴을 보고 가장 작은 다음 행동을 고릅니다.',
  },
};

export const PlannerAIPanel = ({
  open,
  onClose,
  view,
  anchorIso,
  width,
  onWidthChange,
  minWidth = PAGE_AI_PANEL_WIDTH.min,
  maxWidth = PAGE_AI_PANEL_WIDTH.max,
}: PlannerAIPanelProps) => {
  const { state, send, stop, clear, applyAction, cancelAction, undoAction } = useAIChat({ view, anchorIso });
  const [activeTool, setActiveTool] = useState<AuxiliaryToolTab>('ai');
  const auxiliaryTools = useMemo(() => getAuxiliaryToolsForSurface('planner'), []);
  const emptyCopy = EMPTY_COPY[view];
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 메시지 도착 + 스트리밍 중 본문 변경 시 자동 스크롤 끝.
  // 사용자가 스크롤을 위로 올렸으면 (끝에서 80px 이상) 따라가지 않음 — 읽기 방해 X.
  const lastContentLenRef = useRef(0);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    (panel as HTMLElement & { inert: boolean }).inert = !open;
  }, [open]);

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

  // 입력 중 Esc는 텍스트 편집을 우선하고, 그 외 영역에서만 패널을 닫는다.
  useEscapeKey(() => onClose(), { enabled: open });

  return (
    <aside
      ref={panelRef}
      data-page-ai-panel="planner"
      data-page-ai-panel-open={open ? 'true' : 'false'}
      aria-hidden={!open}
      aria-label="보조 도구"
      className={cn(
        'fixed inset-0 z-50 flex h-full shrink-0 flex-col overflow-hidden sm:relative sm:inset-auto sm:z-auto sm:h-screen sm:min-h-0',
        PAGE_AI_PANEL_SURFACE_CLASS,
        PAGE_AI_PANEL_TRANSITION_CLASS,
        'w-full sm:w-[var(--ai-w)]',
        open
          ? 'translate-x-0'
          : 'translate-x-full pointer-events-none border-l-0 bg-transparent shadow-none max-sm:hidden sm:w-0 sm:translate-x-0',
      )}
      style={{ ['--ai-w' as string]: `${width}px` }}
      role="complementary"
    >
      <PageAiResizeHandle
        open={open}
        width={width}
        minWidth={minWidth}
        maxWidth={maxWidth}
        defaultWidth={PAGE_AI_PANEL_WIDTH.default}
        onWidthChange={onWidthChange}
      />

      {open && (
        <div className="flex h-full flex-col">
          {/* ── 헤더 ── */}
          <PageAiPanelHeader
            title="보조 도구"
            icon={<CalendarCheck className="h-3.5 w-3.5" aria-hidden />}
            iconTone="amber"
            onClose={onClose}
            leading={(
              <AuxiliaryToolTabs active={activeTool} onChange={setActiveTool} items={auxiliaryTools} />
            )}
            actions={(
              <>
                {activeTool === 'ai' && state.messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clear}
                    aria-label="대화 비우기"
                    title="대화 비우기"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          />

          {(
            <>
              {/* ── 메시지 영역 ── */}
              <div ref={scrollRef} className={cn(PAGE_AI_PANEL_SCROLL_CLASS, 'space-y-2.5')}>
                {state.messages.length === 0 ? (
                  <PageAiEmptyState
                    title={emptyCopy.title}
                    description={emptyCopy.description}
                  >
                    <AIQuickActions view={view} onPick={(p) => void send(p)} disabled={state.loading} />
                  </PageAiEmptyState>
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
                {state.loading && state.messages[state.messages.length - 1]?.role !== 'assistant' && (
                  <PageAiTypingIndicator />
                )}
              </div>

              {/* ── 메시지 있을 때만 하단 quick actions (컴팩트 칩 모드) ── */}
              {state.messages.length > 0 && !state.loading && (
                <div className="shrink-0 px-3 pb-2">
                  <AIQuickActions view={view} onPick={(p) => void send(p)} disabled={state.loading} compact />
                </div>
              )}

              {/* ── 입력창 ── */}
              <AIComposer
                onSend={(t) => void send(t)}
                onStop={state.loading ? stop : undefined}
                loading={state.loading}
                placeholder="일정 정리, 빈 시간, 다음 행동을 물어보세요..."
                autoFocus={open}
              />
            </>
          )}
        </div>
      )}
    </aside>
  );
};
