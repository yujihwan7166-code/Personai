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
              // iOS segmented control 스타일: 트랙 안의 탭은 flat, 활성만 '떠오름'(raised).
              // 비활성 = 투명 + 흐린 텍스트 / 활성 = card 배경 + shadow + 모드 컬러.
              'relative flex items-center justify-center gap-1 min-w-0 px-3.5 py-1.5 rounded-md text-[12px] tracking-tight transition-all duration-150',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isActive
                ? showPlayerBg
                  ? 'text-white font-semibold bg-slate-800 shadow-sm ring-1 ring-slate-700'
                  : 'font-semibold bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                : showPlayerBg
                  ? 'text-slate-400 font-medium bg-white/5 hover:text-slate-200 hover:bg-white/10'
                  // 비활성 탭도 자기 배경 + 옅은 테두리로 각 셀 경계 확보 (트랙과 구분)
                  : 'text-slate-600 dark:text-slate-300 font-medium bg-white/60 dark:bg-slate-900/40 ring-1 ring-slate-200/70 dark:ring-slate-700/50 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900/70',
            )}
            style={
              isActive && !showPlayerBg
                ? { color: tint }
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
