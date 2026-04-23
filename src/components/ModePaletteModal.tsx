/**
 * 모드 팔레트 — 사이드바 "모드 · 도구" 버튼에서 열리는 플로팅 패널.
 *
 * 기존 중앙 모달에서 "플로팅 패널" 로 전환: 백드롭 제거, anchor(사이드바 버튼)
 * 기준으로 위치 계산, 외부 클릭/Esc 로 닫힘. MainModeTabs 드롭다운과 동일 톤.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import type { MainMode, DebateSubMode } from '@/types/expert';
import { cn } from '@/lib/utils';
import {
  MODE_GROUPS,
  MODE_ICON,
  MODE_TINT,
  MODE_DESCRIPTION,
  ASSISTANT_FEATURED_TOOLS,
  DEBATE_SUBS,
  LIFE_TOOLS,
  LIFE_TOOLS_FEATURED,
  LIFE_GROUP,
  PLAYER_TOOLS,
  PLAYER_TOOLS_FEATURED,
  PLAYER_GROUP,
} from './MainModeTabs';

interface ModePaletteModalProps {
  open: boolean;
  onClose: () => void;
  labels: Record<MainMode, string>;
  currentMode: MainMode;
  onChange: (mode: MainMode) => void;
  currentDebateSub?: DebateSubMode;
  onSelectDebateSub?: (sub: DebateSubMode) => void;
  currentAssistantCard?: string | null;
  onSelectAssistantCard?: (cardId: string) => void;
  onSelectLifeTool?: (toolId: string) => void;
  onSelectPlayerTool?: (toolId: string) => void;
  /** 트리거 요소(사이드바 버튼) rect — 패널 위치 앵커링용. null 이면 중앙 폴백. */
  anchorRect?: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null;
}

const PANEL_W = 960;
const PANEL_GAP = 8;
const VIEWPORT_MARGIN = 16;

