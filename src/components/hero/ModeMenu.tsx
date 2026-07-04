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
  Star, ChevronDown, MessagesSquare, Layers, FlaskConical,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';
import { useFavoriteModes, MAX_FAVS, type ItemTarget } from '@/hooks/useFavoriteModes';
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

/* ── 즐겨찾기 — useFavoriteModes 공유 스토어 (히어로 칩 줄과 실시간 동기화) ── */

/* ── 모델 ── */

interface MenuItem {
  id: string;
  label: string;
  desc?: string;
  tint: string;
  target: ItemTarget;
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
  const { favs, isFav, toggleFav: toggleFavRaw } = useFavoriteModes();
  const [openLifeGroup, setOpenLifeGroup] = useState<LifeSubgroupId | null>(null);

  useEffect(() => {
    if (open) setOpenLifeGroup(null);
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

  /* ── 데이터 ── */

  const { primaryItems, zones, lifeGroups } = useMemo(() => {
    const modeItem = (m: MainMode): MenuItem => ({
      id: `mode-${m}`,
      label: labels[m] ?? m,
      desc: MODE_DESCRIPTION[m],
      tint: MODE_TINT[m],
      target: { kind: 'mode', mode: m },
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
        label: '노트',
        color: ZONE_COLORS.hub,
        items: HUB_TOOLS.filter((h) => h.id !== 'briefing').map((h): MenuItem => ({
          id: `hub-${h.id}`, label: h.label, desc: h.desc, tint: h.tint,
          target: { kind: 'hub', hubId: h.id },
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

  /* ── 컴팩트 아이템 카드 (존 내부 공통) ── */
  const ItemCard = ({ item }: { item: MenuItem }) => {
    const isActive = item.target.kind === 'mode' && item.target.mode === currentMode;
    const faved = isFav(item.id);
    return (
      <div className="group relative rounded-lg bg-white dark:bg-slate-900 ring-1 ring-black/[0.06] dark:ring-white/10 hover:ring-2 hover:-translate-y-px hover:shadow-sm transition-all duration-100"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.setProperty('--tw-ring-color', item.tint); }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.removeProperty('--tw-ring-color'); }}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => runItem(item)}
          className="w-full px-2.5 py-1.5 text-left"
        >
          <span className="flex items-center gap-1.5 text-[12px] font-semibold leading-tight text-slate-800 dark:text-slate-100">
            <span className="truncate">{item.label}</span>
            {isActive && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.tint }} aria-label="현재 모드" />
            )}
          </span>
          {item.desc && (
            <span className="mt-px block truncate text-[10px] text-slate-400 dark:text-slate-500">{item.desc}</span>
          )}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleFav(item); }}
          aria-label={faved ? '즐겨찾기 해제' : '즐겨찾기 등록'}
          className={cn(
            'absolute right-1 top-1 rounded p-0.5 transition-all duration-100',
            faved ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-400',
          )}
        >
          <Star size={11} className={faved ? 'fill-amber-400' : undefined} />
        </button>
      </div>
    );
  };

  /* ── 존 래퍼 — 옅은 틴트 배경 패널 ── */
  const ZonePanel = ({ label, color, count, children }: { label: string; color: string; count: number; children: React.ReactNode }) => (
    <section
      className="rounded-xl px-2.5 pt-2 pb-2.5"
      style={{ backgroundColor: `${color}0c`, boxShadow: `inset 0 0 0 1px ${color}1f` }}
    >
      <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
        <span className="text-[11.5px] font-bold" style={{ color }}>{label}</span>
        <span className="text-[9.5px] font-semibold tabular-nums opacity-60" style={{ color }}>{count}</span>
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
        'absolute top-3 left-3 z-40 w-[560px] max-w-[calc(100%-24px)]',
        'rounded-2xl overflow-hidden',
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-700',
        'shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35),0_4px_16px_-8px_rgba(15,23,42,0.15)]',
        'animate-in fade-in zoom-in-[0.98] slide-in-from-top-1 duration-200',
      )}
    >
      <div className="max-h-[min(600px,calc(100vh-140px))] space-y-2 overflow-y-auto overscroll-contain p-2.5 scrollbar-thin">
        {/* 즐겨찾기 — 있을 때만 최상단. */}
        {favs.length > 0 && (
          <ZonePanel label="★ 즐겨찾기" color={ZONE_COLORS.favorites} count={favs.length}>
            <div className="grid grid-cols-3 gap-1.5">
              {favs.map((f) => (
                <ItemCard key={`fav-${f.id}`} item={{ id: f.id, label: f.label, desc: f.desc, tint: f.tint, target: f.target }} />
              ))}
            </div>
          </ZonePanel>
        )}

        {/* 프라이머리 — AI 대화 3종 큰 타일. */}
        <div className="grid grid-cols-3 gap-2">
          {primaryItems.map((item, i) => {
            const Icon = PRIMARY_ICONS[i] ?? MessagesSquare;
            const isActive = item.target.kind === 'mode' && item.target.mode === currentMode;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => runItem(item)}
                className={cn(
                  'rounded-xl p-3 text-left transition-all duration-100 hover:-translate-y-px hover:shadow-md',
                )}
                style={{
                  backgroundColor: `${item.tint}12`,
                  boxShadow: isActive ? `inset 0 0 0 2px ${item.tint}` : `inset 0 0 0 1px ${item.tint}30`,
                }}
              >
                <Icon size={17} strokeWidth={2} style={{ color: item.tint }} />
                <div className="mt-1.5 text-[13px] font-bold text-slate-800 dark:text-slate-100">{item.label}</div>
                <div className="mt-0.5 truncate text-[10.5px] text-slate-500 dark:text-slate-400">{item.desc}</div>
              </button>
            );
          })}
        </div>

        {/* 존들 — 노트 → 스튜디오 → 전문 → 토론. */}
        {zones.map((zone) => (
          <ZonePanel key={zone.id} label={zone.label} color={zone.color} count={zone.items.length}>
            <div className="grid grid-cols-3 gap-1.5">
              {zone.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </ZonePanel>
        ))}

        {/* 라이프 존 — 그룹 카드 축약, 클릭 시 제자리 펼침. */}
        <ZonePanel label="라이프" color={ZONE_COLORS.life} count={lifeGroups.reduce((n, g) => n + g.items.length, 0)}>
          <div className="grid grid-cols-3 gap-1.5">
            {lifeGroups.map((g) => {
              const opened = openLifeGroup === g.gid;
              return (
                <button
                  key={g.gid}
                  type="button"
                  onClick={() => setOpenLifeGroup(opened ? null : g.gid)}
                  aria-expanded={opened}
                  className={cn(
                    'flex items-center justify-between gap-1 rounded-lg bg-white dark:bg-slate-900 px-2.5 py-2 text-left',
                    'ring-1 ring-black/[0.06] dark:ring-white/10 transition-all duration-100 hover:-translate-y-px hover:shadow-sm',
                    opened && 'ring-2',
                  )}
                  style={opened ? { ['--tw-ring-color' as string]: ZONE_COLORS.life } : undefined}
                >
                  <span className="min-w-0 truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">{g.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="rounded-full px-1.5 py-px text-[9px] font-bold text-white" style={{ backgroundColor: ZONE_COLORS.life }}>
                      {g.items.length}
                    </span>
                    <ChevronDown size={11} className={cn('text-slate-400 transition-transform', opened && 'rotate-180')} />
                  </span>
                </button>
              );
            })}
          </div>
          {openLifeGroup && (
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {lifeGroups.find((g) => g.gid === openLifeGroup)?.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </ZonePanel>
      </div>
    </div>
  );
}
