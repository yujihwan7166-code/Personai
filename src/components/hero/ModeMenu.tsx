/**
 * 모드 메뉴 — 컬러 존 벤토 (2026-07-04 3차 재설계).
 *
 *  ┌───────────────────────────────────────────┐
 *  │ [단일 AI]  [다중 AI]  [심층 리서치]          │ ← 프라이머리 3타일 (크게)
 *  │ ▒ 노트 (틸 존) ────────────────────────    │
 *  │ ▒ 스튜디오 (바이올렛 존) ───────────────    │
 *  │ ▒ 전문 상담 (앰버 존) ──────────────────   │
 *  │ ▒ 토론·시뮬 (로즈 존) ──────────────────   │
 *  │ ▒ 라이프 (그린 존) — 그룹 카드 6장 축약     │
 *  └───────────────────────────────────────────┘
 *
 * 스캔 원리: 흰 카드 61장 나열 대신 —
 *  1) 섹션 = 옅은 틴트 배경의 "색 존" (눈이 색 면으로 먼저 구획을 잡음)
 *  2) 노출 아이템 다이어트: 라이프 도구 20+ 는 그룹 카드로 축약, 클릭 시 제자리 펼침
 *  3) 프라이머리 위계: 대화 3종은 큰 타일로 최상단
 * 우선순위 순서 (유저 지정): 대화 → 노트 → 스튜디오 → 전문 → 토론 → 라이프.
 * 즐겨찾기 (☆ hover 토글) 는 있으면 프라이머리 위에 표시.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Star, MessagesSquare, Layers, FlaskConical,
  CalendarDays, Globe, Cloud, StickyNote, Shapes, NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';
import { useFavoriteModes, MAX_FAVS, type ItemTarget } from '@/hooks/useFavoriteModes';
import {
  MODE_TINT,
  MODE_DESCRIPTION,
  MODE_ICON,
  DEBATE_SUBS,
  PREMIUM_AI_TOOLS,
  LIFE_TOOLS,
  LIFE_SUBGROUPS,
  PLAYER_TOOLS,
  HUB_TOOLS,
  ASSISTANT_TILES,
  type LifeSubgroupId,
} from '@/components/MainModeTabs';

/* 노트 도구 아이콘 — HUB_TOOLS 는 emoji 기반이라 (메뉴 이모지 X 피드백)
 * lucide 라인 아이콘으로 매핑. */
export const HUB_ICONS: Record<string, LucideIcon> = {
  planner: CalendarDays,
  wiki: Globe,
  cloud: Cloud,
  memo: StickyNote,
  whiteboard: Shapes,
  journal: NotebookPen,
};

/* ── 즐겨찾기 — useFavoriteModes 공유 스토어 (히어로 칩 줄과 실시간 동기화) ── */

/* ── 모델 ── */

interface MenuItem {
  id: string;
  label: string;
  desc?: string;
  tint: string;
  target: ItemTarget;
  /** 카드 좌측 아이콘 — 없으면 텍스트만 (라이프 도구 등). */
  icon?: LucideIcon;
}

interface LifeGroup {
  gid: LifeSubgroupId;
  label: string;
  items: MenuItem[];
}

interface Zone {
  id: string;
  label: string;
  /** 존 대표색 — 배경 틴트·헤더 잉크. */
  color: string;
  items: MenuItem[];
}