export function ModePaletteModal({
  open,
  onClose,
  labels,
  currentMode,
  onChange,
  currentDebateSub,
  onSelectDebateSub,
  currentAssistantCard,
  onSelectAssistantCard,
  onSelectLifeTool,
  onSelectPlayerTool,
  anchorRect,
}: ModePaletteModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  // Esc 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 외부 클릭 감지 — 백드롭 없이 document 레벨 mousedown 사용
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    // defer 1 tick — 패널을 여는 클릭과 충돌 방지
    const t = window.setTimeout(() => window.addEventListener('mousedown', onDown), 0);
    return () => { window.clearTimeout(t); window.removeEventListener('mousedown', onDown); };
  }, [open, onClose]);

  // anchor 기준 패널 위치 계산 — 사이드바 버튼 오른쪽, 버튼 top 과 얼라인
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (!anchorRect) {
        // 폴백: 뷰포트 중앙 상단
        const left = Math.max(VIEWPORT_MARGIN, Math.min((vw - PANEL_W) / 2, vw - PANEL_W - VIEWPORT_MARGIN));
        setPanelPos({ top: 64, left });
        return;
      }
      // 가로: 버튼 오른쪽 + gap, 뷰포트 안으로 clamp
      let left = anchorRect.right + PANEL_GAP;
      if (left + PANEL_W > vw - VIEWPORT_MARGIN) {
        left = Math.max(VIEWPORT_MARGIN, vw - PANEL_W - VIEWPORT_MARGIN);
      }
      // 세로: 버튼 top 과 얼라인, 뷰포트 초과 시 위로 올림
      let top = anchorRect.top;
      if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
      if (top + 560 > vh - VIEWPORT_MARGIN) top = Math.max(VIEWPORT_MARGIN, vh - 560 - VIEWPORT_MARGIN);
      setPanelPos({ top, left });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRect]);

  const handleSelectMode = (m: MainMode) => {
    onClose();
    if (m !== currentMode) setTimeout(() => onChange(m), 40);
  };
  const handleSelectDebateSub = (sub: DebateSubMode) => {
    onClose();
    setTimeout(() => onSelectDebateSub?.(sub), 40);
  };
  const handleSelectAssistantTool = (cardId: string) => {
    onClose();
    setTimeout(() => onSelectAssistantCard?.(cardId), 40);
  };
  const handleSelectLifeTool = (toolId: string) => {
    onClose();
    if (onSelectLifeTool) {
      setTimeout(() => onSelectLifeTool(toolId), 40);
    } else {
      if (currentMode !== 'general') setTimeout(() => onChange('general'), 40);
    }
  };
  const handleSelectPlayerTool = (toolId: string) => {
    onClose();
    if (onSelectPlayerTool) {
      setTimeout(() => onSelectPlayerTool(toolId), 40);
    } else {
      if (currentMode !== 'general') setTimeout(() => onChange('general'), 40);
    }
  };

  /* ── Item renderers ─────────────────────────────── */

  const renderModeItem = (m: MainMode) => {
    const Icon = MODE_ICON[m];
    const tint = MODE_TINT[m];
    const isActive = m === currentMode;
    return (
      <button
        key={m}
        type="button"
        onClick={() => handleSelectMode(m)}
        role="menuitem"
        className={cn(
          'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
          'hover:bg-[hsl(var(--accent))]',
          isActive && 'bg-[hsl(var(--accent))]',
        )}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{ backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`, color: tint }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {labels[m]}
          </span>
          {MODE_DESCRIPTION[m] && (
            <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
              {MODE_DESCRIPTION[m]}
            </span>
          )}
        </span>
      </button>
    );
  };

  const renderDebateSubItem = (sub: typeof DEBATE_SUBS[number]) => {
    const Icon = sub.icon;
    const isActive = currentMode === 'debate' && currentDebateSub === sub.key;
    return (
      <button
        key={sub.key}
        type="button"
        onClick={() => handleSelectDebateSub(sub.key)}
        role="menuitem"
        className={cn(
          'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
          'hover:bg-[hsl(var(--accent))]',
          isActive && 'bg-[hsl(var(--accent))]',
        )}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{ backgroundColor: `color-mix(in oklab, ${sub.tint} 12%, transparent)`, color: sub.tint }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {sub.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">{sub.desc}</span>
        </span>
      </button>
    );
  };

  const renderAssistantToolItem = (tool: typeof ASSISTANT_FEATURED_TOOLS[number]) => {
    const Icon = tool.icon;
    const isActive = currentMode === 'assistant' && currentAssistantCard === tool.cardId;
    return (
      <button
        key={`tool-${tool.cardId}`}
        type="button"
        onClick={() => handleSelectAssistantTool(tool.cardId)}
        role="menuitem"
        className={cn(
          'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
          'hover:bg-[hsl(var(--accent))]',
          isActive && 'bg-[hsl(var(--accent))]',
        )}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)`, color: tool.tint }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {tool.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">{tool.desc}</span>
        </span>
      </button>
    );
  };

  const renderPlayerToolItem = (tool: typeof PLAYER_TOOLS[number]) => (
    <button
      key={`player-${tool.id}`}
      type="button"
      onClick={() => handleSelectPlayerTool(tool.id)}
      role="menuitem"
      className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))]"
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
        style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)` }}
      >
        <span className="text-[15px] leading-none select-none">{tool.emoji}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-tight truncate font-medium text-foreground/90">{tool.label}</span>
        {tool.desc && <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">{tool.desc}</span>}
      </span>
    </button>
  );

  const renderLifeToolItem = (tool: typeof LIFE_TOOLS[number]) => (
    <button
      key={`life-${tool.id}`}
      type="button"
      onClick={() => handleSelectLifeTool(tool.id)}
      role="menuitem"
      className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))]"
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
        style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)` }}
      >
        <span className="text-[15px] leading-none select-none">{tool.emoji}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-tight truncate font-medium text-foreground/90">{tool.label}</span>
        {tool.desc && <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">{tool.desc}</span>}
      </span>
    </button>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && panelPos && (
        <motion.div
          ref={panelRef}
          key="mode-palette-panel"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
          role="dialog"
          aria-label="모드 팔레트"
          style={{ position: 'fixed', top: panelPos.top, left: panelPos.left }}
          className={cn(
            'z-[200]',
            'w-[960px] max-w-[calc(100vw-32px)] rounded-2xl overflow-hidden',
            'bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
            'shadow-[0_18px_60px_hsl(220_20%_5%_/_0.25)]',
            'relative flex flex-col',
          )}
        >
          {/* 4 컬럼 그리드 — 내부 스크롤 (뷰포트 초과 시) */}
          <div
            className="grid grid-cols-4 gap-x-3 p-4 pb-6 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ maxHeight: `calc(100vh - ${panelPos.top + 24}px)` }}
          >
              {/* 왼쪽·가운데 컬럼 */}
              {[[0, 2], [1, 3]].map(([i1, i2], colIdx) => (
                <div key={colIdx} className="min-w-0 space-y-3">
                  {[MODE_GROUPS[i1], MODE_GROUPS[i2]].map((group) => (
                    <div key={group.label}>
                      <div className="mb-1.5 flex items-baseline gap-2 px-1">
                        <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                          {group.label}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground/70 truncate">
                          {group.description}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {group.label === 'AI 어시스턴트' ? (
                          <>
                            {ASSISTANT_FEATURED_TOOLS.map(renderAssistantToolItem)}
                            <div className="my-1 mx-2 border-t border-[hsl(var(--hairline))]" aria-hidden />
                            <button
                              type="button"
                              onClick={() => handleSelectMode('assistant')}
                              role="menuitem"
                              className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))] text-muted-foreground hover:text-foreground"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 bg-[hsl(var(--surface-2))] text-muted-foreground">
                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                              </span>
                              <span className="min-w-0 flex-1 flex items-center gap-1.5">
                                <span className="text-[12px] font-medium">도구 더 보기</span>
                                <span className="text-[10px] font-mono text-muted-foreground/80 bg-[hsl(var(--surface-2))] px-1.5 py-0.5 rounded-full">
                                  +10
                                </span>
                              </span>
                            </button>
                          </>
                        ) : (
                          group.modes.flatMap((m) =>
                            m === 'debate'
                              ? DEBATE_SUBS.map(renderDebateSubItem)
                              : [renderModeItem(m)]
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {/* 오른쪽 컬럼: 라이프 (재미·건강·생활 통합) + 더보기 */}
              <div className="min-w-0 space-y-3">
                <div>
                  <div className="mb-1.5 flex items-baseline gap-2 px-1">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      {LIFE_GROUP.label}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70 truncate">
                      {LIFE_GROUP.description}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {LIFE_TOOLS_FEATURED.map(renderLifeToolItem)}
                  </div>
                </div>
              </div>
              {/* 맨 오른쪽 컬럼: 플레이어 */}
              <div className="min-w-0 space-y-3">
                <div>
                  <div className="mb-1.5 flex items-baseline gap-2 px-1">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      {PLAYER_GROUP.label}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70 truncate">
                      {PLAYER_GROUP.description}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {PLAYER_TOOLS_FEATURED.map(renderPlayerToolItem)}
                  </div>
                </div>
              </div>
            </div>
            {/* 하단 페이드 — 스크롤 가능 힌트 */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-b from-transparent to-[hsl(var(--card))]"
            />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
