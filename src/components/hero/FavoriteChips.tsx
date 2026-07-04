/**
 * 즐겨찾기 칩 — 모드 pill 오른쪽 아이콘 원 바로가기 줄.
 *
 * ModeMenu 에서 별(★)을 켠 항목이 여기 아이콘 칩으로 나타나고, 클릭하면
 * 그 모드로 즉시 이동. 이름은 title 툴팁으로만 (아이콘 전용, 2026-07-05).
 * hover 시 아이콘 → 화살표 crossfade + 우상단 × 제거 버튼.
 * ★ 토글·+ 버튼 없음 — 등록/해제는 모드 메뉴 카드의 별에서만.
 */
import { X, ArrowRight, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';
import { useFavoriteModes, type ItemTarget } from '@/hooks/useFavoriteModes';
import { MODE_ICON, ASSISTANT_TILES, PREMIUM_AI_TOOLS, DEBATE_SUBS } from '@/components/MainModeTabs';
import { HUB_ICONS } from './ModeMenu';

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
  onSelectMode: (m: MainMode) => void;
  onSelectDebateSub: (sub: DebateSubMode) => void;
  onSelectPremiumDomain: (id: PremiumDomainId) => void;
  onSelectAssistantCard: (cardId: string) => void;
  onSelectTool: (kind: 'life' | 'player', toolId: string, label: string) => void;
}

export function FavoriteChips({
  currentMode,
  onSelectMode,
  onSelectDebateSub,
  onSelectPremiumDomain,
  onSelectAssistantCard,
  onSelectTool,
}: Props) {
  const navigate = useNavigate();
  const { favs, removeFav } = useFavoriteModes();

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
      {/* 칩 줄 — 아이콘 원 나열 (★ 토글·+ 없이, 2026-07-05 피드백). */}
      <div className="flex items-center gap-0.5">
      {favs.map((f) => {
        const isActive = f.target.kind === 'mode' && f.target.mode === currentMode;
        return (
          <span
            key={f.id}
            className="group/chip relative inline-flex h-7 shrink-0 items-center rounded-full transition-colors duration-150"
            style={{
              backgroundColor: isActive
                ? `color-mix(in oklab, ${f.tint} 12%, transparent)`
                : undefined,
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
    </>
  );
}
