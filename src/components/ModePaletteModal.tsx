/**
 * 모드 팔레트 모달 — 사이드바에서 열리는 전체 모드 브라우저.
 *
 * MainModeTabs 의 드롭다운 패널과 같은 3컬럼 그리드를 재사용하되, eyebrow pill 없이
 * 중앙에 full-screen overlay 형태로 표시. 사이드바의 "모드" 버튼으로 트리거.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';

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
  onOpenLifeBrowser?: () => void;
  onSelectPlayerTool?: (toolId: string) => void;
  onOpenPlayerBrowser?: () => void;
}

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
  onOpenLifeBrowser,
  onSelectPlayerTool,
  onOpenPlayerBrowser,
}: ModePaletteModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
      {open && (
        <motion.div
          key="mode-palette-backdrop"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="모드 팔레트"
        >
          <motion.div
            key="mode-palette-panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-[960px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-64px)] overflow-y-auto rounded-2xl',
              'bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
              'shadow-[0_18px_60px_hsl(220_20%_5%_/_0.35)]',
            )}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--hairline))]">
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight">모드 · 도구</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">원하는 모드나 도구를 선택하세요</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--accent))] flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 3 컬럼 그리드 — MainModeTabs 드롭다운과 동일 구조 */}
            <div className="grid grid-cols-4 gap-x-3 p-4">
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
                {onOpenLifeBrowser && (
                  <div>
                    <div className="my-1 mx-2 border-t border-[hsl(var(--hairline))]" aria-hidden />
                    <button
                      type="button"
                      onClick={() => { onClose(); setTimeout(() => onOpenLifeBrowser(), 40); }}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))] text-muted-foreground hover:text-foreground"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 bg-[hsl(var(--surface-2))] text-muted-foreground">
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1 flex items-center gap-1.5">
                        <span className="text-[12px] font-medium">라이프 더 보기</span>
                      </span>
                    </button>
                  </div>
                )}
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
                {onOpenPlayerBrowser && (
                  <div>
                    <div className="my-1 mx-2 border-t border-[hsl(var(--hairline))]" aria-hidden />
                    <button
                      type="button"
                      onClick={() => { onClose(); setTimeout(() => onOpenPlayerBrowser(), 40); }}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))] text-muted-foreground hover:text-foreground"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 bg-[hsl(var(--surface-2))] text-muted-foreground">
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1 flex items-center gap-1.5">
                        <span className="text-[12px] font-medium">플레이어 더 보기</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
