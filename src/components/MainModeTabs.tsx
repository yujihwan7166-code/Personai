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
  Globe, Presentation, Mic, ArrowRight, Users, Wand2,
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
  /** 라이프·재미 도구 (사주/타로/연애/운동 등) 선택 콜백. 없으면 일반 채팅으로 폴백. */
  onSelectLifeTool?: (toolId: string) => void;
  /** 라이프 도구 "더 보기" 클릭 — LifeToolBrowserModal 트리거. */
  onOpenLifeBrowser?: () => void;
}

/** 라이프 그룹 도구 정의 — 엔터테인먼트·건강·생활 통합. */
export const LIFE_TOOLS: Array<{
  id: string;
  label: string;
  desc?: string;
  emoji: string;
  tint: string;
  /** 드롭다운 노출 여부. false 면 "라이프 더 보기" 모달에서만 노출. */
  featured: boolean;
}> = [
  { id: 'saju',       label: 'AI 사주',       desc: '생년월일 + MBTI 풀이',  emoji: '🔮', tint: 'hsl(262 83% 58%)', featured: true  },
  { id: 'tarot',      label: '타로 · MBTI',   desc: '카드 뽑기 · 성격 분석', emoji: '🎴', tint: 'hsl(320 70% 55%)', featured: true  },
  { id: 'dream',      label: '꿈 해몽',       desc: '꿈 내용 → 상징 해석',   emoji: '🌙', tint: 'hsl(240 60% 58%)', featured: true  },
  { id: 'dating',     label: '연애 코치',     desc: '썸·데이트·이별 조언',   emoji: '💌', tint: 'hsl(350 80% 62%)', featured: true  },
  { id: 'workout',    label: '운동 코치',     desc: '홈트·헬스·요가 루틴',   emoji: '💪', tint: 'hsl(155 65% 45%)', featured: true  },
  { id: 'recipe',     label: '레시피',        desc: '냉장고 재료로 요리',    emoji: '🍳', tint: 'hsl(18 80% 55%)',  featured: true  },
  { id: 'travel',     label: '여행 계획',     desc: '목적지·일정·예산',      emoji: '✈️', tint: 'hsl(195 80% 50%)', featured: true  },
  { id: 'journal',    label: '감정 일기',     desc: '오늘 기분 정리·공감',    emoji: '📔', tint: 'hsl(32 80% 55%)',  featured: false },
  { id: 'meditation', label: '명상',          desc: '불안·집중·잠들기',      emoji: '🧘', tint: 'hsl(175 55% 45%)', featured: false },
];

/** 드롭다운 노출용 featured 서브셋. */
export const LIFE_TOOLS_FEATURED = LIFE_TOOLS.filter((t) => t.featured);

/** 단일 라이프 그룹 (재미·건강·생활 통합). 드롭다운과 모달에서 header 에 사용. */
export const LIFE_GROUP = {
  label: '라이프',
  description: '운세·감정·건강·생활',
};

export const MODE_ICON: Record<MainMode, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  general:          MessageCircle,
  multi:            GitMerge,
  brainstorm_main:  Sparkles,
  stakeholder_main: Users,
  premium_main:     Shield,
  debate:           Swords,
  assistant:        Wrench,
  player:           Sparkles,
  research_main:    FlaskConical,
  translate_main:   Globe,
  convert_main:     Sparkles,
  study_main:       BookOpen,
  voice_main:       Mic,
  media_main:       Wand2,
};

export const MODE_TINT: Record<MainMode, string> = {
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
  voice_main:       'hsl(var(--mode-assistant))',
  media_main:       'hsl(var(--mode-assistant))',
};

/** 사용자 요청 목록에 맞춘 4 그룹 그룹핑. */
export const MODE_GROUPS: Array<{ label: string; description: string; modes: MainMode[] }> = [
  { label: '대화',  description: '질문하고 답받기',       modes: ['general', 'multi', 'research_main'] },
  { label: '전문',  description: '자문 · 학습',           modes: ['study_main', 'premium_main', 'stakeholder_main'] },
  { label: '논의',  description: '토론 · 브레인스토밍',   modes: ['debate'] },
  { label: 'AI 어시스턴트',  description: '실무 도구',      modes: ['assistant'] },
];

