/**
 * 히어로 입력창 상단 칩 스트립 — 4 검색 + divider + 8 AI + `+`.
 *
 * 스트립은 입력창 컨테이너 상단 border 를 y-축 중앙에서 관통한다 (translate-y-50).
 * 그래서 상위 컨테이너에서 `absolute -top-4 left-x right-x` 로 배치.
 */
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANDS, type BrandId } from '@/lib/aiBrands';
import { HERO_SEARCH_CHIPS, type HeroChipId } from '@/lib/heroSearchChips';
import { AiBrandChip } from './AiBrandChip';
import { SearchEngineChip } from './SearchEngineChip';

interface Props {
  selectedBrand: BrandId;
  onSelectBrand: (b: BrandId) => void;
  armedSearch: HeroChipId | null;
  onToggleSearch: (id: HeroChipId) => void;
  onOpenBookmarks: () => void;
  onOpenAiPicker: () => void;
  className?: string;
}

export function BrandChipStrip({
  selectedBrand,
  onSelectBrand,
  armedSearch,
  onToggleSearch,
  onOpenBookmarks,
  onOpenAiPicker,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1.5',
        className,
      )}
      role="toolbar"
      aria-label="AI 선택 및 검색"
    >
      {/* 좌측 검색 칩 4개 */}
      {HERO_SEARCH_CHIPS.map((chip) => (
        <SearchEngineChip
          key={chip.id}
          chip={chip}
          armed={armedSearch === chip.id}
          onClick={() => {
            if (chip.id === 'bookmark') {
              onOpenBookmarks();
              return;
            }
            onToggleSearch(chip.id);
          }}
        />
      ))}

      {/* Divider — 얇은 헤어라인 */}
      <span
        aria-hidden
        className="mx-1 h-5 w-px shrink-0"
        style={{ backgroundColor: 'var(--hero-hairline, rgba(255,255,255,0.15))' }}
      />

      {/* 우측 AI 칩 8개 */}
      {BRANDS.map((brand) => (
        <AiBrandChip
          key={brand.id}
          brand={brand}
          active={selectedBrand === brand.id}
          onClick={() => onSelectBrand(brand.id)}
        />
      ))}

      {/* `+` 칩 — 전체 AI 선택 시트 오픈 */}
      <button
        type="button"
        onClick={onOpenAiPicker}
        aria-label="다른 AI 선택"
        title="더 많은 AI"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
          'transition-all duration-200 ease-out',
          'ring-1 ring-inset ring-white/10 hover:ring-white/40',
          'text-[var(--hero-fg,#ececec)] hover:scale-110',
        )}
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        <Plus size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}
