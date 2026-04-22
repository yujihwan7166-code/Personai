/**
 * 메인 모드 네비 — "Eyebrow Pill" 패턴.
 *
 * 페이지 헤더 메타로서의 모드 표시. 작은 pill + 드롭다운 패널.
 * 드롭다운은 8개 주요 모드만 노출, AI 토론은 하위(찬반/자유/심층/브레인) 인라인 표시.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MessageCircle, GitMerge, Shield, Sparkles, Swords, Wrench,
  FlaskConical, BookOpen, ChevronDown, MessagesSquare, Telescope,
  Globe, FileText, Presentation, Mic, ArrowRight,
} from 'lucide-react';

import type { MainMode, DebateSubMode } from '@/types/expert';
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
  /** 현재 debate 서브 모드 (toggle 표시용). */
  currentDebateSub?: DebateSubMode;
  /** AI 토론 하위 (찬반/자유/심층/브레인) 선택 콜백. */
  onSelectDebateSub?: (sub: DebateSubMode) => void;
  /** 현재 어시스턴트 카드 id (toggle 표시용). */
  currentAssistantCard?: string | null;
  /** 어시스턴트 도구 (번역/문서/PPT/음성) 빠른 선택 콜백. */
  onSelectAssistantCard?: (cardId: string) => void;
}

const MODE_ICON: Record<MainMode, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  general:          MessageCircle,
  multi:            GitMerge,
  brainstorm_main:  Sparkles,
  stakeholder_main: Sparkles,
  premium_main:     Shield,
  debate:           Swords,
  assistant:        Wrench,
  player:           Sparkles,
  research_main:    FlaskConical,
  translate_main:   Sparkles,
  convert_main:     Sparkles,
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

/** 사용자 요청 목록에 맞춘 4 그룹 그룹핑. */
const MODE_GROUPS: Array<{ label: string; description: string; modes: MainMode[] }> = [
  { label: '대화',  description: '질문하고 답받기',     modes: ['general', 'multi', 'research_main'] },
  { label: '전문',  description: '자문 · 학습',         modes: ['study_main', 'premium_main'] },
  { label: '논의',  description: '토론 · 브레인스토밍', modes: ['debate'] },
  { label: 'AI 어시스턴트',  description: '실무 도구',      modes: ['assistant'] },
];

const MODE_DESCRIPTION: Partial<Record<MainMode, string>> = {
  general:       'AI 를 골라 1:1 대화',
  multi:         '여러 AI 답변 비교',
  debate:        '찬반·자유·심층·브레인스토밍',
  research_main: '멀티 AI 교차 검증 리포트',
  premium_main:  '법률·의료·금융 자문',
  study_main:    '공부 노트북·퀴즈·팟캐스트',
  assistant:     '전체 도구 14+ 브라우즈',
};

/** 어시스턴트에서 노출할 핵심 도구 4개. 나머지 10+ 도구는 "어시스턴트 전체" 로 접근. */
const ASSISTANT_FEATURED_TOOLS: Array<{
  cardId: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: string;
}> = [
  { cardId: 'translate',      label: '다국어 번역', desc: '언어 간 번역·교정',      icon: Globe,        tint: 'hsl(262 70% 55%)' },
  { cardId: 'document',       label: '문서 작성',   desc: '보고서·이메일·제안서',   icon: FileText,     tint: 'hsl(160 60% 40%)' },
  { cardId: 'ppt',            label: 'PPT 생성',    desc: '프레젠테이션 자동',      icon: Presentation, tint: 'hsl(160 60% 40%)' },
  { cardId: 'voice-analysis', label: '음성 분석',   desc: '음성→텍스트·요약',       icon: Mic,          tint: 'hsl(330 65% 52%)' },
];

/** 토론 서브모드 정의 — 각자 독립 항목으로 논의 그룹에 직접 노출. 각자 고유 색. */
const DEBATE_SUBS: Array<{
  key: DebateSubMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: string;
}> = [
  { key: 'procon',     label: '찬반토론',     desc: '찬성 · 반대 구조',    icon: Swords,         tint: 'hsl(var(--mode-debate-b))' },     // red — 대립
  { key: 'freetalk',   label: '자유토론',     desc: '정해진 형식 없이',    icon: MessagesSquare, tint: 'hsl(188 85% 40%)' },               // cyan — 자유로움
  { key: 'standard',   label: '심층토론',     desc: '다각도 분석',         icon: Telescope,      tint: 'hsl(var(--mode-research))' },      // navy — 깊이
  { key: 'brainstorm', label: '브레인스토밍', desc: '아이디어 발산',       icon: Sparkles,       tint: 'hsl(var(--mode-study))' },         // amber — 번뜩임
];

