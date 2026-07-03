/**
 * 모드 메뉴 — pill 아래에 뜨는 2-패널 커맨드 팝오버 (Raycast·Arc 감성).
 *
 *  ┌────────────────────────────────────────────┐
 *  │ 🔍 검색…                                    │
 *  ├──────────┬─────────────────────────────────┤
 *  │ 🕐 최근   │  💬 단일 AI    AI 를 골라 1:1    │
 *  │ 💬 대화 ◀│  🔀 멀티 AI    여러 AI 비교      │
 *  │ ⚔️ 토론   │  🔬 심층 리서치 교차 검증        │
 *  │ 🎛️ 스튜디오│  🛡️ 전문 상담              ›   │
 *  │ 🌱 라이프 │                                 │
 *  │ 📔 노트   │                                 │
 *  └──────────┴─────────────────────────────────┘
 *
 * - 좌측 레일 hover 만으로 우측 패널 즉시 전환 (macOS 메뉴 감각).
 * - 전문 상담·라이프 서브그룹은 우측 패널 안에서 in-place 전환 (← 헤더).
 * - 검색 시 우측 패널이 flat 결과로 대체.
 * - ESC: 서브뷰 → 닫기. 바깥 클릭: 닫기. 화면 전환·오버레이 없음.
 * - 색은 전부 --hero-* 변수 — 라이트(GPT·Claude)/다크 브랜드 자동 대응.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Clock, Search,
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

/* ── 최근 사용 (기존 personai.recent_modes 포맷 공유) ── */

const RECENT_KEY = 'personai.recent_modes';

type ItemTarget =
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
  target: ItemTarget;
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
    ].slice(0, 10);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
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

type CategoryId = 'recent' | 'chat' | 'debate' | 'studio' | 'life' | 'hub';
type SubView = 'premium' | LifeSubgroupId;

