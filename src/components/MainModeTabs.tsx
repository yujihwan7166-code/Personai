/**
 * 메인 모드 탭 — GitHub 스타일 "아이콘 + 라벨 + underline".
 *
 * 검증된 다중 탭 패턴 (GitHub repo, Stripe dashboard, Shopify admin):
 *  - 아이콘이 시각 앵커 (12개 서로 다른 실루엣)
 *  - 라벨이 의미 (툴팁 없이도 바로 이해)
 *  - 활성 = bold + 모드 컬러 텍스트 + 2px mode-colored bottom underline
 *  - 비활성 = muted 텍스트, 작은 stroke icon
 *  - 박스·pill·채움·ring 전부 없음
 *  - 바텀 hairline 이 탭바와 본문을 구분
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

/** 짧은 라벨 — 한 줄에 12개 수용. 전체 이름은 title 속성 툴팁에. */
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
        const short = SHORT_LABEL[mode] ?? labels[mode];

        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            disabled={isDiscussing || transitionPhase !== 0}
            title={labels[mode]}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              // GitHub 스타일: 아이콘 + 라벨 + 바닥 underline. 박스 없음.
              'relative flex items-center gap-1.5 px-2.5 pt-2 pb-2.5 text-[12.5px] tracking-tight whitespace-nowrap transition-colors duration-150',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isActive
                ? showPlayerBg
                  ? 'text-white font-semibold'
                  : 'font-semibold'
                : showPlayerBg
                  ? 'text-slate-500 hover:text-slate-200'
                  : 'text-muted-foreground hover:text-foreground',
            )}
            style={isActive && !showPlayerBg ? { color: tint } : undefined}
          >
            <Icon
              className={cn('h-3.5 w-3.5 shrink-0', isActive && 'opacity-100', !isActive && 'opacity-80')}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            <span>{short}</span>

            {/* 활성 underline — 컨테이너 하단 hairline 과 겹쳐 그려짐, 모드 컬러 2px */}
            {isActive && (
              <motion.span
                layoutId={showPlayerBg ? 'main-mode-underline-player' : 'main-mode-underline'}
                aria-hidden
                className="absolute left-1 right-1 -bottom-px h-[2px] rounded-full"
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
