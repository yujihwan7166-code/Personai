import { motion } from 'framer-motion';
import {
  MessageCircle, GitMerge, Users, Shield, Sparkles, Swords, Wrench, Gamepad2,
  FlaskConical, Globe, FileBox, BookOpen,
} from 'lucide-react';

import type { MainMode } from '@/types/expert';
import { cn } from '@/lib/utils';

/** 모드별 아이콘 — CommandPalette 와 동일. */
const MODE_ICON: Record<MainMode, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  general:          MessageCircle,
  multi:            GitMerge,
  brainstorm_main:  Sparkles,
  stakeholder_main: Users,
  premium_main:     Shield,
  debate:           Swords,
  assistant:        Wrench,
  player:           Gamepad2,
  research_main:    FlaskConical,
  translate_main:   Globe,
  convert_main:     FileBox,
  study_main:       BookOpen,
};

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
        const Icon = MODE_ICON[mode];

        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            disabled={isDiscussing || transitionPhase !== 0}
            title={labels[mode]}
            aria-label={labels[mode]}
            aria-pressed={isActive}
            className={cn(
              // 아이콘 탭 + 활성 라벨 확장: 비활성=아이콘만, 활성=아이콘+라벨, 모드 컬러 채움.
              'group relative flex items-center gap-1.5 h-9 rounded-full transition-all duration-200',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isActive ? 'px-3' : 'w-9 justify-center',
              isActive
                ? showPlayerBg
                  ? 'text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-sm'
                  : 'font-semibold shadow-sm'
                : showPlayerBg
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  : 'text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-[hsl(var(--accent))]',
            )}
            style={
              isActive && !showPlayerBg
                ? {
                    color: tint,
                    backgroundColor: `color-mix(in oklab, ${tint} 14%, transparent)`,
                  }
                : undefined
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
            {/* 활성 탭만 라벨 노출 — framer-motion 으로 부드럽게 펼쳐짐 */}
            {isActive && (
              <motion.span
                key={`label-${mode}`}
                layoutId="main-mode-label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                className="text-[12.5px] whitespace-nowrap overflow-hidden"
              >
                {labels[mode]}
              </motion.span>
            )}
          </button>
        );
      })}
    </>
  );
}
