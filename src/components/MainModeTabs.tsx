import { AnimatePresence, motion } from 'framer-motion';

import type { MainMode } from '@/types/expert';
import { cn } from '@/lib/utils';

interface MainModeTabsProps {
  modes: MainMode[];
  labels: Record<MainMode, string>;
  currentMode: MainMode;
  pendingMode: MainMode | null;
  isDiscussing: boolean;
  transitionPhase: number;
  showPlayerBg: boolean;
  onChange: (mode: MainMode) => void;
}

/** 모드별 시그니처 컬러 — Phase A 토큰과 동기화.
 *  active 탭의 underline 색을 모드에 따라 다르게 표시. */
const MODE_TINT: Record<MainMode, string> = {
  general:          'hsl(var(--mode-general))',
  multi:            'hsl(var(--mode-multi))',
  brainstorm_main:  'hsl(var(--mode-debate-a))',
  stakeholder_main: 'hsl(var(--mode-simulation))',
  premium_main:     'hsl(var(--mode-premium))',
  debate:           'hsl(var(--mode-debate-a))',
  assistant:        'hsl(var(--mode-assistant))',
  player:           'hsl(var(--mode-multi))',
  research_main:    'hsl(var(--mode-research))',
  translate_main:   'hsl(var(--mode-assistant))',
  convert_main:     'hsl(var(--mode-general))',
  study_main:       'hsl(var(--mode-study))',
};

export function MainModeTabs({
  modes,
  labels,
  currentMode,
  pendingMode,
  isDiscussing,
  transitionPhase,
  showPlayerBg,
  onChange,
}: MainModeTabsProps) {
  return (
    <>
      {modes.map((mode) => {
        const isActive = currentMode === mode || pendingMode === mode;

        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            disabled={isDiscussing || transitionPhase !== 0}
            className={cn(
              // Phase G: 알약 → 밑줄 스타일. 탭 사이 간격은 유지, 높이 살짝 축소.
              'relative flex items-center justify-center gap-1 min-w-0 px-2.5 py-1.5 text-[11.5px] tracking-tight transition-colors duration-150',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isActive
                ? showPlayerBg
                  ? 'text-white font-semibold'
                  : 'text-slate-900 dark:text-slate-100 font-semibold'
                : showPlayerBg
                  ? 'text-slate-400 font-medium hover:text-slate-200'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-100',
            )}
          >
            <span className="relative z-10">{labels[mode]}</span>
            {/* Phase G: 활성 탭 하단 2px 밑줄 — 모드 시그니처 컬러 */}
            <AnimatePresence>
              {isActive && (
                <motion.span
                  key={`main-underline-${mode}`}
                  layoutId="main-mode-underline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute left-2.5 right-2.5 bottom-[-1px] h-[2px] rounded-full"
                  style={{
                    background: mode === 'player'
                      ? 'linear-gradient(90deg, hsl(var(--mode-multi)), hsl(var(--mode-debate-b)), hsl(var(--mode-premium)))'
                      : MODE_TINT[mode],
                  }}
                />
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </>
  );
}
