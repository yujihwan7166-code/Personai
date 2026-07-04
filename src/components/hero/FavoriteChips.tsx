/**
 * 즐겨찾기 칩 — 모드 pill 오른쪽 원클릭 바로가기 줄.
 *
 * ModeMenu 에서 별(★)을 켠 항목이 여기 칩으로 나타나고, 클릭하면 그 모드로
 * 즉시 이동. hover 시 × 로 메뉴 안 열고도 제거 가능. 마지막 + 칩은 모드
 * 메뉴 오픈 (여기에 추가한다는 학습 장치). 즐겨찾기 0개면 + 만 조용히 표시.
 *
 * 시각 언어는 모드 pill 과 동일 — 틴트 10% 배경 + 36% 보더 라운드 필.
 */
import { X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';
import { useFavoriteModes, type ItemTarget } from '@/hooks/useFavoriteModes';

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
      {favs.map((f) => {
        const isActive = f.target.kind === 'mode' && f.target.mode === currentMode;
        return (
          <span
            key={f.id}
            className={cn(
              'group/chip relative inline-flex items-center h-8 rounded-full',
              'border transition-all duration-150 hover:-translate-y-px',
            )}
            style={{
              backgroundColor: `color-mix(in oklab, ${f.tint} 10%, transparent)`,
              borderColor: isActive ? f.tint : `color-mix(in oklab, ${f.tint} 36%, transparent)`,
              boxShadow: isActive ? `inset 0 0 0 1px ${f.tint}` : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => runTarget(f.target, f.label)}
              title={f.desc ? `${f.label} — ${f.desc}` : f.label}
              className="h-full max-w-[132px] truncate pl-3 pr-2 text-[12.5px] font-semibold tracking-tight"
              style={{ color: 'var(--hero-fg)' }}
            >
              {f.label}
            </button>
            {/* hover 시만 나타나는 제거 × — 클릭 영역 겹침 방지 위해 칩 우상단 부유. */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeFav(f.id); }}
              aria-label={`${f.label} 즐겨찾기 해제`}
              className={cn(
                'absolute -right-1 -top-1 hidden group-hover/chip:flex',
                'h-4 w-4 items-center justify-center rounded-full',
                'bg-slate-500 text-white shadow-sm hover:bg-slate-700 transition-colors',
              )}
            >
              <X size={9} strokeWidth={3} />
            </button>
          </span>
        );
      })}
      {/* + 칩 — 모드 메뉴 오픈. 즐겨찾기 없을 땐 이것만 조용히. */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="즐겨찾기 칩 추가 — 모드 메뉴 열기"
        title="메뉴에서 ★ 를 켜면 여기에 칩으로 추가돼요"
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full',
          'border border-dashed transition-all duration-150',
          'opacity-60 hover:opacity-100 hover:-translate-y-px',
        )}
        style={{ borderColor: 'var(--hero-hairline)', color: 'var(--hero-fg-muted, var(--hero-fg))' }}
      >
        <Plus size={14} strokeWidth={2.2} />
      </button>
    </>
  );
}
