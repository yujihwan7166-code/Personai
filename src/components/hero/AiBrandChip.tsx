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
        'group relative flex h-8 w-8 items-center justify-center rounded-full shrink-0',
        'transition-all duration-200 ease-out',
        'ring-1 ring-inset ring-white/10 hover:ring-white/30',
        active && 'scale-110',
      )}
      style={{
        backgroundColor: brandColor,
        ...(active
          ? { boxShadow: `0 0 0 2px var(--hero-bg, #0d0d0d), 0 0 0 4px ${brandColor}` }
          : {}),
      }}
    >
      <BrandLogo path={brand.icon.path} fill="#FFFFFF" size={16} />
    </button>
  );
}
