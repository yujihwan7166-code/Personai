/**
 * 모드 메뉴 — pill 아래에 뜨는 2-패널 팝오버.
 *
 *  ┌──────────┬─────────────────────────────────┐
 *  │ ★ 즐겨찾기 │  단일 AI      AI 를 골라 1:1     │
 *  │ 대화    ◀│  다중 AI      여러 AI 비교    ☆  │
 *  │ 토론·시뮬 │  심층 리서치   교차 검증          │
 *  │ 스튜디오  │  프리미엄 AI              ›     │
 *  │ 라이프    │                                 │
 *  │ 노트      │                                 │
 *  └──────────┴─────────────────────────────────┘
 *
 * - 좌측 레일 hover 만으로 우측 패널 즉시 전환 (macOS 메뉴 감각).
 * - 전문 상담·라이프 서브그룹은 우측 패널 안에서 in-place 전환 (← 헤더).
 * - 항목 hover 시 ☆ — 클릭하면 즐겨찾기 등록/해제 (localStorage).
 * - ESC: 서브뷰 → 닫기. 바깥 클릭: 닫기. 화면 전환·오버레이 없음.
 * - 패널은 불투명 화이트 고정 (2026-07-04: 반투명 글래스가 배경에 묻혀
 *   선택창으로 안 읽힌다는 피드백) — 브랜드 테마와 무관하게 항상 또렷.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Star,
  MessagesSquare, Swords, SlidersHorizontal, Sprout, NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';
import {
  MODE_TINT,
  MODE_DESCRIPTION,
  DEBATE_SUBS,
  PREMIUM_AI_TOOLS,
  LIFE_TOOLS,
  LIFE_SUBGROUPS,
  PLAYER_TOOLS,
  HUB_TOOLS,
  ASSISTANT_TILES,
  type LifeSubgroupId,
} from '@/components/MainModeTabs';

/* ── 즐겨찾기 (localStorage) ── */

const FAV_KEY = 'personai.favorite_modes';

type ItemTarget =
  | { kind: 'mode'; mode: MainMode }
  | { kind: 'debate'; sub: DebateSubMode }
  | { kind: 'premium'; domainId: PremiumDomainId }
  | { kind: 'assistant'; cardId: string }
  | { kind: 'life'; toolId: string }
  | { kind: 'player'; toolId: string }
  | { kind: 'hub'; hubId: string };

interface FavEntry {
  id: string;
  label: string;
  desc?: string;
  tint: string;
  target: ItemTarget;
}

function readFavs(): FavEntry[] {
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavEntry[];
    return Array.isArray(parsed) ? parsed.filter((r) => r?.target?.kind) : [];
  } catch {
    return [];
  }
}

