/**
 * 모드 스트립 — 모드 pill 이 "제자리에서" 칩 스트립으로 펼쳐지는 인라인 네비게이션.
 *
 * 페이지 전환·풀스크린 오버레이 없음. 히어로의 AI 칩 스트립과 같은 디자인 언어
 * (작은 칩 · glass · 브랜드 변수) 로, pill 위치(좌상단)에서 옆으로 자라난다.
 *
 * 구조 (브레드크럼 드릴다운):
 *   root   [✕] [💬 대화] [⚔️ 토론·시뮬] [🎛️ 스튜디오] [🌱 라이프] [📔 노트] │ 최근 2개
 *   level2 [←] 대화 ▸ [💬 단일 AI] [🔀 멀티 AI] …
 *   level3 [←] 라이프 ▸ 운세 ▸ [🔮 사주] [🎴 타로] …
 *
 * ESC = 한 단계씩 뒤로 → 닫기. 바깥 클릭 = 닫기.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';
import {
  MODE_TINT,
  DEBATE_SUBS,
  PREMIUM_AI_TOOLS,
  LIFE_TOOLS,
  LIFE_SUBGROUPS,
  PLAYER_TOOLS,
  HUB_TOOLS,
  ASSISTANT_TILES,
  type LifeSubgroupId,
} from '@/components/MainModeTabs';

/* ── 최근 사용 (MainModeTabs 와 동일 스토리지 포맷 공유) ── */

const RECENT_KEY = 'personai.recent_modes';

type ChipTarget =
  | { kind: 'mode'; mode: MainMode }
  | { kind: 'debate'; sub: DebateSubMode }
  | { kind: 'premium'; domainId: PremiumDomainId }
  | { kind: 'assistant'; cardId: string }
  | { kind: 'life'; toolId: string }
  | { kind: 'player'; toolId: string }
  | { kind: 'hub'; hubId: string };

interface RecentEntry {
  id: string;
  label: string;
  emoji: string;
  tint: string;
  at: number;
  target: ChipTarget;
}

function readRecents(): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEntry[];
    return Array.isArray(parsed) ? parsed.filter((r) => r?.target?.kind) : [];
  } catch {
    return [];
  }
}

