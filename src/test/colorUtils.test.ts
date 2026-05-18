import { describe, it, expect } from 'vitest';
import { parseHex, relativeLuminance, contrastRatio, pickContrastingText, rgbToHex } from '@/lib/colorUtils';

describe('parseHex', () => {
  it('#rrggbb', () => {
    expect(parseHex('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
  });
  it('#rgb 축약', () => {
    expect(parseHex('#f80')).toEqual({ r: 0xff, g: 0x88, b: 0 });
  });
  it('잘못된 → null', () => {
    expect(parseHex('garbage')).toBeNull();
    expect(parseHex('#zzz')).toBeNull();
  });
});

describe('relativeLuminance', () => {
  it('흑/백 극단', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBe(1);
  });
});

describe('contrastRatio', () => {
  it('흑/백 = 21', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0);
  });
  it('같은 색 = 1', () => {
    expect(contrastRatio('#888', '#888')).toBe(1);
  });
});

describe('pickContrastingText', () => {
  it('어두운 배경 → 흰색', () => {
    expect(pickContrastingText('#000000')).toBe('#ffffff');
    expect(pickContrastingText('#222222')).toBe('#ffffff');
  });
  it('밝은 배경 → 검정', () => {
    expect(pickContrastingText('#ffffff')).toBe('#000000');
    expect(pickContrastingText('#fff59d')).toBe('#000000'); // 노랑
  });
});

describe('rgbToHex', () => {
  it('정상 변환', () => {
    expect(rgbToHex(255, 128, 0)).toBe('#ff8000');
  });
  it('범위 clamp', () => {
    expect(rgbToHex(-10, 300, 128)).toBe('#00ff80');
  });
});
