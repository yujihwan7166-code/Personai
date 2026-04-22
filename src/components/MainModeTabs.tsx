/**
 * 메인 모드 탭 — "Primary 4 + 더 보기" 패턴.
 *
 * 업계 표준 (LinkedIn / Twitter / YouTube) 패턴: 자주 쓰는 4-5 탭만 노출,
 * 나머지는 "더 ▾" 드롭다운. iOS 세그먼트 컨트롤은 4-5 탭 범위에서 자연스럽게 작동.
 *
 * - Primary: general, multi, research_main, study_main (4개)
 * - 현재 모드가 Primary 에 없으면 5번째 슬롯에 동적 삽입
 * - 더 ▾: 나머지 모드를 그룹핑된 드롭다운 패널로
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MessageCircle, GitMerge, Users, Shield, Sparkles, Swords, Wrench, Gamepad2,
  FlaskConical, Globe, FileBox, BookOpen, ChevronDown,
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

/** 4 기본 노출 모드 — 가장 자주 쓰는 primary. */
const PRIMARY_MODES: MainMode[] = ['general', 'multi', 'research_main', 'study_main'];

/** 오버플로 드롭다운 그룹핑 — Primary 제외한 나머지 8 모드. */
const OVERFLOW_GROUPS: Array<{ label: string; modes: MainMode[] }> = [
  { label: '논의',  modes: ['debate', 'brainstorm_main', 'stakeholder_main'] },
  { label: '전문',  modes: ['premium_main'] },
  { label: '도구',  modes: ['assistant', 'translate_main', 'convert_main', 'player'] },
];

const MODE_DESCRIPTION: Record<MainMode, string> = {
  general:          'AI 를 골라 1:1 대화',
  multi:            '여러 AI 답변 비교',
  translate_main:   '언어 간 번역·교정',
  debate:           '찬반·자유·심층 토론',
  brainstorm_main:  '아이디어 발산·정리',
  stakeholder_main: '이해관계자 역할극',
  research_main:    '멀티 AI 교차 검증 리포트',
  premium_main:     '법률·의료·금융 자문',
  study_main:       '공부 노트북·퀴즈·팟캐스트',
  assistant:        '문서·번역·요약 실무',
  convert_main:     '파일 형식 변환',
  player:           '게임·퀴즈·스토리',
};

export function MainModeTabs({
  labels,
  currentMode,
  pendingMode,
  isDiscussing,
  transitionPhase,
  showPlayerBg,
  onChange,
}: MainModeTabsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const disabled = isDiscussing || transitionPhase !== 0;
  const effective = pendingMode ?? currentMode;

  // 외부 클릭/Esc 닫기
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSelect = (m: MainMode) => {
    setOpen(false);
    if (m !== currentMode) setTimeout(() => onChange(m), 40);
  };

  // 현재 모드가 Primary 에 없으면 5번째 슬롯에 동적 삽입
  const isCurrentInPrimary = PRIMARY_MODES.includes(effective);
  const displayedModes: MainMode[] = isCurrentInPrimary
    ? PRIMARY_MODES
    : [...PRIMARY_MODES.slice(0, 3), effective]; // 3 pinned + 현재

  const renderTab = (mode: MainMode) => {
    const isActive = effective === mode;
    const tint = MODE_TINT[mode];
    const Icon = MODE_ICON[mode];
    return (
      <button
        key={mode}
        onClick={() => !disabled && onChange(mode)}
        disabled={disabled}
        title={labels[mode]}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] tracking-tight transition-all duration-150',
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
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
        <span>{labels[mode]}</span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          'flex items-center gap-0.5 p-0.5 rounded-xl border',
          showPlayerBg
            ? 'bg-slate-900/50 border-slate-700/40'
            : 'bg-slate-100/70 dark:bg-slate-800/60 border-[hsl(var(--hairline))]',
        )}
      >
        {displayedModes.map(renderTab)}

        {/* 더 ▾ 버튼 — 오버플로우 드롭다운 트리거 */}
        <button
          type="button"
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium tracking-tight transition-colors duration-150',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            showPlayerBg
              ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-slate-900/40',
          )}
        >
          <span>더</span>
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </div>

      {/* 오버플로우 드롭다운 — 그룹핑된 패널 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            role="menu"
            className={cn(
              'absolute right-0 top-[calc(100%+6px)] z-50',
              'w-[440px] max-w-[92vw] rounded-xl overflow-hidden',
              'bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
              'shadow-[0_14px_44px_hsl(220_20%_5%_/_0.2)]',
            )}
          >
            <div className="p-2">
              {OVERFLOW_GROUPS.map((group) => (
                <div key={group.label} className="mb-2 last:mb-0">
                  <div className="px-2 pt-1 pb-1 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.modes.map((m) => {
                      const Icon = MODE_ICON[m];
                      const tint = MODE_TINT[m];
                      const isActive = m === currentMode;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelect(m)}
                          role="menuitem"
                          className={cn(
                            'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
                            'hover:bg-[hsl(var(--accent))]',
                            isActive && 'bg-[hsl(var(--accent))]',
                          )}
                        >
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
                            style={{
                              backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`,
                              color: tint,
                            }}
                          >
                            <Icon className="h-3 w-3" strokeWidth={isActive ? 2.2 : 1.8} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                              {labels[m]}
                            </span>
                            <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
                              {MODE_DESCRIPTION[m]}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
