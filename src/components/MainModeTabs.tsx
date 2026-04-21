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
              // Phase G 정교화: 세 시각 신호 조합 (배경 틴트 + 진한 텍스트 + 글로우 밑줄).
              // 활성 상태가 확실히 도드라지면서도 8개 탭 전체 밀도는 가볍게 유지.
              'relative flex items-center justify-center gap-1 min-w-0 px-3.5 py-1.5 rounded-lg text-[12px] tracking-tight transition-all duration-200',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isActive
                ? showPlayerBg
                  ? 'text-white font-semibold'
                  : 'font-bold'
                : showPlayerBg
                  ? 'text-slate-400 font-medium hover:text-slate-200 hover:bg-white/5'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60',
            )}
            style={
              isActive && !showPlayerBg
                ? {
                    color: tint,
                    background: isPlayer
                      ? 'linear-gradient(90deg, hsl(var(--mode-multi)/0.10), hsl(var(--mode-debate-b)/0.10), hsl(var(--mode-premium)/0.10))'
                      : `color-mix(in oklab, ${tint} 10%, transparent)`,
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

            {/* 하단 3px 글로우 밑줄 — 모드 컬러 + 부드러운 drop shadow */}
            <AnimatePresence>
              {isActive && !showPlayerBg && (
                <motion.span
                  key={`main-underline-${mode}`}
                  layoutId="main-mode-underline"
                  initial={{ opacity: 0, scaleX: 0.6 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0.6 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute left-3 right-3 -bottom-[5px] h-[3px] rounded-full"
                  style={{
                    background: isPlayer
                      ? 'linear-gradient(90deg, hsl(var(--mode-multi)), hsl(var(--mode-debate-b)), hsl(var(--mode-premium)))'
                      : tint,
                    boxShadow: `0 2px 8px ${isPlayer ? 'hsl(var(--mode-multi)/0.35)' : `color-mix(in oklab, ${tint} 45%, transparent)`}`,
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
