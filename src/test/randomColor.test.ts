import { describe, it, expect } from 'vitest';
import { colorFromString, distinctColors } from '@/lib/randomColor';

describe('colorFromString', () => {
  it('동일 입력 → 동일 색', () => {
    expect(colorFromString('홍길동')).toBe(colorFromString('홍길동'));
  });
  it('다른 입력 → 다른 hue (대부분)', () => {
    expect(colorFromString('a')).not.toBe(colorFromString('zzzz'));
  });
  it('HSL 포맷', () => {
    expect(colorFromString('x')).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
  });
  it('saturation/lightness 옵션', () => {
    expect(colorFromString('x', { saturation: 30, lightness: 40 })).toMatch(/30%, 40%/);
  });
});

describe('distinctColors', () => {
  it('N 개', () => {
    expect(distinctColors(5)).toHaveLength(5);
  });
  it('0 또는 음수 → []', () => {
    expect(distinctColors(0)).toEqual([]);
    expect(distinctColors(-3)).toEqual([]);
  });
  it('hue 가 다 다름', () => {
    const colors = distinctColors(3);
    expect(new Set(colors).size).toBe(3);
  });
});
