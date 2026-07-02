/**
 * 모드 런처 — 풀스크린 글래스 오버레이.
 *
 * 기존 960px 4컬럼 메가메뉴(MainModeTabs 드롭다운)를 대체하는 접근 방식:
 *   - 히어로와 같은 디자인 언어 (--hero-* 변수 · glass · 브랜드 morph 배경 위)
 *   - 역할 축소: "어디로 갈까" 만 답한다 (TODAY 대시보드·알림·핀은 사이드바 소관)
 *   - 검색 → 전체 항목 flat 필터
 *   - 최근 사용 → localStorage (personai.recent_modes, MainModeTabs 와 동일 포맷)
 *   - 라이프 서브그룹 · 전문 상담 도메인은 드릴다운 (같은 surface 안에서 전환)
 *
 * 라이트 테마(GPT·Claude·Mistral) 위에서도 성립하도록 색은 전부 hero 변수 기반.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react';
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

/* ── 최근 사용 (MainModeTabs 와 동일 스토리지 포맷 공유) ── */

const RECENT_KEY = 'personai.recent_modes';

type RecentTarget =
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
  target: RecentTarget;
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

/* ── 항목 모델 ── */

interface LauncherItem {
  id: string;
  label: string;
  desc?: string;
  /** 이모지 (없으면 lucide 아이콘). */
  emoji?: string;
  tint: string;
  target: RecentTarget;
  /** 드릴다운 진입 카드 (chevron 표시, recents 기록 X). */
  drill?: 'premium' | LifeSubgroupId;
}

interface LauncherSection {
  id: string;
  label: string;
  items: LauncherItem[];
}

/* ── Props ── */

interface Props {
  open: boolean;
  onClose: () => void;
  currentMode: MainMode;
  labels: Record<MainMode, string>;
  onSelectMode: (m: MainMode) => void;
  onSelectDebateSub: (sub: DebateSubMode) => void;
  onSelectPremiumDomain: (id: PremiumDomainId) => void;
  onSelectAssistantCard: (cardId: string) => void;
  /** 라이프·플레이어 도구 — Index 가 general 전환 + 스타터 프리필. */
  onSelectTool: (kind: 'life' | 'player', toolId: string, label: string) => void;
}

type DrillView = null | 'premium' | LifeSubgroupId;

