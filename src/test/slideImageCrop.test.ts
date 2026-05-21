import { describe, expect, it } from 'vitest';
import { imageCropStyle, imageCropToPptxSrcRect } from '@/lib/cloudSlide/imageCrop';

describe('cloudSlide image crop helpers', () => {
  it('renders uncropped images with contain semantics', () => {
    expect(imageCropStyle(undefined)).toMatchObject({
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    });
  });

  it('maps PowerPoint crop percentages to an oversized clipped image style', () => {
    expect(imageCropStyle({
      leftPct: 10,
      topPct: 5,
      rightPct: 20,
      bottomPct: 15,
    })).toMatchObject({
      position: 'absolute',
      left: `${-(10 / 70) * 100}%`,
      top: `${-(5 / 80) * 100}%`,
      width: `${(100 / 70) * 100}%`,
      height: `${(100 / 80) * 100}%`,
      maxWidth: 'none',
      objectFit: 'fill',
    });
  });

  it('converts editor crop percentages back to OOXML srcRect units', () => {
    expect(imageCropToPptxSrcRect({
      leftPct: 10,
      topPct: 5,
      rightPct: 20,
      bottomPct: 0,
    })).toEqual({
      l: 10000,
      t: 5000,
      r: 20000,
      b: 0,
    });
  });
});
