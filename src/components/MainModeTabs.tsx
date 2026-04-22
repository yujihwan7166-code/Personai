/**
 * 메인 모드 탭 — "2-Row" 패턴.
 *
 * 12 모드를 6+6 두 줄로 배치. iOS 세그먼트 컨트롤이 sweet spot (4-6 탭) 에서 작동하도록 레이아웃 변경.
 *
 * - 윗줄 (대화·논의): general, multi, translate, debate, brainstorm, stakeholder
 * - 아랫줄 (전문·도구): research, premium, study, assistant, convert, player
 * - 각 탭은 iOS 세그먼트 스타일: 비활성 flat, 활성 raised white card + mode color 텍스트
 * - 두 줄은 같은 track 배경 안에 들어가 하나의 컨트롤로 인지
 */
import { motion } from 'framer-motion';
import {
  MessageCircle, GitMerge, Users, Shield, Sparkles, Swords, Wrench, Gamepad2,
  FlaskConical, Globe, FileBox, BookOpen,
} from 'lucide-react';

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

/** 짧은 라벨 — 6 탭 × 2 줄 균형 유지. */
const SHORT_LABEL: Partial<Record<MainMode, string>> = {
  stakeholder_main: '시뮬',
  brainstorm_main:  '브레인',
  premium_main:     '자문',
  research_main:    '리서치',
  study_main:       '공부',
  translate_main:   '번역',
  convert_main:     '변환',
  assistant:        '어시',
  player:           '게임',
  general:          '일반',
  multi:            '멀티',
  debate:           '토론',
};

/** 2 줄 배치 — 의미상 그룹핑. */
const ROW_1: MainMode[] = ['general', 'multi', 'translate_main', 'debate', 'brainstorm_main', 'stakeholder_main'];
const ROW_2: MainMode[] = ['research_main', 'premium_main', 'study_main', 'assistant', 'convert_main', 'player'];

export function MainModeTabs({
  labels,
  currentMode,
  pendingMode,
  isDiscussing,
  transitionPhase,
  showPlayerBg,
  onChange,
}: MainModeTabsProps) {
  const disabled = isDiscussing || transitionPhase !== 0;

  const renderTab = (mode: MainMode) => {
    const isActive = currentMode === mode || pendingMode === mode;
    const tint = MODE_TINT[mode];
    const Icon = MODE_ICON[mode];
    const short = SHORT_LABEL[mode] ?? labels[mode];

    return (
      <button
        key={mode}
        onClick={() => onChange(mode)}
        disabled={disabled}
        title={labels[mode]}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'relative flex flex-1 items-center justify-center gap-1.5 min-w-0 px-2 py-1.5 rounded-md text-[12.5px] tracking-tight transition-all duration-150',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          isActive
            ? showPlayerBg
              ? 'text-white font-semibold bg-slate-800 shadow-sm'
              : 'font-semibold bg-white dark:bg-slate-900 shadow-sm'
            : showPlayerBg
              ? 'text-slate-400 font-medium hover:text-slate-200 hover:bg-white/5'
              : 'text-slate-600 dark:text-slate-300 font-medium hover:text-foreground hover:bg-white/60 dark:hover:bg-slate-900/40',
        )}
        style={isActive && !showPlayerBg ? { color: tint } : undefined}
      >
        {isActive && (
          <motion.span
            layoutId={showPlayerBg ? 'main-mode-raised-player' : 'main-mode-raised'}
            aria-hidden
            className="absolute inset-0 rounded-md"
            style={{
              backgroundColor: showPlayerBg ? 'rgb(30 41 59)' : undefined,
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
        )}
        <Icon className="relative z-10 h-3.5 w-3.5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
        <span className="relative z-10 whitespace-nowrap">{short}</span>
      </button>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 p-0.5 rounded-xl border w-full max-w-[720px]',
        showPlayerBg
          ? 'bg-slate-900/50 border-slate-700/40'
          : 'bg-slate-100/70 dark:bg-slate-800/60 border-[hsl(var(--hairline))]',
      )}
    >
      <div className="flex items-center gap-0.5">
        {ROW_1.map(renderTab)}
      </div>
      <div className="flex items-center gap-0.5">
        {ROW_2.map(renderTab)}
      </div>
    </div>
  );
}