/* 레일 아이콘 — 이모지 대신 모노크롬 lucide (유아틱 → 커맨드 팔레트 감성). */
const CATEGORIES: { id: CategoryId; label: string; icon: LucideIcon }[] = [
  { id: 'recent', label: '최근',       icon: Clock },
  { id: 'chat',   label: '대화',       icon: MessagesSquare },
  { id: 'debate', label: '토론·시뮬',  icon: Swords },
  { id: 'studio', label: '스튜디오',   icon: SlidersHorizontal },
  { id: 'life',   label: '라이프',     icon: Sprout },
  { id: 'hub',    label: '노트',       icon: NotebookPen },
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
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  // 열릴 때 초기화 — 최근이 있으면 최근 탭, 없으면 대화 탭.
  useEffect(() => {
    if (open) {
      const r = readRecents();
      setRecents(r);
      setCategory(r.length > 0 ? 'recent' : 'chat');
      setSubView(null);
      setQuery('');
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

  const categoryItems = useMemo<Record<Exclude<CategoryId, 'recent'>, MenuItem[]>>(() => ({
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
        emoji: s.key === 'procon' ? '⚔️' : s.key === 'freetalk' ? '💭' : s.key === 'standard' ? '🔭' : '✨',
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
          emoji: t.cardId === 'image-gen' ? '🎨' : t.cardId === 'ppt' ? '📊' : t.cardId === 'file-convert' ? '📁' : '🌐',
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
        emoji: p.key === 'law' ? '⚖️' : p.key === 'drug' ? '💊' : p.key === 'tax' ? '🧾' : p.key === 'finance' ? '💰' : p.key === 'realestate' ? '🏠' : '💼',
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

  /* ── 검색 — 전체 leaf flat ── */

  const searchResults = useMemo<MenuItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const all: MenuItem[] = [
      ...Object.values(categoryItems).flat().filter((i) => !i.drill),
      ...PREMIUM_AI_TOOLS.map((p): MenuItem => ({
        id: `premium-${p.key}`, label: p.label, desc: p.desc, emoji: '🛡️', tint: p.tint,
        target: { kind: 'premium', domainId: p.key },
      })),
      ...LIFE_TOOLS.filter((t) => !t.featured).map((t): MenuItem => ({
        id: `life-${t.id}`, label: t.label, desc: t.desc, emoji: t.emoji, tint: t.tint,
        target: { kind: 'life', toolId: t.id },
      })),
      ...PLAYER_TOOLS.map((t): MenuItem => ({
        id: `player-${t.id}`, label: t.label, desc: t.desc, emoji: t.emoji, tint: t.tint,
        target: { kind: 'player', toolId: t.id },
      })),
    ];
    const seen = new Set<string>();
    return all.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return i.label.toLowerCase().includes(q) || (i.desc ?? '').toLowerCase().includes(q);
    }).slice(0, 12);
  }, [query, categoryItems]);

  /* ── 실행 ── */

  const runItem = (item: MenuItem) => {
    if (item.drill) {
      setSubView(item.drill);
      return;
    }
    const target = item.target;
    if (!target) return;
    pushRecent({ id: item.id, label: item.label, emoji: item.emoji, tint: item.tint, target });
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

  const isSearching = query.trim().length > 0;
  const paneItems: MenuItem[] = isSearching
    ? searchResults
    : subView
      ? subViewItems
      : category === 'recent'
        ? recents.map((r): MenuItem => ({
            id: r.id, label: r.label, emoji: r.emoji, tint: r.tint, target: r.target,
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
        'rounded-2xl border overflow-hidden',
        'animate-in fade-in zoom-in-[0.98] slide-in-from-top-1 duration-200',
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--hero-bg, #101014) 88%, transparent)',
        borderColor: 'var(--hero-hairline, rgba(255,255,255,0.10))',
        backdropFilter: 'blur(28px) saturate(170%)',
        WebkitBackdropFilter: 'blur(28px) saturate(170%)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 60px -24px rgba(0,0,0,0.45), 0 4px 16px -8px rgba(0,0,0,0.25)',
      }}
    >
      {/* 검색 — 상단 풀폭. */}
      <div
        className="flex items-center gap-2.5 h-11 px-4 border-b"
        style={{ borderColor: 'var(--hero-hairline, rgba(255,255,255,0.08))' }}
      >
        <Search size={14} style={{ color: 'var(--hero-fg-muted)' }} className="shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="모드 · 도구 검색"
          autoFocus
          className="w-full bg-transparent border-0 outline-none text-[13.5px] placeholder:text-[color:var(--hero-fg-muted)]"
          style={{ color: 'var(--hero-fg)' }}
        />
        <kbd
          className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border select-none"
          style={{
            color: 'var(--hero-fg-muted)',
            borderColor: 'var(--hero-hairline)',
          }}
        >
          esc
        </kbd>
      </div>

      <div className="flex" style={{ height: 328 }}>
        {/* 좌측 카테고리 레일 — hover 만으로 전환. */}
        <nav
          className={cn('w-[132px] shrink-0 p-1.5 space-y-0.5 border-r', isSearching && 'opacity-40 pointer-events-none')}
          style={{ borderColor: 'var(--hero-hairline, rgba(255,255,255,0.08))' }}
        >
          {CATEGORIES.filter((c) => c.id !== 'recent' || recents.length > 0).map((c) => {
            const active = !isSearching && category === c.id && !subView;
            const dimActive = !isSearching && category === c.id && !!subView;
            return (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => { setCategory(c.id); setSubView(null); }}
                onClick={() => { setCategory(c.id); setSubView(null); }}
                className={cn(
                  'flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-left',
                  'text-[12.5px] font-medium transition-colors duration-100',
                )}
                style={{
                  color: active || dimActive ? 'var(--hero-fg)' : 'var(--hero-fg-muted)',
                  backgroundColor: active
                    ? 'var(--hero-accent-soft, rgba(255,255,255,0.07))'
                    : 'transparent',
                }}
              >
                <c.icon size={14} strokeWidth={1.9} className="shrink-0 opacity-75" />
                <span className="truncate">{c.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 우측 패널 — 항목 리스트. */}
        <div className="flex-1 min-w-0 overflow-y-auto overscroll-contain p-1.5">
          {/* 서브뷰 헤더 (← 전문상담 / 운세 등). */}
          {!isSearching && subView && (
            <button
              type="button"
              onClick={() => setSubView(null)}
              className="mb-1 flex items-center gap-1.5 h-7 px-2 rounded-lg text-[11.5px] font-semibold transition-colors"
              style={{ color: 'var(--hero-fg-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hero-accent-soft)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <ArrowLeft size={12} />
              {subViewTitle}
            </button>
          )}

          {/* 검색 헤더. */}
          {isSearching && (
            <div
              className="px-2 pt-1 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] uppercase"
              style={{ color: 'var(--hero-fg-muted)' }}
            >
              검색 결과 · {searchResults.length}
            </div>
          )}

          {paneItems.length === 0 ? (
            <p
              className="py-12 text-center text-[12.5px]"
              style={{ color: 'var(--hero-fg-muted)' }}
            >
              {isSearching ? `"${query}" 결과 없음` : '항목이 없어요'}
            </p>
          ) : (
            paneItems.map((item, i) => {
              const isActive =
                item.target?.kind === 'mode' && item.target.mode === currentMode;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => runItem(item)}
                  className={cn(
                    'group flex w-full items-center gap-2.5 px-2 py-[7px] rounded-lg text-left',
                    'transition-colors duration-100',
                    'animate-in fade-in fill-mode-both',
                  )}
                  style={{ animationDelay: `${Math.min(i * 14, 140)}ms`, animationDuration: '150ms' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hero-accent-soft)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {/* 파스텔 컬러 타일 제거 — 이모지를 배경 없이 차분하게 (채도 살짝 낮춤). */}
                  <span
                    className="flex h-7 w-7 items-center justify-center shrink-0 text-[15px] leading-none select-none"
                    style={{ filter: 'saturate(0.8)', opacity: 0.92 }}
                  >
                    {item.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="flex items-center gap-1.5 text-[13px] font-medium leading-tight"
                      style={{ color: 'var(--hero-fg)' }}
                    >
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <span
                          className="shrink-0 h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--hero-ring, var(--hero-accent))' }}
                          aria-label="현재 모드"
                        />
                      )}
                    </span>
                    {item.desc && (
                      <span
                        className="block text-[10.5px] mt-0.5 truncate"
                        style={{ color: 'var(--hero-fg-muted)' }}
                      >
                        {item.desc}
                      </span>
                    )}
                  </span>
                  {item.drill && (
                    <ChevronRight
                      size={13}
                      className="shrink-0 opacity-40 group-hover:opacity-90 group-hover:translate-x-0.5 transition-all"
                      style={{ color: 'var(--hero-fg-muted)' }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
