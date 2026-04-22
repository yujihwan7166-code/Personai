/**
 * 메인 모드 스위처 — "워크스페이스 스위처" 패턴.
 *
 * 탭 나열 폐지. 현재 모드만 큰 pill 로 표시하고, 클릭하면 4x3 그룹핑 드롭다운 패널이 펼쳐짐.
 * 12개 모드를 한 줄에 나열해야 한다는 전제를 깨고, Slack / Notion / Linear 의 워크스페이스 스위처 패턴 채택.
 *
 * - 현재 모드: 아이콘 + 이름 + chevron
 * - 드롭다운: 4 카테고리 × 3 모드, 각 모드에 한 줄 설명 포함
 * - ⌘K 팔레트는 별개 경로로 계속 사용 가능
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

/** 모드별 아이콘. */
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

/** 모드별 시그니처 컬러. */
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

/** 카테고리 그룹핑 — 유저의 목적에 따라 4 버킷. */
const MODE_GROUPS: Array<{ label: string; description: string; modes: MainMode[] }> = [
  { label: '대화',  description: '질문하고 답받기',       modes: ['general', 'multi', 'translate_main'] },
  { label: '논의',  description: '여러 관점 · 역할극',     modes: ['debate', 'brainstorm_main', 'stakeholder_main'] },
  { label: '전문',  description: '심층 · 자문 · 학습',    modes: ['research_main', 'premium_main', 'study_main'] },
  { label: '도구',  description: '실무 작업 · 놀이',       modes: ['assistant', 'convert_main', 'player'] },
];

/** 모드별 한 줄 설명 (드롭다운에만 노출). */
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

  const effective = pendingMode ?? currentMode;
  const CurrentIcon = MODE_ICON[effective];
  const currentTint = MODE_TINT[effective];
  const disabled = isDiscussing || transitionPhase !== 0;

  // 외부 클릭 닫기
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

  return (
    <div ref={rootRef} className="relative">
      {/* 현재 모드 pill — 에디토리얼 큰 버튼 */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'group flex items-center gap-2.5 px-4 h-10 rounded-full transition-all duration-200',
          'border',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          showPlayerBg
            ? 'bg-slate-900/70 border-slate-700 text-white hover:bg-slate-900/90'
            : 'bg-[hsl(var(--card))] border-[hsl(var(--hairline))] text-foreground hover:border-[hsl(var(--border))] hover:shadow-sm',
        )}
        style={
          !showPlayerBg
            ? { boxShadow: `0 1px 2px hsl(220 15% 8% / 0.04), 0 0 0 3px color-mix(in oklab, ${currentTint} 10%, transparent)` }
            : undefined
        }
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full shrink-0"
          style={
            !showPlayerBg
              ? { backgroundColor: `color-mix(in oklab, ${currentTint} 14%, transparent)`, color: currentTint }
              : undefined
          }
        >
          <CurrentIcon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="text-[13.5px] font-semibold tracking-tight whitespace-nowrap">
          {labels[effective]}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ml-0.5', open && 'rotate-180')} />
      </button>

      {/* 드롭다운 패널 — 카테고리 그룹핑 그리드 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mode-switcher-panel"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            role="menu"
            className={cn(
              'absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-50',
              'w-[640px] max-w-[92vw] rounded-2xl overflow-hidden',
              'bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
              'shadow-[0_18px_60px_hsl(220_20%_5%_/_0.25)]',
            )}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">
              {MODE_GROUPS.map((group) => (
                <div key={group.label} className="min-w-0">
                  <div className="mb-1.5 flex items-baseline gap-2 px-1">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70 truncate">
                      {group.description}
                    </span>
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
                            'group/item flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
                            'hover:bg-[hsl(var(--accent))]',
                            isActive && 'bg-[hsl(var(--accent))]',
                          )}
                        >
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                            style={{
                              backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`,
                              color: tint,
                            }}
                          >
                            <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block text-[13px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                              {labels[m]}
                            </span>
                            <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                              {MODE_DESCRIPTION[m]}
                            </span>
                          </span>
                          {isActive && (
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: tint }}
                              aria-label="현재 모드"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[hsl(var(--hairline))] px-4 py-2.5 text-[10.5px] text-muted-foreground flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-[hsl(var(--hairline))] px-1 py-0.5 font-mono text-[9.5px]">⌘</kbd>
                <kbd className="rounded border border-[hsl(var(--hairline))] px-1 py-0.5 font-mono text-[9.5px]">K</kbd>
                <span className="ml-1">팔레트로도 열림</span>
              </span>
              <span className="ml-auto font-mono">모드 스위처</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
