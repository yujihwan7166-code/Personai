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
import { pickContrastingText } from '@/lib/colorUtils';

interface Props {
  brand: Brand;
  active: boolean;
  onClick: () => void;
}

export function AiBrandChip({ brand, active, onClick }: Props) {
  const brandColor = `#${brand.icon.hex}`;
  const logoTone = pickContrastingText(brandColor);
  // 밝은 칩(GPT·Grok 흰 원)은 라이트 배경에서 경계가 사라지므로 어두운 inset 테두리.
  const edgeInset =
    logoTone === '#000000'
      ? 'inset 0 0 0 1px rgba(0,0,0,0.12)'
      : 'inset 0 0 0 1px rgba(255,255,255,0.08)';
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
        active ? 'h-[42px] w-[42px]' : 'h-[32px] w-[32px] opacity-75 hover:opacity-100 hover:scale-110',
      )}
      style={{
        backgroundColor: brandColor,
        ...(active
          ? {
              // 얇은 hero-bg halo + 브랜드 accent 링 + 은은한 glow — 정제된 3단.
              // 링은 --hero-ring (칩 색이 아니라 accent) — 흰 칩도 라이트 배경에서 선명.
              boxShadow: `
                0 0 0 3px var(--hero-bg, #0d0d0d),
                0 0 0 4.5px var(--hero-ring, ${brandColor}),
                0 6px 24px -6px var(--hero-ring, ${brandColor}),
                ${edgeInset}
              `,
            }
          : {
              // hero-bg halo 로 칩 사이 border 자연스럽게 가림 (회색 pill 대신).
              boxShadow: `
                0 0 0 3px var(--hero-bg, #0d0d0d),
                ${edgeInset}
              `,
            }),
      }}
    >
      {/* 칩 안 로고 우선순위: imgUrl (실제 파일) > SVG path > text.
       * GPT 는 /logos/gpt.svg (실제 OpenAI 마크 파일) 사용해 chip 에 표시. */}
      {/* 로고 색 = 칩 배경 휘도 기준 자동 — Grok(흰 칩)은 검정 로고. */}
      <BrandLogo
        imgUrl={brand.icon.imgUrl}
        path={brand.icon.path}
        text={brand.icon.text}
        fill={pickContrastingText(brandColor)}
        forceWhite={pickContrastingText(brandColor) === '#ffffff'}
        size={Math.round((active ? 20 : 16) * (brand.icon.logoScale ?? 1))}
      />
    </button>
  );
}
