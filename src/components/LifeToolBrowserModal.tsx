/**
 * 라이프 도구 브라우저 모달 — 사이드바 또는 드롭다운 "더 보기" 에서 열림.
 *
 * 라이프·재미 + 건강·실용 + 향후 추가될 카테고리 전체를 풀 그리드로 노출.
 * AssistantCardsPanel 과 유사한 카드 스타일.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { LIFE_TOOLS, LIFE_GROUPS } from './MainModeTabs';

interface LifeToolBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTool?: (toolId: string) => void;
}

export function LifeToolBrowserModal({ open, onClose, onSelectTool }: LifeToolBrowserModalProps) {
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
          key="life-browser-backdrop"
          className="fixed inset-0 z-[205] flex items-center justify-center bg-black/45 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="라이프 도구 전체 보기"
        >
          <motion.div
            key="life-browser-panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'w-[820px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-64px)] overflow-y-auto rounded-2xl',
              'bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
              'shadow-[0_18px_60px_hsl(220_20%_5%_/_0.35)]',
            )}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--hairline))]">
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight">라이프 도구</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  생활·재미·건강 — {LIFE_TOOLS.length}개 도구
                </p>
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

            {/* 그룹별 카드 그리드 */}
            <div className="p-5 space-y-6">
              {LIFE_GROUPS.map((group) => (
                <section key={group.label}>
                  <div className="mb-3 flex items-baseline gap-2 px-1">
                    <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground/70">
                      {group.description}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {group.items.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => handleSelect(tool.id)}
                        className={cn(
                          'group relative text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3',
                          'transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5',
                        )}
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[20px] shrink-0 transition-transform duration-200 group-hover:scale-105"
                            style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 14%, transparent)` }}
                          >
                            <span className="select-none leading-none">{tool.emoji}</span>
                          </div>
                          <span className="text-[13px] font-bold leading-tight truncate text-slate-800 dark:text-slate-100">
                            {tool.label}
                          </span>
                        </div>
                        {tool.desc && (
                          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                            {tool.desc}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              ))}

              {/* 향후 추가 예정 안내 */}
              <div className="mt-2 rounded-xl border border-dashed border-[hsl(var(--hairline))] px-4 py-3 text-center">
                <p className="text-[11.5px] text-muted-foreground">
                  ✨ 커뮤니케이션 · 창작 · 학습 도구가 곧 추가됩니다
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