function pushRecent(entry: Omit<RecentEntry, 'at'>): void {
  try {
    const next = [
      { ...entry, at: Date.now() },
      ...readRecents().filter((r) => r.id !== entry.id),
    ].slice(0, 8);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

/* ── 칩 모델 ── */

interface StripChip {
  id: string;
  label: string;
  emoji: string;
  tint: string;
  target?: ChipTarget;
  /** 드릴다운 진입 칩. */
  drill?: Level;
}

/** 네비게이션 레벨 — root / 카테고리 / 서브그룹. */
type Level =
  | 'root'
  | 'chat' | 'debate' | 'studio' | 'life' | 'hub'
  | 'premium'
  | LifeSubgroupId;

/** 레벨별 브레드크럼 라벨. */
const LEVEL_LABEL: Record<string, string> = {
  chat: '대화',
  debate: '토론·시뮬',
  studio: '스튜디오',
  life: '라이프',
  hub: '노트',
  premium: '전문 상담',
};

/** 레벨의 부모 (← 이동 대상). */
function parentOf(level: Level): Level {
  if (level === 'root') return 'root';
  if (level === 'premium') return 'chat';
  if (level in LIFE_SUBGROUPS) return 'life';
  return 'root';
}

interface Props {
  open: boolean;
  onClose: () => void;
  currentMode: MainMode;
  labels: Record<MainMode, string>;
  onSelectMode: (m: MainMode) => void;
  onSelectDebateSub: (sub: DebateSubMode) => void;
  onSelectPremiumDomain: (id: PremiumDomainId) => void;
  onSelectAssistantCard: (cardId: string) => void;
  onSelectTool: (kind: 'life' | 'player', toolId: string, label: string) => void;
}

export function ModeStrip({
  open,
  onClose,
  currentMode,
  labels,
  onSelectMode,
  onSelectDebateSub,
  onSelectPremiumDomain,
  onSelectAssistantCard,
  onSelectTool,
}: Props) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState<Level>('root');
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  useEffect(() => {
    if (open) {
      setLevel('root');
      setRecents(readRecents());
    }
  }, [open]);

  // ESC — 한 단계 뒤로 → 닫기. 바깥 클릭 — 닫기.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (level !== 'root') setLevel(parentOf(level));
        else onClose();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open, level, onClose]);

  /* ── 레벨별 칩 목록 ── */

  const chips = useMemo<StripChip[]>(() => {
    const modeChip = (m: MainMode, emoji: string): StripChip => ({
      id: `mode-${m}`,
      label: labels[m] ?? m,
      emoji,
      tint: MODE_TINT[m],
      target: { kind: 'mode', mode: m },
    });

    switch (level) {
      case 'root':
        return [
          { id: 'cat-chat',   label: '대화',      emoji: '💬', tint: 'hsl(220 70% 55%)', drill: 'chat' },
          { id: 'cat-debate', label: '토론·시뮬', emoji: '⚔️', tint: 'hsl(0 72% 55%)',   drill: 'debate' },
          { id: 'cat-studio', label: '스튜디오',  emoji: '🎛️', tint: 'hsl(280 60% 55%)', drill: 'studio' },
          { id: 'cat-life',   label: '라이프',    emoji: '🌱', tint: 'hsl(150 55% 45%)', drill: 'life' },
          { id: 'cat-hub',    label: '노트',      emoji: '📔', tint: 'hsl(35 80% 50%)',  drill: 'hub' },
        ];
      case 'chat':
        return [
          modeChip('general', '💬'),
          modeChip('multi', '🔀'),
          modeChip('research_main', '🔬'),
          {
            id: 'drill-premium',
            label: labels.premium_main ?? '전문 상담',
            emoji: '🛡️',
            tint: MODE_TINT.premium_main,
            drill: 'premium',
          },
        ];
      case 'debate':
        return [
          ...DEBATE_SUBS.map((s): StripChip => ({
            id: `debate-${s.key}`,
            label: s.label,
            emoji: s.key === 'procon' ? '⚔️' : s.key === 'freetalk' ? '💭' : s.key === 'standard' ? '🔭' : '✨',
            tint: s.tint,
            target: { kind: 'debate', sub: s.key },
          })),
          modeChip('stakeholder_main', '👥'),
        ];
      case 'studio':
        return [
          modeChip('study_main', '📚'),
          modeChip('voice_main', '🎙️'),
          ...ASSISTANT_TILES.filter((t) => !t.placeholder && t.cardId !== 'voice-analysis').map(
            (t): StripChip => ({
              id: `assistant-${t.cardId}`,
              label: t.label,
              emoji: t.cardId === 'image-gen' ? '🎨' : t.cardId === 'ppt' ? '📊' : t.cardId === 'file-convert' ? '📁' : '🌐',
              tint: t.tint,
              target: { kind: 'assistant', cardId: t.cardId },
            }),
          ),
        ];
      case 'life':
        return [
          ...(Object.keys(LIFE_SUBGROUPS) as LifeSubgroupId[]).map((gid): StripChip => {
            const g = LIFE_SUBGROUPS[gid];
            return { id: `lifegroup-${gid}`, label: g.label, emoji: g.emoji, tint: g.tint, drill: gid };
          }),
          ...LIFE_TOOLS.filter((t) => t.featured).map((t): StripChip => ({
            id: `life-${t.id}`,
            label: t.label,
            emoji: t.emoji,
            tint: t.tint,
            target: { kind: 'life', toolId: t.id },
          })),
        ];
      case 'hub':
        return HUB_TOOLS.filter((h) => h.id !== 'briefing').map((h): StripChip => ({
          id: `hub-${h.id}`,
          label: h.label,
          emoji: h.emoji,
          tint: h.tint,
          target: { kind: 'hub', hubId: h.id },
        }));
      case 'premium':
        return PREMIUM_AI_TOOLS.map((p): StripChip => ({
          id: `premium-${p.key}`,
          label: p.label,
          emoji: p.key === 'law' ? '⚖️' : p.key === 'drug' ? '💊' : p.key === 'tax' ? '🧾' : p.key === 'finance' ? '💰' : p.key === 'realestate' ? '🏠' : '💼',
          tint: p.tint,
          target: { kind: 'premium', domainId: p.key },
        }));
      default: {
        // 라이프 서브그룹 (aiplay 는 PLAYER_TOOLS).
        if (level === 'aiplay') {
          return PLAYER_TOOLS.map((t): StripChip => ({
            id: `player-${t.id}`,
            label: t.label,
            emoji: t.emoji,
            tint: t.tint,
            target: { kind: 'player', toolId: t.id },
          }));
        }
        return LIFE_TOOLS.filter((t) => t.group === level).map((t): StripChip => ({
          id: `life-${t.id}`,
          label: t.label,
          emoji: t.emoji,
          tint: t.tint,
          target: { kind: 'life', toolId: t.id },
        }));
      }
    }
  }, [level, labels]);

  /* ── 브레드크럼 라벨 ── */

  const breadcrumb = useMemo<string[]>(() => {
    if (level === 'root') return [];
    if (level === 'premium') return ['대화', '전문 상담'];
    if (level in LIFE_SUBGROUPS) {
      return ['라이프', LIFE_SUBGROUPS[level as LifeSubgroupId].label];
    }
    return [LEVEL_LABEL[level] ?? ''];
  }, [level]);

  /* ── 선택 실행 ── */

  const runChip = (chip: StripChip) => {
    if (chip.drill) {
      setLevel(chip.drill);
      return;
    }
    const target = chip.target;
    if (!target) return;
    pushRecent({ id: chip.id, label: chip.label, emoji: chip.emoji, tint: chip.tint, target });
    onClose();
    window.setTimeout(() => {
      switch (target.kind) {
        case 'mode': onSelectMode(target.mode); break;
        case 'debate': onSelectDebateSub(target.sub); break;
        case 'premium': onSelectPremiumDomain(target.domainId); break;
        case 'assistant': onSelectAssistantCard(target.cardId); break;
        case 'life': onSelectTool('life', target.toolId, chip.label); break;
        case 'player': onSelectTool('player', target.toolId, chip.label); break;
        case 'hub': {
          const route =
            target.hubId === 'planner' ? '/planner' :
            target.hubId === 'wiki' ? '/wiki' :
            target.hubId === 'memo' ? '/memos' :
            target.hubId === 'whiteboard' ? '/whiteboard' :
            target.hubId === 'journal' ? '/journal' :
            target.hubId === 'cloud' ? '/cloud' : null;
          if (route) navigate(route);
          break;
        }
      }
    }, 50);
  };

  if (!open) return null;

  // root 에서만 최근 사용 2개 노출 (카테고리와 divider 로 구분).
  const recentChips = level === 'root' ? recents.slice(0, 2) : [];

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label="모드 선택"
      className={cn(
        'absolute top-3 left-3 z-40 max-w-[min(760px,calc(100%-24px))]',
        'flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border',
        'animate-in fade-in slide-in-from-left-2 duration-200',
      )}
      style={{
        // pill 자리에서 자라나는 glass 바 — 브랜드 변수 기반 (라이트/다크 자동).
        backgroundColor: 'color-mix(in srgb, var(--hero-bg, #101014) 72%, transparent)',
        borderColor: 'var(--hero-hairline, rgba(255,255,255,0.10))',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        boxShadow: '0 12px 36px -16px rgba(0,0,0,0.35)',
      }}
    >
      {/* 좌측 컨트롤 — root 는 ✕, 하위 레벨은 ← */}
      {level === 'root' ? (
        <IconChip label="닫기 (Esc)" onClick={onClose}>
          <X size={13} strokeWidth={2.4} />
        </IconChip>
      ) : (
        <IconChip label="뒤로 (Esc)" onClick={() => setLevel(parentOf(level))}>
          <ArrowLeft size={13} strokeWidth={2.4} />
        </IconChip>
      )}

      {/* 브레드크럼 — 하위 레벨에서만. */}
      {breadcrumb.length > 0 && (
        <span
          className="flex items-center gap-1 pl-0.5 pr-1 text-[11.5px] font-medium select-none"
          style={{ color: 'var(--hero-fg-muted)' }}
        >
          {breadcrumb.map((b, i) => (
            <span key={b} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={10} className="opacity-60" />}
              {b}
            </span>
          ))}
          <ChevronRight size={10} className="opacity-60" />
        </span>
      )}

      {/* 칩들 — stagger 등장. */}
      {chips.map((chip, i) => {
        const isActive =
          chip.target?.kind === 'mode' && chip.target.mode === currentMode;
        return (
          <button
            key={chip.id}
            type="button"
            role="menuitem"
            onClick={() => runChip(chip)}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 pl-2 pr-2.5 rounded-full border',
              'text-[12.5px] font-medium whitespace-nowrap',
              'transition-all duration-150 hover:-translate-y-px',
              'animate-in fade-in slide-in-from-left-1 fill-mode-both',
            )}
            style={{
              animationDelay: `${Math.min(i * 22, 220)}ms`,
              animationDuration: '180ms',
              color: 'var(--hero-fg, #ececec)',
              borderColor: isActive
                ? 'var(--hero-ring, #10a37f)'
                : 'var(--hero-hairline, rgba(255,255,255,0.12))',
              backgroundColor: `color-mix(in oklab, ${chip.tint} 10%, transparent)`,
              ...(isActive && { boxShadow: '0 0 0 1px var(--hero-ring)' }),
            }}
          >
            <span className="text-[14px] leading-none select-none">{chip.emoji}</span>
            {chip.label}
            {chip.drill && (
              <ChevronRight size={11} className="opacity-50 -mr-0.5" />
            )}
          </button>
        );
      })}

      {/* 최근 사용 — root 끝에 divider + 2개. */}
      {recentChips.length > 0 && (
        <>
          <span
            aria-hidden
            className="mx-0.5 h-4 w-px"
            style={{ backgroundColor: 'var(--hero-hairline, rgba(255,255,255,0.15))' }}
          />
          <span
            className="text-[10.5px] font-medium select-none"
            style={{ color: 'var(--hero-fg-muted)' }}
          >
            최근
          </span>
          {recentChips.map((r, i) => (
            <button
              key={r.id}
              type="button"
              role="menuitem"
              onClick={() =>
                runChip({ id: r.id, label: r.label, emoji: r.emoji, tint: r.tint, target: r.target })
              }
              className={cn(
                'inline-flex items-center gap-1.5 h-8 pl-2 pr-2.5 rounded-full border',
                'text-[12.5px] font-medium whitespace-nowrap',
                'transition-all duration-150 hover:-translate-y-px',
                'animate-in fade-in slide-in-from-left-1 fill-mode-both',
              )}
              style={{
                animationDelay: `${(chips.length + i) * 22}ms`,
                animationDuration: '180ms',
                color: 'var(--hero-fg, #ececec)',
                borderColor: 'var(--hero-hairline, rgba(255,255,255,0.12))',
                backgroundColor: 'var(--hero-input-bg, rgba(255,255,255,0.04))',
              }}
            >
              <span className="text-[14px] leading-none select-none">{r.emoji}</span>
              {r.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/* ── 아이콘 전용 원형 칩 (✕ / ←) ── */

function IconChip({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 transition-all hover:scale-105"
      style={{
        color: 'var(--hero-fg-muted)',
        backgroundColor: 'var(--hero-accent-soft, rgba(255,255,255,0.06))',
      }}
    >
      {children}
    </button>
  );
}