/* 존 대표색 — 색 면 스캔용 고정 팔레트. */
const ZONE_COLORS = {
  favorites: '#d97706',
  hub: '#0d9488',
  studio: '#8b5cf6',
  premium: '#d97706',
  debate: '#e11d48',
  life: '#16a34a',
} as const;

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
  const { isFav, toggleFav: toggleFavRaw } = useFavoriteModes();
  // 프라이머리 슬라이딩 인디케이터 — 클릭 시 먼저 활성 pill 이 미끄러진 뒤 닫힘.
  // (즉시 닫으면 슬라이드가 안 보여서 280ms 시퀀스.)
  const [pendingPrimary, setPendingPrimary] = useState<MainMode | null>(null);
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) setPendingPrimary(null);
  }, [open]);

  useEffect(() => () => {
    if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
  }, []);

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

  /* ── 데이터 ── */

  const { primaryItems, zones, lifeGroups } = useMemo(() => {
    const modeItem = (m: MainMode): MenuItem => ({
      id: `mode-${m}`,
      label: labels[m] ?? m,
      desc: MODE_DESCRIPTION[m],
      tint: MODE_TINT[m],
      target: { kind: 'mode', mode: m },
      icon: MODE_ICON[m],
    });

    const primary: MenuItem[] = [modeItem('general'), modeItem('multi'), modeItem('research_main')];

    const groups: LifeGroup[] = (Object.keys(LIFE_SUBGROUPS) as LifeSubgroupId[]).map((gid) => {
      const g = LIFE_SUBGROUPS[gid];
      const items =
        gid === 'aiplay'
          ? PLAYER_TOOLS.map((t): MenuItem => ({
              id: `player-${t.id}`, label: t.label, desc: t.desc, tint: t.tint,
              target: { kind: 'player', toolId: t.id },
            }))
          : LIFE_TOOLS.filter((t) => t.group === gid).map((t): MenuItem => ({
              id: `life-${t.id}`, label: t.label, desc: t.desc, tint: t.tint,
              target: { kind: 'life', toolId: t.id },
            }));
      return { gid, label: g.label, items };
    }).filter((g) => g.items.length > 0);

    // 우선순위 순서 (유저 지정): 노트 → 스튜디오 → 전문 → 토론. (라이프는 별도 존)
    const zoneList: Zone[] = [
      {
        id: 'hub',
        label: '노트 & 정리',
        color: ZONE_COLORS.hub,
        items: HUB_TOOLS.filter((h) => h.id !== 'briefing').map((h): MenuItem => ({
          id: `hub-${h.id}`, label: h.label, desc: h.desc, tint: h.tint,
          target: { kind: 'hub', hubId: h.id },
          icon: HUB_ICONS[h.id],
        })),
      },
      {
        id: 'studio',
        label: '스튜디오',
        color: ZONE_COLORS.studio,
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
              icon: t.icon,
            }),
          ),
        ],
      },
      {
        id: 'premium',
        label: labels.premium_main ?? '전문 상담',
        color: ZONE_COLORS.premium,
        items: PREMIUM_AI_TOOLS.map((p): MenuItem => ({
          id: `premium-${p.key}`, label: p.label, desc: p.desc, tint: p.tint,
          target: { kind: 'premium', domainId: p.key },
          icon: p.icon,
        })),
      },
      {
        id: 'debate',
        label: '토론·시뮬',
        color: ZONE_COLORS.debate,
        items: [
          ...DEBATE_SUBS.map((s): MenuItem => ({
            id: `debate-${s.key}`, label: s.label, desc: s.desc, tint: s.tint,
            target: { kind: 'debate', sub: s.key },
            icon: s.icon,
          })),
          modeItem('stakeholder_main'),
        ],
      },
    ];

    return { primaryItems: primary, zones: zoneList, lifeGroups: groups };

  }, [labels]);

  /* ── 즐겨찾기 — 별 = 히어로 상단 칩. 5개 제한 (상단 공간). ── */

  const toggleFav = (item: MenuItem) => {
    const result = toggleFavRaw({
      id: item.id, label: item.label, desc: item.desc, tint: item.tint, target: item.target,
    });
    if (result === 'full') {
      toast(`즐겨찾기 칩은 ${MAX_FAVS}개까지예요`, {
        description: '기존 칩을 하나 해제하고 다시 시도해주세요.',
      });
    } else if (result === 'added') {
      toast(`'${item.label}' 칩이 상단에 추가됐어요`);
    }
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

  const PRIMARY_ICONS: LucideIcon[] = [MessagesSquare, Layers, FlaskConical];

  /* ── 아이콘 카드 (섹션 공통) — 아이콘 + 라벨 한 줄 컴팩트 (설명 제거, 2026-07-05).
   * 설명은 title 툴팁으로만. */
  const ItemCard = ({ item }: { item: MenuItem }) => {
    const isActive = item.target.kind === 'mode' && item.target.mode === currentMode;
    const faved = isFav(item.id);
    const Icon = item.icon;
    return (
      <div className="group relative rounded-lg bg-white dark:bg-slate-900 ring-1 ring-black/[0.06] dark:ring-white/10 hover:ring-2 hover:-translate-y-px hover:shadow-sm transition-all duration-100"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.setProperty('--tw-ring-color', item.tint); }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.removeProperty('--tw-ring-color'); }}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => runItem(item)}
          title={item.desc}
          className="flex w-full items-center gap-1.5 px-2 py-[6px] text-left"
        >
          {Icon && (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `${item.tint}16` }}
            >
              <Icon size={11} strokeWidth={2.2} style={{ color: item.tint }} />
            </span>
          )}
          <span className="min-w-0 flex items-center gap-1.5 text-[12px] font-semibold leading-tight text-slate-800 dark:text-slate-100">
            <span className="truncate">{item.label}</span>
            {isActive && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.tint }} aria-label="현재 모드" />
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleFav(item); }}
          aria-label={faved ? '즐겨찾기 해제' : '즐겨찾기 등록'}
          className={cn(
            'absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 transition-all duration-100',
            faved ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-400',
          )}
        >
          <Star size={10} className={faved ? 'fill-amber-400' : undefined} />
        </button>
      </div>
    );
  };

  /* ── 섹션 — 틴트 면 대신 컬러 라벨 + 헤어라인 구분 (2026-07-05 목업 반영). ── */
  const Section = ({ label, color, action, children }: { label: string; color: string; action?: React.ReactNode; children: React.ReactNode }) => (
    <section className="border-t border-slate-100 pt-2.5 first:border-0 first:pt-0 dark:border-slate-800">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[11px] font-bold tracking-tight" style={{ color }}>{label}</span>
        {action}
      </div>
      {children}
    </section>
  );

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label="모드 선택"
      className={cn(
        'absolute top-3 left-3 z-40 w-[720px] max-w-[calc(100%-24px)]',
        'rounded-2xl overflow-hidden',
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-700',
        'shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35),0_4px_16px_-8px_rgba(15,23,42,0.15)]',
        'animate-in fade-in zoom-in-[0.98] slide-in-from-top-1 duration-200',
      )}
    >
      <div className="max-h-[min(640px,calc(100vh-140px))] space-y-2.5 overflow-y-auto overscroll-contain p-3 scrollbar-thin">
        {/* 즐겨찾기는 메뉴 안에 중복 노출하지 않음 — 히어로 상단 칩이 유일한
         * 표면 (2026-07-05 피드백). 별 토글은 카드에서 그대로. */}

        {/* 프라이머리 — AI 대화 3종 큰 타일 + 슬라이딩 인디케이터.
         * 활성 링이 고정 표시 대신 세그먼트처럼 미끄러져 이동 (uiverse 세그먼트 각색). */}
        <Section label="AI 기능" color="#2563eb">
        {(() => {
          const activePrimaryMode = pendingPrimary ?? currentMode;
          const activeIdx = primaryItems.findIndex(
            (it) => it.target.kind === 'mode' && it.target.mode === activePrimaryMode,
          );
          const activeTint = activeIdx >= 0 ? primaryItems[activeIdx].tint : undefined;
          return (
            <div className="relative grid grid-cols-3 gap-2">
              {/* 인디케이터 — 3등분 폭, left 가 활성 인덱스로 슬라이드. 색도 함께 morph. */}
              {activeIdx >= 0 && activeTint && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 rounded-xl"
                  style={{
                    width: 'calc((100% - 16px) / 3)',
                    left: `calc(${activeIdx} * ((100% - 16px) / 3 + 8px))`,
                    boxShadow: `inset 0 0 0 2px ${activeTint}, 0 6px 18px -10px ${activeTint}`,
                    // Tailwind arbitrary duration 이 JIT 에 안 잡혀서 인라인으로.
                    transition: 'left 280ms cubic-bezier(0.22,1,0.36,1), box-shadow 280ms ease',
                  }}
                />
              )}
              {primaryItems.map((item, i) => {
                const Icon = PRIMARY_ICONS[i] ?? MessagesSquare;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      // 모드 타일 — 인디케이터가 먼저 미끄러진 뒤 닫고 전환.
                      if (item.target.kind === 'mode' && item.target.mode !== activePrimaryMode) {
                        setPendingPrimary(item.target.mode);
                        if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
                        pendingTimerRef.current = window.setTimeout(() => runItem(item), 280);
                        return;
                      }
                      runItem(item);
                    }}
                    title={item.desc}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all duration-100 hover:-translate-y-px hover:shadow-md"
                    style={{
                      backgroundColor: `${item.tint}12`,
                      boxShadow: `inset 0 0 0 1px ${item.tint}30`,
                    }}
                  >
                    <Icon size={15} strokeWidth={2} className="shrink-0" style={{ color: item.tint }} />
                    <span className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })()}
        </Section>

        {/* 전 섹션 상시 노출 — 숨김 계층 없음 (2026-07-05 피드백: 펼침 UI 를
         * 바깥으로). 노트 & 정리 → 스튜디오 → 프리미엄 → 토론·시뮬. */}
        {zones.map((zone) => (
          <Section key={zone.id} label={zone.label} color={zone.color}>
            <div className="grid grid-cols-4 gap-1.5">
              {zone.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </Section>
        ))}

        {/* 라이프 — 아코디언 폐기, 서브그룹 라벨 + 플랫 그리드로 전부 노출. */}
        <Section label="라이프" color={ZONE_COLORS.life}>
          <div className="space-y-1.5">
            {lifeGroups.map((g) => (
              <div key={g.gid} className="flex items-start gap-2">
                <span className="w-[72px] shrink-0 pt-[7px] text-right text-[10px] font-semibold leading-tight text-slate-400 dark:text-slate-500">
                  {g.label}
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5">
                  {g.items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
