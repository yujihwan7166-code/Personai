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
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Star,
  CalendarDays, Cloud, StickyNote, NotebookPen, Award, Plane, Contact, Archive, BookOpen, PiggyBank, Film,
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
  wiki: BookOpen,
  cloud: Cloud,
  notes: StickyNote,
  journal: NotebookPen,
  career: Award,
  travel: Plane,
  people: Contact,
  archive: Archive,
  ledger: PiggyBank,
  rewind: Film,
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
            target.hubId === 'notes' ? '/notes' :
            target.hubId === 'journal' ? '/journal' :
            target.hubId === 'career' ? '/career' :
            target.hubId === 'travel' ? '/journal?view=travel' :
            target.hubId === 'people' ? '/people' :
            target.hubId === 'archive' ? '/archive' :
            target.hubId === 'wiki' ? '/wiki' :
            target.hubId === 'cloud' ? '/cloud' : null;
          if (route) navigate(route);
          break;
        }
      }
    }, 50);
  };

  if (!open) return null;

  /* ── 원형 아이콘 셀 — 선택모드 패널과 동일 문법 (2026-07-05, 유저 레퍼런스).
   * 틴트 원 + 아래 라벨, hover 옅은 배경, 활성은 배경 유지. 설명은 툴팁. ── */
  const CircleItem = ({ item }: { item: MenuItem }) => {
    const isActive = item.target.kind === 'mode' && item.target.mode === currentMode;
    const faved = isFav(item.id);
    const Icon = item.icon;
    return (
      <div className="group relative">
        <button
          type="button"
          role="menuitem"
          onClick={() => runItem(item)}
          title={item.desc}
          className={cn(
            'flex w-full flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 transition-colors duration-100 hover:bg-black/[0.04] dark:hover:bg-white/5',
            isActive && 'bg-black/[0.05] dark:bg-white/10',
          )}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            // hsl(var(--...)) 틴트도 있어 헥사 알파 접미 대신 color-mix.
            style={{ backgroundColor: `color-mix(in oklab, ${item.tint} 10%, transparent)` }}
          >
            {Icon ? (
              <Icon size={16} strokeWidth={2} style={{ color: item.tint }} />
            ) : (
              <span className="text-[13px] font-bold leading-none" style={{ color: item.tint }}>
                {item.label.charAt(0)}
              </span>
            )}
          </span>
          <span className="max-w-full truncate text-[10px] font-medium leading-none text-slate-600 dark:text-slate-300">
            {item.label}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleFav(item); }}
          aria-label={faved ? '즐겨찾기 해제' : '즐겨찾기 등록'}
          className={cn(
            'absolute right-0.5 top-0.5 rounded p-0.5 transition-all duration-100',
            faved ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-400',
          )}
        >
          <Star size={10} className={faved ? 'fill-amber-400' : undefined} />
        </button>
      </div>
    );
  };

  /* ── 섹션 — 차분한 회색 라벨 + 여백 구분 (선택모드 패널 문법). ── */
  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <section>
      <div className="px-1.5 pb-1 text-[10px] font-semibold tracking-wide text-[#9aa0a8]">{label}</div>
      {children}
    </section>
  );

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label="모드 선택"
      className={cn(
        'absolute top-3 left-3 z-40 w-[560px] max-w-[calc(100%-24px)]',
        'rounded-2xl overflow-hidden',
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-700',
        'shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35),0_4px_16px_-8px_rgba(15,23,42,0.15)]',
        'animate-in fade-in zoom-in-[0.98] slide-in-from-top-1 duration-200',
      )}
    >
      <div className="max-h-[min(640px,calc(100vh-140px))] space-y-2 overflow-y-auto overscroll-contain p-2.5 scrollbar-thin">
        {/* 즐겨찾기는 메뉴 안에 중복 노출하지 않음 — 히어로 상단 칩이 유일한
         * 표면 (2026-07-05 피드백). 별 토글은 셀에서 그대로. */}

        {/* AI 기능 — 프라이머리 3종도 동일 원형 셀 (문법 통일). */}
        <Section label="AI 기능">
          <div className="grid grid-cols-7 gap-0.5">
            {primaryItems.map((item) => (
              <CircleItem key={item.id} item={item} />
            ))}
          </div>
        </Section>

        {/* 전 섹션 상시 노출 — 노트 & 정리 → 스튜디오 → 프리미엄 → 토론·시뮬. */}
        {zones.map((zone) => (
          <Section key={zone.id} label={zone.label}>
            <div className="grid grid-cols-7 gap-0.5">
              {zone.items.map((item) => (
                <CircleItem key={item.id} item={item} />
              ))}
            </div>
          </Section>
        ))}

        {/* 라이프 — 서브그룹 라벨 + 플랫 그리드 전부 노출. */}
        <Section label="라이프">
          <div className="space-y-1">
            {lifeGroups.map((g) => (
              <div key={g.gid} className="flex items-start gap-1.5">
                <span className="w-[72px] shrink-0 pt-[13px] text-right text-[10px] font-semibold leading-tight text-slate-400 dark:text-slate-500">
                  {g.label}
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-6 gap-0.5">
                  {g.items.map((item) => (
                    <CircleItem key={item.id} item={item} />
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
