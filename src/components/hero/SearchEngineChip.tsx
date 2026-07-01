/**
 * 검색엔진 칩 — 히어로 입력창 상단 border 를 관통하는 원형 배지 (좌측 그룹).
 *
 * armed 상태:
 *   - 입력창에서 Enter 시 외부 검색 URL 로 새 탭 리다이렉트 (external=true).
 *   - 다시 누르면 disarm.
 *   - 북마크(external=false)는 클릭 즉시 앱 내부 모달 오픈.
 */
import { cn } from '@/lib/utils';
import type { HeroSearchChip } from '@/lib/heroSearchChips';
import { BrandLogo } from './BrandLogo';

interface Props {
  chip: HeroSearchChip;
  armed: boolean;
  onClick: () => void;
}

export function SearchEngineChip({ chip, armed, onClick }: Props) {
  const { icon, ring, circleBg, iconFill, external } = chip;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={external ? `${chip.name}에서 검색` : chip.name}
      aria-pressed={armed}
      title={external ? `${chip.name}에서 검색 (Enter)` : chip.name}
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-full shrink-0',
        'transition-all duration-200 ease-out',
        'ring-1 ring-inset ring-white/10 hover:ring-white/30',
        armed && 'scale-110',
        // transparent bg 칩(북마크) 은 hover 시 소프트 fill
        circleBg === 'transparent' && 'hover:bg-white/5',
      )}
      style={{
        backgroundColor: circleBg,
        ...(armed
          ? { boxShadow: `0 0 0 2px var(--hero-bg, #0d0d0d), 0 0 0 4px ${ring}` }
          : {}),
      }}
    >
      <BrandLogo
        path={icon.path}
        text={icon.text}
        lucide={icon.lucide as 'Star' | 'Bookmark' | undefined}
        fill={iconFill}
        size={16}
      />
    </button>
  );
}
