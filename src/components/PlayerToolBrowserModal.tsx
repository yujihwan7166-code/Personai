/**
 * 플레이어 도구 전체 페이지 — 드롭다운 "플레이어 더 보기" 로 트리거.
 *
 * LifeToolBrowserModal 과 동일한 풀 뷰포트 페이지 전환 UX.
 * 캐릭터 챗·AI 게임·롤플레이·RPG 등 놀이·가상 도구 모음.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PLAYER_TOOLS, PLAYER_GROUP } from './MainModeTabs';

interface PlayerToolBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTool?: (toolId: string) => void;
}

export function PlayerToolBrowserModal({ open, onClose, onSelectTool }: PlayerToolBrowserModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSelect = (toolId: string) => {
    onClose();
    setTimeout(() => onSelectTool?.(toolId), 40);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="player-landing"
          className="fixed inset-0 z-[200] bg-[hsl(var(--background))] overflow-y-auto"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          role="region"
          aria-label="플레이어 도구 전체"
        >
          {/* 상단 헤더 */}
          <div className="sticky top-0 z-10 border-b border-[hsl(var(--hairline))] bg-[hsl(var(--background))]/90 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-6 md:px-8 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--accent))] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>돌아가기</span>
              </button>
              <div className="h-4 w-px bg-[hsl(var(--hairline))]" />
              <div className="min-w-0">
                <h1 className="text-[14px] font-semibold tracking-tight leading-none">플레이어 도구</h1>
                <p className="text-[11px] text-muted-foreground mt-1">{PLAYER_GROUP.description} · {PLAYER_TOOLS.length}개</p>
              </div>
            </div>
          </div>

          {/* 본문 */}
          <div className="max-w-6xl mx-auto px-6 md:px-8 pt-8 pb-20">
            {/* 에디토리얼 헤더 */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-2">
                <span className="inline-block h-px w-6 bg-[hsl(var(--hairline))]" />
                Personai Play
                <span className="inline-block h-px w-6 bg-[hsl(var(--hairline))]" />
              </div>
              <h2 className="font-display font-semibold text-[22px] md:text-[26px] tracking-[-0.02em] leading-tight text-foreground">
                캐릭터 · 게임 · 롤플레이 — 놀이 AI
              </h2>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground max-w-[520px] mx-auto leading-snug">
                가상 캐릭터와 대화하고, 추리 게임을 풀고, AI 가 DM 인 스토리 RPG 도 도전해보세요
              </p>
            </div>

            {/* 도구 카드 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {PLAYER_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleSelect(tool.id)}
                  className={cn(
                    'group relative text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4',
                    'transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5',
                  )}
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[22px] shrink-0 transition-transform duration-200 group-hover:scale-105"
                      style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 14%, transparent)` }}
                    >
                      <span className="select-none leading-none">{tool.emoji}</span>
                    </div>
                    <span className="text-[14px] font-bold leading-tight truncate text-slate-800 dark:text-slate-100">
                      {tool.label}
                    </span>
                  </div>
                  {tool.desc && (
                    <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                      {tool.desc}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {/* 확장 예고 */}
            <div className="mt-10 rounded-2xl border border-dashed border-[hsl(var(--hairline))] px-5 py-5 text-center">
              <p className="text-[12px] text-muted-foreground">
                🎲 미니게임 · 인터랙티브 픽션 · 멀티 캐릭터 시나리오가 곧 추가됩니다
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
