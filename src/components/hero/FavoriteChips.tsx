/**
 * 즐겨찾기 칩 — 모드 pill 오른쪽 접이식 바로가기 줄.
 *
 * ModeMenu 에서 별(★)을 켠 항목이 여기 칩으로 나타나고, 클릭하면 그 모드로
 * 즉시 이동. hover 시 × 로 메뉴 안 열고도 제거 가능. 마지막 + 는 모드
 * 메뉴 오픈 (여기에 추가한다는 학습 장치). 즐겨찾기 0개면 + 만 조용히 표시.
 *
 * 접이식 (2026-07-05): ★n 토글 버튼으로 칩 줄이 옆으로 펼쳐지고 접힘
 * (max-width 슬라이드 + 칩별 스태거). 상태는 localStorage 기억 —
 * 항상 펴놓고 쓰는 사람의 원클릭 접근성 보존. 기본값은 펼침.
 */
import { useState } from 'react';
import { X, Plus, ArrowRight, Star, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';
import { useFavoriteModes, type ItemTarget } from '@/hooks/useFavoriteModes';
import { MODE_ICON, ASSISTANT_TILES, PREMIUM_AI_TOOLS, DEBATE_SUBS } from '@/components/MainModeTabs';
import { HUB_ICONS } from './ModeMenu';

const OPEN_KEY = 'personai.fav_chips_open';

/* 즐겨찾기 id → 아이콘 — FavEntry 는 직렬화 저장이라 아이콘을 못 담음.
 * id 접두사(mode-/hub-/assistant-/premium-/debate-)로 원본 데이터에서 역해석.
 * 라이프·플레이어 도구는 아이콘이 없어 라벨 첫 글자 폴백. */
function resolveFavIcon(id: string): LucideIcon | undefined {
  if (id.startsWith('mode-')) return MODE_ICON[id.slice(5) as MainMode];
  if (id.startsWith('hub-')) return HUB_ICONS[id.slice(4)];
  if (id.startsWith('assistant-')) return ASSISTANT_TILES.find((t) => t.cardId === id.slice(10))?.icon;
  if (id.startsWith('premium-')) return PREMIUM_AI_TOOLS.find((p) => p.key === id.slice(8))?.icon;
  if (id.startsWith('debate-')) return DEBATE_SUBS.find((s) => s.key === id.slice(7))?.icon;
  return undefined;
}

interface Props {
  currentMode: MainMode;
  onOpenMenu: () => void;
  onSelectMode: (m: MainMode) => void;
  onSelectDebateSub: (sub: DebateSubMode) => void;
  onSelectPremiumDomain: (id: PremiumDomainId) => void;
  onSelectAssistantCard: (cardId: string) => void;
  onSelectTool: (kind: 'life' | 'player', toolId: string, label: string) => void;
}

export function FavoriteChips({
  currentMode,
  onOpenMenu,
  onSelectMode,
  onSelectDebateSub,
  onSelectPremiumDomain,
  onSelectAssistantCard,
  onSelectTool,
}: Props) {
  const navigate = useNavigate();
  const { favs, removeFav } = useFavoriteModes();
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(OPEN_KEY) !== '0';
    } catch {
      return true;
    }
  });

  const toggleOpen = () => {
    setOpen((prev) => {
      try {
        window.localStorage.setItem(OPEN_KEY, prev ? '0' : '1');
      } catch {
        /* noop */
      }
      return !prev;
    });
  };

  const runTarget = (target: ItemTarget, label: string) => {
    switch (target.kind) {
      case 'mode': onSelectMode(target.mode); break;
      case 'debate': onSelectDebateSub(target.sub); break;
      case 'premium': onSelectPremiumDomain(target.domainId); break;
      case 'assistant': onSelectAssistantCard(target.cardId); break;
      case 'life': onSelectTool('life', target.toolId, label); break;
      case 'player': onSelectTool('player', target.toolId, label); break;
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
  };

  return (
    <>
      {/* 세로 헤어라인 — pill 존과 칩 존 구분. */}
      {favs.length > 0 && (
        <span aria-hidden className="mx-1 h-4 w-px shrink-0" style={{ backgroundColor: 'var(--hero-hairline)' }} />
      )}
      {/* ★n 토글 — 칩 줄 접기/펴기. */}
      {favs.length > 0 && (
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-label={open ? '즐겨찾기 칩 접기' : `즐겨찾기 칩 ${favs.length}개 펼치기`}
          title={open ? '접기' : '즐겨찾기 펼치기'}
          className={cn(
            'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2',
            'transition-colors duration-150 hover:bg-black/[0.05]',
          )}
          style={{ color: open ? '#d97706' : 'var(--hero-fg)' }}
        >
          <Star size={12} strokeWidth={2.2} className={open ? 'fill-amber-500 text-amber-500' : 'opacity-60'} />
          <span className="text-[11px] font-semibold tabular-nums opacity-70">{favs.length}</span>
        </button>
      )}
      {/* 접이식 컨테이너 — max-width 슬라이드로 옆으로 쭉 펼쳐짐. */}
      <div
        className="flex items-center gap-0.5 overflow-hidden"
        style={{
          maxWidth: open ? 640 : 0,
          opacity: open ? 1 : 0,
          transition: 'max-width 320ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease',
        }}
        aria-hidden={!open}
      >
      {favs.map((f, chipIdx) => {
        const isActive = f.target.kind === 'mode' && f.target.mode === currentMode;
        return (
          <span
            key={f.id}
            className="group/chip relative inline-flex h-7 shrink-0 items-center rounded-full"
            style={{
              backgroundColor: isActive
                ? `color-mix(in oklab, ${f.tint} 12%, transparent)`
                : undefined,
              // 펼침 스태거 — 칩이 순서대로 왼쪽에서 미끄러져 들어옴.
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(-10px)',
              transition: [
                `opacity 180ms ease ${open ? chipIdx * 30 : 0}ms`,
                `transform 240ms cubic-bezier(0.22,1,0.36,1) ${open ? chipIdx * 30 : 0}ms`,
                'background-color 150ms ease',
              ].join(', '),
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = `color-mix(in oklab, ${f.tint} 8%, transparent)`;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = '';
            }}
          >
            <button
              type="button"
              onClick={() => runTarget(f.target, f.label)}
              tabIndex={open ? 0 : -1}
              title={f.desc ? `${f.label} — ${f.desc}` : f.label}
              aria-label={f.label}
              className="flex h-7 w-7 items-center justify-center rounded-full"
            >
              {/* 아이콘 전용 칩 (이름 X) — hover 시 아이콘이 화살표로 crossfade
               * ("누르면 이동" 어포던스 유지). 아이콘 없는 도구는 첫 글자. */}
              <span className="relative h-3.5 w-3.5">
                {(() => {
                  const Icon = resolveFavIcon(f.id);
                  return Icon ? (
                    <Icon
                      size={14}
                      strokeWidth={2.2}
                      className="absolute inset-0 m-auto transition-all duration-150 group-hover/chip:scale-75 group-hover/chip:opacity-0"
                      style={{ color: f.tint }}
                    />
                  ) : (
                    <span
                      className="absolute inset-0 m-auto flex items-center justify-center text-[11px] font-bold leading-none transition-all duration-150 group-hover/chip:scale-75 group-hover/chip:opacity-0"
                      style={{ color: f.tint }}
                    >
                      {f.label.charAt(0)}
                    </span>
                  );
                })()}
                <ArrowRight
                  size={13}
                  strokeWidth={2.6}
                  className="absolute inset-0 m-auto -translate-x-0.5 opacity-0 transition-all duration-150 group-hover/chip:translate-x-0 group-hover/chip:opacity-100"
                  style={{ color: f.tint }}
                />
              </span>
            </button>
            {/* hover 시만 나타나는 제거 × — 칩 우상단 부유. */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeFav(f.id); }}
              tabIndex={open ? 0 : -1}
              aria-label={`${f.label} 즐겨찾기 해제`}
              className={cn(
                'absolute -right-0.5 -top-0.5 hidden group-hover/chip:flex',
                'h-3.5 w-3.5 items-center justify-center rounded-full',
                'bg-slate-400 text-white shadow-sm hover:bg-slate-600 transition-colors',
              )}
            >
              <X size={8} strokeWidth={3} />
            </button>
          </span>
        );
      })}
      </div>
      {/* + — 모드 메뉴 오픈. 즐겨찾기 없을 땐 이것만 조용히. */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="즐겨찾기 칩 추가 — 모드 메뉴 열기"
        title="메뉴에서 ★ 를 켜면 여기에 칩으로 추가돼요"
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          'opacity-50 transition-all duration-150 hover:opacity-100 hover:bg-black/[0.05]',
        )}
        style={{ color: 'var(--hero-fg)' }}
      >
        <Plus size={14} strokeWidth={2.2} />
      </button>
    </>
  );
}
