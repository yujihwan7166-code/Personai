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
        const tint = MODE_TINT[mode];
        const isPlayer = mode === 'player';

        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            disabled={isDiscussing || transitionPhase !== 0}
            className={cn(
              // 각 탭에 영구 배경 + 얇은 테두리로 '개별 버튼' 임을 명확히.
              // 비활성 탭도 슬레이트 톤 카드처럼 보여 어포던스 강화.
              'relative flex items-center justify-center gap-1 min-w-0 px-3.5 py-1.5 rounded-lg text-[12px] tracking-tight transition-colors duration-150 border',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isActive
                ? showPlayerBg
                  ? 'text-white font-semibold border-transparent'
                  : 'font-semibold'
                : showPlayerBg
                  ? 'text-slate-400 font-medium bg-white/5 border-white/10 hover:text-slate-200 hover:bg-white/10 hover:border-white/20'
                  : 'text-slate-600 dark:text-slate-300 font-medium bg-[hsl(var(--card))] border-[hsl(var(--hairline))] hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-[1px] hover:shadow-sm',
            )}
            style={
              isActive && !showPlayerBg
                ? {
                    color: tint,
                    background: isPlayer
                      ? 'linear-gradient(90deg, hsl(var(--mode-multi)/0.14), hsl(var(--mode-debate-b)/0.14), hsl(var(--mode-premium)/0.14))'
                      : `color-mix(in oklab, ${tint} 14%, transparent)`,
                    borderColor: isPlayer ? 'transparent' : `color-mix(in oklab, ${tint} 30%, transparent)`,
                  }
                : undefined
            }
          >
            <AnimatePresence>
              {isActive && showPlayerBg && (
                <motion.div
                  key={`main-pill-player-${mode}`}
                  layoutId="main-mode-pill-player"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/25"
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
