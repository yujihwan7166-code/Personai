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
  /** 스트립에 표시할 브랜드 id 목록 (미지정 시 전체). */
  visibleBrandIds?: BrandId[];
  className?: string;
}

export function BrandChipStrip({
  selectedBrand,
  onSelectBrand,
  armedSearch,
  onToggleSearch,
  onOpenBookmarks,
  onOpenAiPicker,
  visibleBrandIds,
  className,
}: Props) {
  // visibleBrandIds 미지정 시 전체. 지정 시 그 순서대로 필터.
  const visibleBrands = visibleBrandIds
    ? visibleBrandIds.map((id) => BRANDS.find((b) => b.id === id)).filter((b): b is (typeof BRANDS)[number] => !!b)
    : BRANDS;
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

      {/* 검색 · AI 사이 여백 — 눈에 띄는 선 없이 넉넉한 gap 으로만 구분. */}
      <span aria-hidden className="w-3 shrink-0" />

      {/* 우측 AI 칩 (사용자 커스텀 필터 반영) */}
      {visibleBrands.map((brand) => (
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
          'flex h-[26px] w-[26px] items-center justify-center rounded-full shrink-0',
          'transition-all duration-200 ease-out',
          'text-[var(--hero-fg,#ececec)] opacity-75 hover:opacity-100 hover:scale-110',
        )}
        style={{
          backgroundColor: 'var(--hero-accent-soft, rgba(255,255,255,0.06))',
          boxShadow:
            '0 0 0 3px var(--hero-bg, #0d0d0d), inset 0 0 0 1px var(--hero-hairline, rgba(255,255,255,0.08))',
        }}
      >
        <Plus size={12} strokeWidth={2.4} />
      </button>
    </div>
  );
}
