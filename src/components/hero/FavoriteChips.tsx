/**
 * 즐겨찾기 칩 — 모드 pill 오른쪽 아이콘 원 바로가기 줄.
 *
 * ModeMenu 에서 별(★)을 켠 항목이 여기 아이콘 칩으로 나타나고, 클릭하면
 * 그 모드로 즉시 이동. 이름은 title 툴팁으로만 (아이콘 전용, 2026-07-05).
 * hover 시 아이콘 → 화살표 crossfade + 우상단 × 제거 버튼.
 * ★ 토글·+ 버튼 없음 — 등록/해제는 모드 메뉴 카드의 별에서만.
 */
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const { favs } = useFavoriteModes();
  // hover 확장 상태 — Tailwind arbitrary variant JIT 이슈를 피해 인라인 트랜지션.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
          target.hubId === 'notes' ? '/notes' :
          target.hubId === 'journal' ? '/journal' :
          target.hubId === 'career' ? '/career' :
          target.hubId === 'travel' ? '/journal?tab=trips' :
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
        const hovered = hoveredId === f.id;
        const Icon = resolveFavIcon(f.id);
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => runTarget(f.target, f.label)}
            title={f.desc ? `${f.label} — ${f.desc}` : f.label}
            aria-label={f.label}
            className="flex h-7 shrink-0 items-center rounded-full px-[7px]"
            style={{
              backgroundColor:
                isActive || hovered
                  ? `color-mix(in oklab, ${f.tint} ${isActive ? 12 : 8}%, transparent)`
                  : undefined,
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={() => setHoveredId(f.id)}
            onMouseLeave={() => setHoveredId((cur) => (cur === f.id ? null : cur))}
          >
            {Icon ? (
              <Icon size={14} strokeWidth={2.2} className="shrink-0" style={{ color: f.tint }} />
            ) : (
              <span
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[11px] font-bold leading-none"
                style={{ color: f.tint }}
              >
                {f.label.charAt(0)}
              </span>
            )}
            {/* hover 시 옆으로 밀리며 이름 슬라이드 인 — max-width 트랜지션이라
             * 이웃 칩이 자연스럽게 밀림 (2026-07-05 피드백, × 부유 버튼 대체). */}
            <span
              className="overflow-hidden whitespace-nowrap text-[12px] font-medium tracking-tight"
              style={{
                color: 'var(--hero-fg)',
                maxWidth: hovered ? 120 : 0,
                opacity: hovered ? 1 : 0,
                marginLeft: hovered ? 5 : 0,
                transition: 'max-width 240ms cubic-bezier(0.22,1,0.36,1), opacity 180ms ease, margin-left 240ms ease',
              }}
            >
              {f.label}
            </span>
          </button>
        );
      })}
      </div>
    </>
  );
}