export function ModeLauncher({
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
  const [query, setQuery] = useState('');
  const [drill, setDrill] = useState<DrillView>(null);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  // 열릴 때 상태 리셋 + 최근 사용 로드.
  useEffect(() => {
    if (open) {
      setQuery('');
      setDrill(null);
      setRecents(readRecents());
    }
  }, [open]);

  // ESC — 드릴 → 루트 → 닫기 순서.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drill) setDrill(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, drill, onClose]);

  /* ── 섹션 데이터 (MainModeTabs 상수 재사용) ── */

  const sections = useMemo<LauncherSection[]>(() => {
    const modeItem = (m: MainMode, emoji: string): LauncherItem => ({
      id: `mode-${m}`,
      label: labels[m] ?? m,
      desc: MODE_DESCRIPTION[m],
      emoji,
      tint: MODE_TINT[m],
      target: { kind: 'mode', mode: m },
    });

    return [
      {
        id: 'chat',
        label: '대화',
        items: [
          modeItem('general', '💬'),
          modeItem('multi', '🔀'),
          modeItem('research_main', '🔬'),
          {
            id: 'mode-premium_main',
            label: labels.premium_main ?? '전문 상담',
            desc: MODE_DESCRIPTION.premium_main,
            emoji: '🛡️',
            tint: MODE_TINT.premium_main,
            target: { kind: 'mode', mode: 'premium_main' },
            drill: 'premium',
          },
        ],
      },
      {
        id: 'debate',
        label: '토론 · 시뮬레이션',
        items: [
          ...DEBATE_SUBS.map((s): LauncherItem => ({
            id: `debate-${s.key}`,
            label: s.label,
            desc: s.desc,
            emoji: s.key === 'procon' ? '⚔️' : s.key === 'freetalk' ? '💭' : s.key === 'standard' ? '🔭' : '✨',
            tint: s.tint,
            target: { kind: 'debate', sub: s.key },
          })),
          modeItem('stakeholder_main', '👥'),
        ],
      },
      {
        id: 'studio',
        label: '스튜디오',
        items: [
          modeItem('study_main', '📚'),
          modeItem('voice_main', '🎙️'),
          ...ASSISTANT_TILES.filter((t) => !t.placeholder && t.cardId !== 'voice-analysis').map(
            (t): LauncherItem => ({
              id: `assistant-${t.cardId}`,
              label: t.label,
              emoji: t.cardId === 'image-gen' ? '🎨' : t.cardId === 'ppt' ? '📊' : t.cardId === 'file-convert' ? '📁' : '🌐',
              desc:
                t.cardId === 'image-gen' ? '프롬프트로 이미지·영상' :
                t.cardId === 'ppt' ? '프레젠테이션 자동 생성' :
                t.cardId === 'file-convert' ? 'PDF·문서 형식 변환' : '다국어 번역',
              tint: t.tint,
              target: { kind: 'assistant', cardId: t.cardId },
            }),
          ),
        ],
      },
      {
        id: 'life',
        label: '라이프',
        items: [
          // 서브그룹 (드릴다운).
          ...(Object.keys(LIFE_SUBGROUPS) as LifeSubgroupId[]).map((gid): LauncherItem => {
            const g = LIFE_SUBGROUPS[gid];
            return {
              id: `lifegroup-${gid}`,
              label: g.label,
              desc: g.description,
              emoji: g.emoji,
              tint: g.tint,
              target: { kind: 'life', toolId: gid },
              drill: gid,
            };
          }),
          // 직행 featured 도구.
          ...LIFE_TOOLS.filter((t) => t.featured).map((t): LauncherItem => ({
            id: `life-${t.id}`,
            label: t.label,
            desc: t.desc,
            emoji: t.emoji,
            tint: t.tint,
            target: { kind: 'life', toolId: t.id },
          })),
        ],
      },
      {
        id: 'hub',
        label: '노트 · 작업 공간',
        items: HUB_TOOLS.filter((h) => h.id !== 'briefing').map((h): LauncherItem => ({
          id: `hub-${h.id}`,
          label: h.label,
          desc: h.desc,
          emoji: h.emoji,
          tint: h.tint,
          target: { kind: 'hub', hubId: h.id },
        })),
      },
    ];
  }, [labels]);

  /* ── 드릴 뷰 항목 ── */

  const drillItems = useMemo<LauncherItem[]>(() => {
    if (!drill) return [];
    if (drill === 'premium') {
      return PREMIUM_AI_TOOLS.map((p): LauncherItem => ({
        id: `premium-${p.key}`,
        label: p.label,
        desc: p.desc,
        emoji: p.key === 'law' ? '⚖️' : p.key === 'drug' ? '💊' : p.key === 'tax' ? '🧾' : p.key === 'finance' ? '💰' : p.key === 'realestate' ? '🏠' : '💼',
        tint: p.tint,
        target: { kind: 'premium', domainId: p.key },
      }));
    }
    if (drill === 'aiplay') {
      return PLAYER_TOOLS.map((t): LauncherItem => ({
        id: `player-${t.id}`,
        label: t.label,
        desc: t.desc,
        emoji: t.emoji,
        tint: t.tint,
        target: { kind: 'player', toolId: t.id },
      }));
    }
    return LIFE_TOOLS.filter((t) => t.group === drill).map((t): LauncherItem => ({
      id: `life-${t.id}`,
      label: t.label,
      desc: t.desc,
      emoji: t.emoji,
      tint: t.tint,
      target: { kind: 'life', toolId: t.id },
    }));
  }, [drill]);

  /* ── 검색 (전체 leaf 항목 flat) ── */

  const searchResults = useMemo<LauncherItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const all: LauncherItem[] = [
      ...sections.flatMap((s) => s.items.filter((i) => !i.drill)),
      // 드릴 안쪽 항목도 검색에는 노출.
      ...PREMIUM_AI_TOOLS.map((p): LauncherItem => ({
        id: `premium-${p.key}`, label: p.label, desc: p.desc, emoji: '🛡️', tint: p.tint,
        target: { kind: 'premium', domainId: p.key },
      })),
      ...LIFE_TOOLS.filter((t) => !t.featured).map((t): LauncherItem => ({
        id: `life-${t.id}`, label: t.label, desc: t.desc, emoji: t.emoji, tint: t.tint,
        target: { kind: 'life', toolId: t.id },
      })),
      ...PLAYER_TOOLS.map((t): LauncherItem => ({
        id: `player-${t.id}`, label: t.label, desc: t.desc, emoji: t.emoji, tint: t.tint,
        target: { kind: 'player', toolId: t.id },
      })),
    ];
    const seen = new Set<string>();
    return all.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return (
        i.label.toLowerCase().includes(q) ||
        (i.desc ?? '').toLowerCase().includes(q)
      );
    }).slice(0, 16);
  }, [query, sections]);

  /* ── 선택 실행 ── */

  const runTarget = (item: LauncherItem) => {
    const { target } = item;
    // 최근 사용 기록 (드릴 진입 카드는 제외).
    pushRecent({
      id: item.id,
      label: item.label,
      emoji: item.emoji ?? '✨',
      tint: item.tint,
      target,
    });
    onClose();
    // 닫힘 애니메이션과 겹치지 않게 소폭 지연.
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
    }, 60);
  };

  const handleItemClick = (item: LauncherItem) => {
    if (item.drill) {
      setDrill(item.drill);
      return;
    }
    runTarget(item);
  };

  const runRecent = (r: RecentEntry) => {
    handleItemClick({
      id: r.id, label: r.label, emoji: r.emoji, tint: r.tint, target: r.target,
    });
  };

  if (!open) return null;

  const drillTitle =
    drill === 'premium' ? '전문 상담' : drill ? LIFE_SUBGROUPS[drill]?.label : '';

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="모드 선택"
      style={{
        // 브랜드 bg 위에 얹히는 반투명 커튼 — 라이트/다크 자동 대응.
        backgroundColor: 'color-mix(in srgb, var(--hero-bg, #0f1016) 88%, transparent)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
      }}
      onClick={onClose}
    >
      <div
        className="mx-auto max-w-[880px] px-6 pt-10 pb-24 animate-in fade-in slide-in-from-bottom-3 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 타이틀 + 닫기 */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-[26px] font-medium tracking-[-0.02em]"
            style={{ color: 'var(--hero-fg, #ececec)', fontFamily: 'var(--hero-font-heading, inherit)' }}
          >
            어디로 갈까요?
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기 (Esc)"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-105"
            style={{
              color: 'var(--hero-fg-muted)',
              backgroundColor: 'var(--hero-accent-soft)',
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* 검색 */}
        <div
          className="flex items-center gap-2.5 h-11 px-4 rounded-xl border mb-6 transition-colors focus-within:border-[color:var(--hero-ring)]"
          style={{
            backgroundColor: 'var(--hero-input-bg, rgba(255,255,255,0.05))',
            borderColor: 'var(--hero-input-border, rgba(255,255,255,0.12))',
          }}
        >
          <Search size={15} style={{ color: 'var(--hero-fg-muted)' }} className="shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="모드 · 도구 검색…"
            autoFocus
            className="w-full bg-transparent border-0 outline-none text-[14px] placeholder:text-[color:var(--hero-fg-muted)]"
            style={{ color: 'var(--hero-fg)' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색어 지우기"
              className="shrink-0"
              style={{ color: 'var(--hero-fg-muted)' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── 검색 모드 ── */}
        {query.trim() ? (
          <section>
            <SectionLabel>검색 결과 · {searchResults.length}</SectionLabel>
            {searchResults.length > 0 ? (
              <CardGrid items={searchResults} currentMode={currentMode} onClick={handleItemClick} />
            ) : (
              <p className="py-10 text-center text-[13px]" style={{ color: 'var(--hero-fg-muted)' }}>
                "{query}" 에 맞는 항목이 없어요
              </p>
            )}
          </section>
        ) : drill ? (
          /* ── 드릴 뷰 ── */
          <section className="animate-in fade-in slide-in-from-right-2 duration-200">
            <button
              type="button"
              onClick={() => setDrill(null)}
              className="mb-4 inline-flex items-center gap-1.5 h-8 pl-2 pr-3 rounded-full text-[12.5px] font-medium transition-colors"
              style={{
                color: 'var(--hero-fg-muted)',
                backgroundColor: 'var(--hero-accent-soft)',
              }}
            >
              <ArrowLeft size={13} />
              전체
            </button>
            <SectionLabel>{drillTitle}</SectionLabel>
            <CardGrid items={drillItems} currentMode={currentMode} onClick={handleItemClick} />
          </section>
        ) : (
          /* ── 루트 뷰 ── */
          <>
            {/* 최근 사용 */}
            {recents.length > 0 && (
              <div className="mb-7">
                <SectionLabel>최근 사용</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {recents.slice(0, 5).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => runRecent(r)}
                      className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full border text-[12.5px] font-medium transition-all hover:-translate-y-px"
                      style={{
                        color: 'var(--hero-fg)',
                        borderColor: 'var(--hero-hairline)',
                        backgroundColor: 'var(--hero-input-bg)',
                      }}
                    >
                      <span className="text-[13px] leading-none">{r.emoji}</span>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sections.map((section) => (
              <section key={section.id} className="mb-7">
                <SectionLabel>{section.label}</SectionLabel>
                <CardGrid items={section.items} currentMode={currentMode} onClick={handleItemClick} />
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ── 서브 컴포넌트 ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2.5 text-[11px] font-semibold tracking-[0.1em] uppercase"
      style={{ color: 'var(--hero-fg-muted)' }}
    >
      {children}
    </div>
  );
}

function CardGrid({
  items,
  currentMode,
  onClick,
}: {
  items: LauncherItem[];
  currentMode: MainMode;
  onClick: (item: LauncherItem) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {items.map((item) => {
        const isActive =
          item.target.kind === 'mode' && item.target.mode === currentMode;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onClick(item)}
            className={cn(
              'group relative flex items-start gap-2.5 rounded-xl border p-3 text-left',
              'transition-all duration-150 hover:-translate-y-0.5',
            )}
            style={{
              backgroundColor: 'var(--hero-input-bg, rgba(255,255,255,0.04))',
              borderColor: isActive
                ? 'var(--hero-ring, #10a37f)'
                : 'var(--hero-hairline, rgba(255,255,255,0.10))',
              boxShadow: isActive
                ? '0 0 0 1px var(--hero-ring)'
                : '0 2px 10px -6px rgba(0,0,0,0.15)',
            }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 text-[17px] leading-none select-none"
              style={{ backgroundColor: `color-mix(in oklab, ${item.tint} 14%, transparent)` }}
            >
              {item.emoji}
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span
                className="flex items-center gap-1 text-[13px] font-semibold leading-tight"
                style={{ color: 'var(--hero-fg, #ececec)' }}
              >
                <span className="truncate">{item.label}</span>
                {item.drill && (
                  <ChevronRight
                    size={12}
                    className="shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                  />
                )}
              </span>
              {item.desc && (
                <span
                  className="block text-[10.5px] mt-1 leading-snug line-clamp-2"
                  style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
                >
                  {item.desc}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
