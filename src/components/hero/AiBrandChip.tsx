/**
 * AI 브랜드 칩 — 히어로 입력창 상단 border 를 관통(translate-y-50) 하는 원형 배지.
 *
 * - 배경 = 브랜드 시그니처 색
 * - 로고 = 흰색 오버라이드 (단색 SVG 규격이라 통일감)
 * - active 시 = 브랜드 색 링 outset + scale-up
 */
import { cn } from '@/lib/utils';
import type { Brand } from '@/lib/aiBrands';
import { BrandLogo } from './BrandLogo';

interface Props {
  brand: Brand;
  active: boolean;
  onClick: () => void;
}

export function AiBrandChip({ brand, active, onClick }: Props) {
  const brandColor = `#${brand.icon.hex}`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${brand.name} — ${brand.provider}`}
      aria-pressed={active}
      title={`${brand.name} · ${brand.provider}`}
      className={cn(
        'group relative flex items-center justify-center rounded-full shrink-0',
        'transition-all duration-300 ease-out',
        // 선택된 칩은 세련되게 살짝 크고, 나머지는 절제된 크기·투명도.
        active ? 'h-9 w-9' : 'h-7 w-7 opacity-75 hover:opacity-100 hover:scale-110',
      )}
      style={{
        backgroundColor: brandColor,
        ...(active
          ? {
              // 얇은 hero-bg halo + 브랜드 링 + 은은한 glow — 정제된 3단.
              boxShadow: `
                0 0 0 3px var(--hero-bg, #0d0d0d),
                0 0 0 4.5px ${brandColor},
                0 6px 24px -6px ${brandColor}
              `,
            }
          : {
              // hero-bg halo 로 칩 사이 border 자연스럽게 가림 (회색 pill 대신).
              boxShadow: `
                0 0 0 3px var(--hero-bg, #0d0d0d),
                inset 0 0 0 1px rgba(255,255,255,0.08)
              `,
            }),
      }}
    >
      {/* 칩 안에서는 clean monochrome SVG path 만 사용 (img filter 는 detail 손상). */}
      <BrandLogo
        path={brand.icon.path}
        fill="#FFFFFF"
        size={active ? 17 : 13}
      />
    </button>
  );
}
