/**
 * 모드 메뉴 — pill 아래에 뜨는 메가 메뉴 (전 항목 한눈에).
 *
 *  ┌────────────────────────────────────────────┐
 *  │ 대화 ────────────────────────────────────── │
 *  │ [단일 AI      ] [다중 AI       ]            │
 *  │ [심층 리서치   ]                            │
 *  │ 전문 상담 ────────────────────────────────  │
 *  │ [법률] [의약] [세무] [금융] [부동산] [노무]   │
 *  │ 토론·시뮬 ────────────────────────────────  │
 *  │ …                                          │
 *  └────────────────────────────────────────────┘
 *
 * 2026-07-04 재설계: 레일·드릴 네비게이션 폐기 — 수십 개 항목이 섹션별로
 * 한 번에 다 보이는 스크롤 메가 메뉴. 항목은 경계가 확실한 카드 (ring),
 * 호버 시 액센트 테두리로 명확하게. 서브그룹도 전부 펼쳐서 노출.
 * - 항목 hover 시 ☆ — 즐겨찾기 등록/해제 (localStorage), 맨 위 섹션으로.
 * - ESC · 바깥 클릭: 닫기. 패널은 불투명 화이트 고정.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
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
  tint: string;
  target: ItemTarget;
}

interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
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
  const [favs, setFavs] = useState<FavEntry[]>([]);

  useEffect(() => {
    if (open) setFavs(readFavs());
  }, [open]);

  // ESC · 바깥 클릭 — 닫기.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
  }, [open, onClose]);

  /* ── 섹션 데이터 — 서브그룹까지 전부 펼쳐서 (메가 메뉴). ── */

  const sections = useMemo<MenuSection[]>(() => {
    const modeItem = (m: MainMode): MenuItem => ({
      id: `mode-${m}`,
      label: labels[m] ?? m,
      desc: MODE_DESCRIPTION[m],
      tint: MODE_TINT[m],
      target: { kind: 'mode', mode: m },
    });

    const life: MenuSection[] = (Object.keys(LIFE_SUBGROUPS) as LifeSubgroupId[]).map((gid) => {
      const g = LIFE_SUBGROUPS[gid];
      const tools =
        gid === 'aiplay'
          ? PLAYER_TOOLS.map((t): MenuItem => ({
              id: `player-${t.id}`, label: t.label, desc: t.desc, tint: t.tint,
              target: { kind: 'player', toolId: t.id },
            }))
          : LIFE_TOOLS.filter((t) => t.group === gid).map((t): MenuItem => ({
              id: `life-${t.id}`, label: t.label, desc: t.desc, tint: t.tint,
              target: { kind: 'life', toolId: t.id },
            }));
      return { id: `life-${gid}`, label: g.label, items: tools };
    }).filter((s) => s.items.length > 0);

    return [
      {
        id: 'chat',
        label: '대화',
        items: [modeItem('general'), modeItem('multi'), modeItem('research_main')],
      },
      {
        id: 'premium',
        label: labels.premium_main ?? '전문 상담',
        items: PREMIUM_AI_TOOLS.map((p): MenuItem => ({
          id: `premium-${p.key}`, label: p.label, desc: p.desc, tint: p.tint,
          target: { kind: 'premium', domainId: p.key },
        })),
      },
      {
        id: 'debate',
        label: '토론·시뮬',
        items: [
          ...DEBATE_SUBS.map((s): MenuItem => ({
            id: `debate-${s.key}`, label: s.label, desc: s.desc, tint: s.tint,
            target: { kind: 'debate', sub: s.key },
          })),
          modeItem('stakeholder_main'),
        ],
      },
      {
        id: 'studio',
        label: '스튜디오',
        items: [
          modeItem('study_main'),
          modeItem('voice_main'),
          ...ASSISTANT_TILES.filter((t) => !t.placeholder && t.cardId !== 'voice-analysis').map(
            (t): MenuItem => ({
              id: `assistant-${t.cardId}`,
              label: t.label,
              desc:
                t.cardId === 'image-gen' ? '프롬프트로 이미지·영상 생성' :
                t.cardId === 'ppt' ? '프레젠테이션 자동 생성' :
                t.cardId === 'file-convert' ? 'PDF·문서 형식 변환' : '다국어 번역',
              tint: t.tint,
              target: { kind: 'assistant', cardId: t.cardId },
            }),
          ),
        ],
      },
      ...life,
      {
        id: 'hub',
        label: '노트',
        items: HUB_TOOLS.filter((h) => h.id !== 'briefing').map((h): MenuItem => ({
          id: `hub-${h.id}`, label: h.label, desc: h.desc, tint: h.tint,
          target: { kind: 'hub', hubId: h.id },
        })),
      },
    ];
     
  }, [labels]);

  /* ── 즐겨찾기 토글 ── */

  const isFav = (id: string) => favs.some((f) => f.id === id);

  const toggleFav = (item: MenuItem) => {
    const next = isFav(item.id)
      ? favs.filter((f) => f.id !== item.id)
      : [...favs, { id: item.id, label: item.label, desc: item.desc, tint: item.tint, target: item.target }];
    setFavs(next);
    writeFavs(next);
  };

  /* ── 실행 ── */

  const runItem = (item: MenuItem) => {
    const target = item.target;
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

  const favSection: MenuSection | null =
    favs.length > 0
      ? {
          id: 'favorites',
          label: '즐겨찾기',
          items: favs.map((f): MenuItem => ({
            id: f.id, label: f.label, desc: f.desc, tint: f.tint, target: f.target,
          })),
        }
      : null;

  const allSections = favSection ? [favSection, ...sections] : sections;

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label="모드 선택"
      className={cn(
        'absolute top-3 left-3 z-40 w-[680px] max-w-[calc(100%-24px)]',
        'rounded-2xl overflow-hidden',
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-700',
        'shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35),0_4px_16px_-8px_rgba(15,23,42,0.15)]',
        'animate-in fade-in zoom-in-[0.98] slide-in-from-top-1 duration-200',
      )}
    >
      <div className="max-h-[min(560px,calc(100vh-140px))] overflow-y-auto overscroll-contain p-3 scrollbar-thin">
        {allSections.map((section) => (
          <section key={section.id} className="mb-4 last:mb-0">
            {/* 섹션 헤더 — 라벨 + 카운트 + hairline. */}
            <div className="mb-1.5 flex items-center gap-2 px-1">
              {section.id === 'favorites' && (
                <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />
              )}
              <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                {section.label}
              </span>
              <span className="shrink-0 text-[9.5px] font-semibold tabular-nums text-slate-300 dark:text-slate-600">
                {section.items.length}
              </span>
              <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            </div>

            {/* 항목 그리드 — 3열 컴팩트 카드. */}
            <div className="grid grid-cols-3 gap-1.5">
              {section.items.map((item) => {
                const isActive =
                  item.target.kind === 'mode' && item.target.mode === currentMode;
                const faved = isFav(item.id);
                return (
                  <div
                    key={`${section.id}-${item.id}`}
                    className={cn(
                      'group relative rounded-lg ring-1 transition-all duration-100',
                      'bg-slate-50/70 dark:bg-slate-800/40',
                      'ring-slate-200/80 dark:ring-slate-700',
                      'hover:bg-white dark:hover:bg-slate-800 hover:ring-2 hover:-translate-y-px hover:shadow-sm',
                    )}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.setProperty('--tw-ring-color', item.tint); }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.removeProperty('--tw-ring-color'); }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => runItem(item)}
                      className="flex w-full items-start gap-2 px-2.5 py-2 text-left"
                    >
                      {/* 틴트 도트 — 항목 고유색 리듬 (밋밋함 방지). */}
                      <span
                        className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full"
                        style={{ backgroundColor: item.tint, opacity: isActive ? 1 : 0.55 }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold leading-tight text-slate-800 dark:text-slate-100">
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-px text-[8.5px] font-bold text-white"
                              style={{ backgroundColor: item.tint }}
                            >
                              현재
                            </span>
                          )}
                        </span>
                        {item.desc && (
                          <span className="mt-0.5 block truncate text-[10.5px] text-slate-400 dark:text-slate-500">
                            {item.desc}
                          </span>
                        )}
                      </span>
                    </button>
                    {/* 즐겨찾기 토글 — hover 시 노출, 등록 항목은 항상. */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFav(item); }}
                      aria-label={faved ? '즐겨찾기 해제' : '즐겨찾기 등록'}
                      className={cn(
                        'absolute right-1.5 top-1.5 rounded-md p-1 transition-all duration-100',
                        faved
                          ? 'opacity-100 text-amber-400'
                          : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-400 dark:text-slate-600',
                      )}
                    >
                      <Star size={12} className={faved ? 'fill-amber-400' : undefined} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
