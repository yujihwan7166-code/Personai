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
  /** 현재 선택된 브랜드. null 이면 어떤 AI 칩도 highlight 안 됨 (검색 armed 시). */
  selectedBrand: BrandId | null;
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
        // items-center 로 크기 다른 칩들이 세로 중앙에 정렬됨
        // gap 은 halo 3px 을 고려해 살짝 크게 (7px = 2×3 + 1 여유).
        'flex items-center justify-center gap-[7px]',
        // padding 으로 selected chip 이 위·아래로 튀어나올 여유
        'px-1 py-1',
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

      {/* Divider — 얇은 헤어라인, halo 로 감싸 배경과 자연스레 이어짐 */}
      <span
        aria-hidden
        className="mx-1.5 h-3.5 w-px shrink-0"
        style={{
          backgroundColor: 'var(--hero-hairline, rgba(255,255,255,0.15))',
          boxShadow: '0 0 0 3px var(--hero-bg, #0d0d0d)',
        }}
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
          'flex h-7 w-7 items-center justify-center rounded-full shrink-0',
          'transition-all duration-200 ease-out',
          'text-[var(--hero-fg,#ececec)] opacity-75 hover:opacity-100 hover:scale-110',
        )}
        style={{
          backgroundColor: 'var(--hero-accent-soft, rgba(255,255,255,0.06))',
          boxShadow:
            '0 0 0 3px var(--hero-bg, #0d0d0d), inset 0 0 0 1px var(--hero-hairline, rgba(255,255,255,0.08))',
        }}
      >
        <Plus size={13} strokeWidth={2.4} />
      </button>
    </div>
  );
}