function writeFavs(next: FavEntry[]): void {
  try {
    window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

/* ── 모델 ── */

interface MenuItem {
  id: string;
  label: string;
  desc?: string;
  emoji: string;
  tint: string;
  target?: ItemTarget;
  /** 우측 패널 in-place 서브뷰 진입. */
  drill?: SubView;
}

type CategoryId = 'favorites' | 'chat' | 'debate' | 'studio' | 'life' | 'hub';
type SubView = 'premium' | LifeSubgroupId;

/* 레일 아이콘 — 모노크롬 lucide (커맨드 팔레트 감성). */
const CATEGORIES: { id: CategoryId; label: string; icon: LucideIcon }[] = [
  { id: 'favorites', label: '즐겨찾기',   icon: Star },
  { id: 'chat',      label: '대화',       icon: MessagesSquare },
  { id: 'debate',    label: '토론·시뮬',  icon: Swords },
  { id: 'studio',    label: '스튜디오',   icon: SlidersHorizontal },
  { id: 'life',      label: '라이프',     icon: Sprout },
  { id: 'hub',       label: '노트',       icon: NotebookPen },
];

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

export function ModeMenu({
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
  const [category, setCategory] = useState<CategoryId>('chat');
  const [subView, setSubView] = useState<SubView | null>(null);
  const [favs, setFavs] = useState<FavEntry[]>([]);

  // 열릴 때 초기화 — 즐겨찾기가 있으면 즐겨찾기 탭, 없으면 대화 탭.
  useEffect(() => {
    if (open) {
      const f = readFavs();
      setFavs(f);
      setCategory(f.length > 0 ? 'favorites' : 'chat');
      setSubView(null);
    }
  }, [open]);

  // ESC — 서브뷰 → 닫기. 바깥 클릭 — 닫기.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (subView) setSubView(null);
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
  }, [open, subView, onClose]);

  /* ── 데이터 (MainModeTabs 상수 재사용) ── */

  const modeItem = (m: MainMode, emoji: string): MenuItem => ({
    id: `mode-${m}`,
    label: labels[m] ?? m,
    desc: MODE_DESCRIPTION[m],
    emoji,
    tint: MODE_TINT[m],
    target: { kind: 'mode', mode: m },
  });

  const categoryItems = useMemo<Record<Exclude<CategoryId, 'favorites'>, MenuItem[]>>(() => ({
    chat: [
      modeItem('general', '💬'),
      modeItem('multi', '🔀'),
      modeItem('research_main', '🔬'),
      {
        id: 'drill-premium',
        label: labels.premium_main ?? '전문 상담',
        desc: MODE_DESCRIPTION.premium_main,
        emoji: '🛡️',
        tint: MODE_TINT.premium_main,
        drill: 'premium',
      },
    ],
    debate: [
      ...DEBATE_SUBS.map((s): MenuItem => ({
        id: `debate-${s.key}`,
        label: s.label,
        desc: s.desc,
        emoji: '⚔️',
        tint: s.tint,
        target: { kind: 'debate', sub: s.key },
      })),
      modeItem('stakeholder_main', '👥'),
    ],
    studio: [
      modeItem('study_main', '📚'),
      modeItem('voice_main', '🎙️'),
      ...ASSISTANT_TILES.filter((t) => !t.placeholder && t.cardId !== 'voice-analysis').map(
        (t): MenuItem => ({
          id: `assistant-${t.cardId}`,
          label: t.label,
          desc:
            t.cardId === 'image-gen' ? '프롬프트로 이미지·영상 생성' :
            t.cardId === 'ppt' ? '프레젠테이션 자동 생성' :
            t.cardId === 'file-convert' ? 'PDF·문서 형식 변환' : '다국어 번역',
          emoji: '🛠️',
          tint: t.tint,
          target: { kind: 'assistant', cardId: t.cardId },
        }),
      ),
    ],
    life: [
      ...(Object.keys(LIFE_SUBGROUPS) as LifeSubgroupId[]).map((gid): MenuItem => {
        const g = LIFE_SUBGROUPS[gid];
        return { id: `lifegroup-${gid}`, label: g.label, desc: g.description, emoji: g.emoji, tint: g.tint, drill: gid };
      }),
      ...LIFE_TOOLS.filter((t) => t.featured).map((t): MenuItem => ({
        id: `life-${t.id}`,
        label: t.label,
        desc: t.desc,
        emoji: t.emoji,
        tint: t.tint,
        target: { kind: 'life', toolId: t.id },
      })),
    ],
    hub: HUB_TOOLS.filter((h) => h.id !== 'briefing').map((h): MenuItem => ({
      id: `hub-${h.id}`,
      label: h.label,
      desc: h.desc,
      emoji: h.emoji,
      tint: h.tint,
      target: { kind: 'hub', hubId: h.id },
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [labels]);

  const subViewItems = useMemo<MenuItem[]>(() => {
    if (!subView) return [];
    if (subView === 'premium') {
      return PREMIUM_AI_TOOLS.map((p): MenuItem => ({
        id: `premium-${p.key}`,
        label: p.label,
        desc: p.desc,
        emoji: '🛡️',
        tint: p.tint,
        target: { kind: 'premium', domainId: p.key },
      }));
    }
    if (subView === 'aiplay') {
      return PLAYER_TOOLS.map((t): MenuItem => ({
        id: `player-${t.id}`,
        label: t.label,
        desc: t.desc,
        emoji: t.emoji,
        tint: t.tint,
        target: { kind: 'player', toolId: t.id },
      }));
    }
    return LIFE_TOOLS.filter((t) => t.group === subView).map((t): MenuItem => ({
      id: `life-${t.id}`,
      label: t.label,
      desc: t.desc,
      emoji: t.emoji,
      tint: t.tint,
      target: { kind: 'life', toolId: t.id },
    }));
  }, [subView]);

  /* ── 즐겨찾기 토글 ── */

  const isFav = (id: string) => favs.some((f) => f.id === id);

  const toggleFav = (item: MenuItem) => {
    if (!item.target) return;
    const next = isFav(item.id)
      ? favs.filter((f) => f.id !== item.id)
      : [...favs, { id: item.id, label: item.label, desc: item.desc, tint: item.tint, target: item.target }];
    setFavs(next);
    writeFavs(next);
  };

  /* ── 실행 ── */

  const runItem = (item: MenuItem) => {
    if (item.drill) {
      setSubView(item.drill);
      return;
    }
    const target = item.target;
    if (!target) return;
    onClose();
    window.setTimeout(() => {
      switch (target.kind) {
        case 'mode': onSelectMode(target.mode); break;
        case 'debate': onSelectDebateSub(target.sub); break;
        case 'premium': onSelectPremiumDomain(target.domainId); break;
        case 'assistant': onSelectAssistantCard(target.cardId); break;
        case 'life': onSelectTool('life', target.toolId, item.label); break;
        case 'player': onSelectTool('player', target.toolId, item.label); break;
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

  /* ── 우측 패널에 그릴 항목 결정 ── */

  const paneItems: MenuItem[] = subView
    ? subViewItems
    : category === 'favorites'
      ? favs.map((f): MenuItem => ({
          id: f.id, label: f.label, desc: f.desc, emoji: '', tint: f.tint, target: f.target,
        }))
      : categoryItems[category];

  const subViewTitle =
    subView === 'premium' ? '전문 상담' : subView ? LIFE_SUBGROUPS[subView]?.label : '';

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label="모드 선택"
      className={cn(
        'absolute top-3 left-3 z-40 w-[520px] max-w-[calc(100%-24px)]',
        'rounded-2xl overflow-hidden',
        // 불투명 화이트 패널 — 배경 테마와 분리된 또렷한 선택창.
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-700',
        'shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35),0_4px_16px_-8px_rgba(15,23,42,0.15)]',
        'animate-in fade-in zoom-in-[0.98] slide-in-from-top-1 duration-200',
      )}
    >
      <div className="flex" style={{ height: 340 }}>
        {/* 좌측 카테고리 레일 — hover 만으로 전환. */}
        <nav className="w-[132px] shrink-0 p-1.5 space-y-0.5 border-r border-slate-100 dark:border-slate-800">
          {CATEGORIES.filter((c) => c.id !== 'favorites' || favs.length > 0).map((c) => {
            const active = category === c.id && !subView;
            const dimActive = category === c.id && !!subView;
            return (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => { setCategory(c.id); setSubView(null); }}
                onClick={() => { setCategory(c.id); setSubView(null); }}
                className={cn(
                  'flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-left',
                  'text-[12.5px] font-medium transition-colors duration-100',
                  active || dimActive
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400',
                  active && 'bg-slate-100 dark:bg-slate-800',
                )}
              >
                <c.icon
                  size={14}
                  strokeWidth={1.9}
                  className={cn('shrink-0', c.id === 'favorites' ? 'text-amber-400 fill-amber-400/70' : 'opacity-75')}
                />
                <span className="truncate">{c.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 우측 패널 — 항목 리스트. */}
        <div className="flex-1 min-w-0 overflow-y-auto overscroll-contain p-1.5">
          {/* 서브뷰 헤더 (← 전문상담 / 운세 등). */}
          {subView && (
            <button
              type="button"
              onClick={() => setSubView(null)}
              className="mb-1 flex items-center gap-1.5 h-7 px-2 rounded-lg text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={12} />
              {subViewTitle}
            </button>
          )}

          {paneItems.length === 0 ? (
            <p className="py-12 text-center text-[12.5px] text-slate-400 dark:text-slate-500">
              {category === 'favorites' ? '항목 위의 ☆ 를 눌러 즐겨찾기에 담아보세요' : '항목이 없어요'}
            </p>
          ) : (
            paneItems.map((item, i) => {
              const isActive =
                item.target?.kind === 'mode' && item.target.mode === currentMode;
              const faved = isFav(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'group relative rounded-lg',
                    'animate-in fade-in fill-mode-both',
                    'hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors duration-100',
                  )}
                  style={{ animationDelay: `${Math.min(i * 14, 140)}ms`, animationDuration: '150ms' }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runItem(item)}
                    className="flex w-full items-center gap-2.5 px-3 py-[8px] text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13px] font-medium leading-tight text-slate-800 dark:text-slate-100">
                        <span className="truncate">{item.label}</span>
                        {isActive && (
                          <span
                            className="shrink-0 h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: item.tint }}
                            aria-label="현재 모드"
                          />
                        )}
                      </span>
                      {item.desc && (
                        <span className="block text-[11px] mt-[3px] truncate text-slate-400 dark:text-slate-500">
                          {item.desc}
                        </span>
                      )}
                    </span>
                    {item.drill && (
                      <ChevronRight
                        size={13}
                        className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
                      />
                    )}
                  </button>
                  {/* 즐겨찾기 토글 — hover 시 노출, 등록된 항목은 항상 표시. */}
                  {item.target && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFav(item); }}
                      aria-label={faved ? '즐겨찾기 해제' : '즐겨찾기 등록'}
                      title={faved ? '즐겨찾기 해제' : '즐겨찾기'}
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-100',
                        item.drill ? 'right-7' : 'right-2',
                        faved
                          ? 'opacity-100 text-amber-400'
                          : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-400 dark:text-slate-600',
                      )}
                    >
                      <Star size={13} className={faved ? 'fill-amber-400' : undefined} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
