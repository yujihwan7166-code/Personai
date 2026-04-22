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
              // Chip/Pill 플로팅 패턴: 트랙 없음, 각 탭이 독립된 캡슐.
              // 비활성 = 얇은 hairline + muted 텍스트 / 활성 = 모드 컬러 채움 + mode-color border.
              'group relative flex items-center justify-center gap-1 min-w-0 px-3 py-1.5 rounded-full text-[12px] tracking-tight transition-all duration-200',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'border',
              isActive
                ? showPlayerBg
                  ? 'text-white font-semibold bg-slate-800 border-slate-700 shadow-sm'
                  : 'font-semibold shadow-sm'
                : showPlayerBg
                  ? 'text-slate-400 font-medium border-transparent hover:text-slate-200 hover:bg-white/5'
                  : 'text-slate-600 dark:text-slate-300 font-medium border-slate-200/80 dark:border-slate-700/60 hover:border-transparent',
            )}
            style={
              isActive && !showPlayerBg
                ? {
                    // 활성: 모드 컬러로 채움 (10% opacity 배경 + 40% border + 풀 컬러 텍스트)
                    color: tint,
                    backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`,
                    borderColor: `color-mix(in oklab, ${tint} 40%, transparent)`,
                  }
                : !showPlayerBg
                  ? {
                      // 호버 시 모드 컬러 힌트 (6% opacity) — CSS var 로 전달
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ['--tab-tint' as any]: tint,
                    }
                  : undefined
            }
          >
            {/* 비활성 호버 시 모드 컬러 힌트 배경 */}
            {!isActive && !showPlayerBg && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ backgroundColor: `color-mix(in oklab, ${tint} 8%, transparent)` }}
              />
            )}
            <AnimatePresence>
              {isActive && showPlayerBg && (
                <motion.div
                  key={`main-pill-player-${mode}`}
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