export const MODE_DESCRIPTION: Partial<Record<MainMode, string>> = {
  general:          'AI 를 골라 1:1 대화',
  multi:            '여러 AI 답변 비교',
  debate:           '찬반·자유·심층·브레인스토밍',
  stakeholder_main: '이해관계자 역할극 시뮬레이션',
  research_main:    '멀티 AI 교차 검증 리포트',
  premium_main:     '법률·의료·금융 자문',
  study_main:       '공부 노트북·퀴즈·팟캐스트',
  assistant:        '전체 도구 브라우즈',
};

/** 어시스턴트에서 노출할 핵심 도구 4개. 순서: 이미지 → 음성 → PPT → 번역. */
export const ASSISTANT_FEATURED_TOOLS: Array<{
  cardId: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: string;
}> = [
  { cardId: 'image-gen',      label: '이미지·동영상', desc: '프롬프트로 생성',      icon: Wand2,        tint: 'hsl(32 95% 50%)' },
  { cardId: 'voice-analysis', label: '음성 분석',     desc: '음성→텍스트·요약',     icon: Mic,          tint: 'hsl(330 65% 52%)' },
  { cardId: 'ppt',            label: 'PPT 생성',      desc: '프레젠테이션 자동',     icon: Presentation, tint: 'hsl(160 60% 40%)' },
  { cardId: 'translate',      label: '다국어 번역',   desc: '언어 간 번역·교정',    icon: Globe,        tint: 'hsl(262 70% 55%)' },
];

/** 토론 서브모드 정의 — 각자 독립 항목으로 논의 그룹에 직접 노출. 각자 고유 색. */
export const DEBATE_SUBS: Array<{
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
  onSelectLifeTool,
  onOpenLifeBrowser,
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
      const PANEL_W = 760;
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

  const handleSelectLifeTool = (toolId: string) => {
    setOpen(false);
    if (onSelectLifeTool) {
      setTimeout(() => onSelectLifeTool(toolId), 40);
    } else {
      // 폴백: 일반 채팅으로 이동 (핸들러 미연결 시)
      if (currentMode !== 'general') setTimeout(() => onChange('general'), 40);
    }
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
  /** 라이프·재미 도구 아이템 — 이모지 기반 아이콘 + 각자 고유 tint. */
  const renderLifeToolItem = (tool: typeof LIFE_TOOLS[number]) => (
    <button
      key={`life-${tool.id}`}
      type="button"
      onClick={() => handleSelectLifeTool(tool.id)}
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
        'hover:bg-[hsl(var(--accent))]',
      )}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
        style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)` }}
      >
        <span className="text-[15px] leading-none select-none">{tool.emoji}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-tight truncate font-medium text-foreground/90">
          {tool.label}
        </span>
        {tool.desc && (
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
            {tool.desc}
          </span>
        )}
      </span>
    </button>
  );

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
              'w-[760px] max-w-[calc(100vw-32px)] rounded-2xl overflow-hidden',
              'bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
              'shadow-[0_18px_60px_hsl(220_20%_5%_/_0.25)]',
            )}
          >
            {/* 3 컬럼 독립 흐름 — 왼쪽: 대화+논의 / 가운데: 전문+AI 어시스턴트 / 오른쪽: 라이프·재미+건강·실용 */}
            <div className="grid grid-cols-3 gap-x-3 p-4">
              {/* 왼쪽·가운데 컬럼: 기존 MODE_GROUPS (주 작업) */}
              {[[0, 2], [1, 3]].map(([i1, i2], colIdx) => (
                /* 왼쪽: 대화(0) + 논의(2) · 가운데: 전문(1) + 어시스턴트(3) */
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
              {/* 오른쪽 컬럼: 라이프 (재미·건강·생활 통합) + 더보기 */}
              <div className="min-w-0 space-y-3">
                <div>
                  <div className="mb-1.5 flex items-baseline gap-2 px-1">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      {LIFE_GROUP.label}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70 truncate">
                      {LIFE_GROUP.description}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {LIFE_TOOLS_FEATURED.map(renderLifeToolItem)}
                  </div>
                </div>
                {/* 라이프 "더 보기" — 전체 라이프 도구 모달 트리거 */}
                {onOpenLifeBrowser && (
                  <div>
                    <div className="my-1 mx-2 border-t border-[hsl(var(--hairline))]" aria-hidden />
                    <button
                      type="button"
                      onClick={() => { setOpen(false); setTimeout(() => onOpenLifeBrowser(), 40); }}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))] text-muted-foreground hover:text-foreground"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 bg-[hsl(var(--surface-2))] text-muted-foreground">
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1 flex items-center gap-1.5">
                        <span className="text-[12px] font-medium">라이프 더 보기</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
