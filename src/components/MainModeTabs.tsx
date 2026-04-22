import { motion } from 'framer-motion';

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
              // "챕터 메뉴" 타이포그래피 패턴: 박스·pill·ring·fill 모두 제거.
              // 타이포 굵기 + 2px underline 으로만 상태 표현 — 11개 반복돼도 노이즈 없음.
              'relative flex items-center justify-center px-1 pt-1.5 pb-2 text-[13px] tracking-tight transition-colors duration-150',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isActive
                ? showPlayerBg
                  ? 'text-white font-semibold'
                  : 'text-foreground font-semibold'
                : showPlayerBg
                  ? 'text-slate-500 font-medium hover:text-slate-200'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-foreground',
            )}
          >
            <span className="relative z-10">{labels[mode]}</span>
            {/* 활성 underline — framer-motion layoutId 로 탭 사이 부드럽게 슬라이드. 모드 컬러. */}
            {isActive && (
              <motion.span
                layoutId={showPlayerBg ? 'main-mode-underline-player' : 'main-mode-underline'}
                aria-hidden
                className="absolute inset-x-1 bottom-0 h-[2px] rounded-full"
                style={{ backgroundColor: showPlayerBg ? '#fff' : tint }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </>
  );
}
