import { describe, it, expect } from 'vitest';
import { clamp, range, inRange, lerp, mapRange } from '@/lib/mathUtils';

describe('clamp', () => {
  it('범위 내 그대로', () => { expect(clamp(5, 0, 10)).toBe(5); });
  it('min 미만 → min', () => { expect(clamp(-1, 0, 10)).toBe(0); });
  it('max 초과 → max', () => { expect(clamp(11, 0, 10)).toBe(10); });
  it('NaN → min', () => { expect(clamp(NaN, 0, 10)).toBe(0); });
});

describe('range', () => {
  it('1-arg', () => { expect(range(3)).toEqual([0, 1, 2]); });
  it('2-arg', () => { expect(range(2, 5)).toEqual([2, 3, 4]); });
  it('step 2', () => { expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]); });
  it('역방향 step', () => { expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]); });
  it('step 0 → []', () => { expect(range(0, 5, 0)).toEqual([]); });
});

describe('inRange', () => {
  it('start 포함, end 제외', () => {
    expect(inRange(0, 0, 10)).toBe(true);
    expect(inRange(10, 0, 10)).toBe(false);
    expect(inRange(5, 0, 10)).toBe(true);
  });
});

describe('lerp', () => {
  it('t=0/1/중간', () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(0, 100, 1)).toBe(100);
    expect(lerp(0, 100, 0.5)).toBe(50);
  });
});

describe('mapRange', () => {
  it('비례 매핑', () => {
    expect(mapRange(50, 0, 100, 0, 1)).toBe(0.5);
    expect(mapRange(50, 0, 100, -50, 50)).toBe(0);
  });
  it('inMin == inMax → outMin', () => {
    expect(mapRange(5, 5, 5, 10, 20)).toBe(10);
  });
});
