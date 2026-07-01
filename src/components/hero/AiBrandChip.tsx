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
        // 선택된 칩은 크게 · 강한 그림자, 나머지는 절제
        active ? 'h-8 w-8' : 'h-6 w-6 opacity-70 hover:opacity-100 hover:scale-110',
      )}
      style={{
        backgroundColor: brandColor,
        ...(active
          ? {
              boxShadow: `
                0 0 0 2px var(--hero-bg, #0d0d0d),
                0 0 0 3.5px ${brandColor},
                0 6px 20px -4px ${brandColor}
              `,
            }
          : {
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
            }),
      }}
    >
      <BrandLogo
        imgUrl={brand.icon.imgUrl}
        path={brand.icon.path}
        fill="#FFFFFF"
        size={active ? 16 : 12}
      />
    </button>
  );
}