export function MainModeTabs({
  labels,
  currentMode,
  pendingMode,
  isDiscussing,
  transitionPhase,
  showPlayerBg,
  onChange,
  currentDebateSub,
  onSelectDebateSub,
  currentAssistantCard,
  onSelectAssistantCard,
}: MainModeTabsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const disabled = isDiscussing || transitionPhase !== 0;
  const effective = pendingMode ?? currentMode;
  const CurrentIcon = MODE_ICON[effective];
  const currentTint = MODE_TINT[effective];

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const update = () => {
      if (!rootRef.current) return;
      const r = rootRef.current.getBoundingClientRect();
      const PANEL_W = 620;
      const vw = window.innerWidth;
      let left = r.left + r.width / 2 - PANEL_W / 2;
      left = Math.max(16, Math.min(left, vw - PANEL_W - 16));
      setPanelPos({ top: r.bottom + 8, left });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
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

  const handleSelectSub = (sub: DebateSubMode) => {
    setOpen(false);
    setTimeout(() => onSelectDebateSub?.(sub), 40);
  };

  const handleSelectAssistantTool = (cardId: string) => {
    setOpen(false);
    setTimeout(() => onSelectAssistantCard?.(cardId), 40);
  };

  const renderModeItem = (m: MainMode) => {
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
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{
            backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`,
            color: tint,
          }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {labels[m]}
          </span>
          {MODE_DESCRIPTION[m] && (
            <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
              {MODE_DESCRIPTION[m]}
            </span>
          )}
        </span>
      </button>
    );
  };

  /** 어시스턴트 개별 도구를 mode 아이템과 동일한 형태로 렌더. */
  const renderAssistantToolItem = (tool: typeof ASSISTANT_FEATURED_TOOLS[number]) => {
    const Icon = tool.icon;
    const isActive = currentMode === 'assistant' && currentAssistantCard === tool.cardId;
    return (
      <button
        key={`tool-${tool.cardId}`}
        type="button"
        onClick={() => handleSelectAssistantTool(tool.cardId)}
        role="menuitem"
        className={cn(
          'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
          'hover:bg-[hsl(var(--accent))]',
          isActive && 'bg-[hsl(var(--accent))]',
        )}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{
            backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)`,
            color: tool.tint,
          }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {tool.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
            {tool.desc}
          </span>
        </span>
      </button>
    );
  };

  /** 토론 서브 항목을 일반 모드 아이템과 동일한 형태로 렌더 — parent 'AI 토론' 없이 평면 구조. */
  const renderDebateSubItem = (sub: typeof DEBATE_SUBS[number]) => {
    const tint = sub.tint;
    const Icon = sub.icon;
    const isActive = currentMode === 'debate' && currentDebateSub === sub.key;
    return (
      <button
        key={sub.key}
        type="button"
        onClick={() => handleSelectSub(sub.key)}
        role="menuitem"
        className={cn(
          'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
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
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {sub.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
            {sub.desc}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'group flex items-center gap-1.5 h-7 pl-2 pr-2 rounded-full transition-all duration-200',
          'text-[11.5px] font-medium tracking-tight',
          'border',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          showPlayerBg
            ? 'bg-slate-900/70 border-slate-700 text-white hover:bg-slate-900/90'
            : 'bg-[hsl(var(--card))] border-[hsl(var(--hairline))] hover:border-[hsl(var(--border))]',
        )}
        style={!showPlayerBg ? { color: currentTint } : undefined}
      >
        <CurrentIcon className="h-3 w-3 shrink-0" strokeWidth={2.2} />
        <span className="whitespace-nowrap font-semibold">{labels[effective]}</span>
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
        {open && panelPos && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            role="menu"
            style={{ position: 'fixed', top: panelPos.top, left: panelPos.left }}
            className={cn(
              'z-[120]',
              'w-[620px] max-w-[calc(100vw-32px)] rounded-2xl overflow-hidden',
              'bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
              'shadow-[0_18px_60px_hsl(220_20%_5%_/_0.25)]',
            )}
          >
            {/* 2 컬럼 독립 흐름 — grid 2x2 로 높이 맞추지 않고 각 컬럼이 자기 높이만큼.
                왼쪽: 대화 + 전문, 오른쪽: 논의 + 도구. 빈 공간 제거. */}
            <div className="grid grid-cols-2 gap-x-4 p-4">
              {[[0, 2], [1, 3]].map(([i1, i2], colIdx) => (
                /* LEFT: 대화(0) + 논의(2) 7행 · RIGHT: 전문(1) + 도구(3) 7행 — 균형 */
                <div key={colIdx} className="min-w-0 space-y-3">
                  {[MODE_GROUPS[i1], MODE_GROUPS[i2]].map((group) => (
                    <div key={group.label}>
                      <div className="mb-1.5 flex items-baseline gap-2 px-1">
                        <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                          {group.label}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground/70 truncate">
                          {group.description}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {/* AI 어시스턴트 그룹: 대표 4 도구 먼저, 구분선 + "더 보기" 링크 */}
                        {group.label === 'AI 어시스턴트' ? (
                          <>
                            {ASSISTANT_FEATURED_TOOLS.map(renderAssistantToolItem)}
                            <div className="my-1 mx-2 border-t border-[hsl(var(--hairline))]" aria-hidden />
                            <button
                              type="button"
                              onClick={() => handleSelect('assistant')}
                              role="menuitem"
                              className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))] text-muted-foreground hover:text-foreground"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 bg-[hsl(var(--surface-2))] text-muted-foreground">
                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                              </span>
                              <span className="min-w-0 flex-1 flex items-center gap-1.5">
                                <span className="text-[12px] font-medium">도구 더 보기</span>
                                <span className="text-[10px] font-mono text-muted-foreground/80 bg-[hsl(var(--surface-2))] px-1.5 py-0.5 rounded-full">
                                  +10
                                </span>
                              </span>
                            </button>
                          </>
                        ) : (
                          group.modes.flatMap((m) =>
                            m === 'debate'
                              ? DEBATE_SUBS.map(renderDebateSubItem)
                              : [renderModeItem(m)]
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="border-t border-[hsl(var(--hairline))] px-4 py-2 text-[10.5px] text-muted-foreground flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-[hsl(var(--hairline))] px-1 py-0.5 font-mono text-[9.5px]">⌘</kbd>
                <kbd className="rounded border border-[hsl(var(--hairline))] px-1 py-0.5 font-mono text-[9.5px]">K</kbd>
                <span className="ml-1">팔레트로도 열림</span>
              </span>
            </div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
