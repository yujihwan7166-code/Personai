import type { CSSProperties } from 'react';
import type { SlideImageCrop } from './types';

export interface PptxSrcRect {
  l: number;
  t: number;
  r: number;
  b: number;
}

function clampCropPct(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value ?? 0)) : 0;
}

export function hasImageCrop(crop: SlideImageCrop | undefined): boolean {
  return !!crop && (
    clampCropPct(crop.leftPct) > 0
    || clampCropPct(crop.topPct) > 0
    || clampCropPct(crop.rightPct) > 0
    || clampCropPct(crop.bottomPct) > 0
  );
}

export function imageCropStyle(crop: SlideImageCrop | undefined): CSSProperties {
  if (!hasImageCrop(crop)) {
    return {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    };
  }

  const leftPct = clampCropPct(crop?.leftPct);
  const topPct = clampCropPct(crop?.topPct);
  const rightPct = clampCropPct(crop?.rightPct);
  const bottomPct = clampCropPct(crop?.bottomPct);
  const visibleWPct = Math.max(1, 100 - leftPct - rightPct);
  const visibleHPct = Math.max(1, 100 - topPct - bottomPct);

  return {
    position: 'absolute',
    left: `${-(leftPct / visibleWPct) * 100}%`,
    top: `${-(topPct / visibleHPct) * 100}%`,
    width: `${(100 / visibleWPct) * 100}%`,
    height: `${(100 / visibleHPct) * 100}%`,
    maxWidth: 'none',
    objectFit: 'fill',
  };
}

export function imageCropToPptxSrcRect(crop: SlideImageCrop | undefined): PptxSrcRect | undefined {
  if (!hasImageCrop(crop)) return undefined;
  return {
    l: Math.round(clampCropPct(crop?.leftPct) * 1000),
    t: Math.round(clampCropPct(crop?.topPct) * 1000),
    r: Math.round(clampCropPct(crop?.rightPct) * 1000),
    b: Math.round(clampCropPct(crop?.bottomPct) * 1000),
  };
}

export function pptxSrcRectXml(srcRect: PptxSrcRect | undefined): string | undefined {
  if (!srcRect) return undefined;
  return `<a:srcRect l="${srcRect.l}" t="${srcRect.t}" r="${srcRect.r}" b="${srcRect.b}"/>`;
}
