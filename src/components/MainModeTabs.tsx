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
              // Phase G 업그레이드: "부드러운 알약" — 어포던스 살리고 모드 정체성 유지.
              'relative flex items-center justify-center gap-1 min-w-0 px-3 py-1.5 rounded-full text-[11.5px] tracking-tight transition-colors duration-150',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isActive
                ? showPlayerBg
                  ? 'text-white font-semibold'
                  : 'font-semibold'
                : showPlayerBg
                  ? 'text-slate-400 font-medium hover:text-slate-200'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60',
            )}
            style={
              isActive && !showPlayerBg
                ? {
                    color: MODE_TINT[mode],
                    background: mode === 'player'
                      ? 'linear-gradient(90deg, hsl(var(--mode-multi)/0.12), hsl(var(--mode-debate-b)/0.12), hsl(var(--mode-premium)/0.12))'
                      : `color-mix(in oklab, ${MODE_TINT[mode]} 12%, transparent)`,
                  }
                : undefined
            }
          >
            <AnimatePresence>
              {isActive && showPlayerBg && (
                <motion.div
                  key={`main-pill-${mode}`}
                  layoutId="main-mode-pill-player"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/25"
                />
              )}
            </AnimatePresence>
            <span className="relative z-10">{labels[mode]}</span>
          </button>
        );
      })}
    </>
  );
}
