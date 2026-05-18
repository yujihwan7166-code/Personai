import { describe, it, expect } from 'vitest';
import { clamp, lerp, mapRange, inRange, snap } from '@/lib/clamp';

describe('clamp', () => {
  it('범위 내 → 그대로', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('초과 → max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it('미만 → min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it('min>max → swap', () => {
    expect(clamp(5, 10, 0)).toBe(5);
  });
  it('NaN → min', () => {
    expect(clamp(NaN, 0, 10)).toBe(0);
  });
});

describe('lerp', () => {
  it('t=0 → a', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });
  it('t=1 → b', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });
  it('t=0.5 → 중간', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });
});

describe('mapRange', () => {
  it('정상 매핑', () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
    expect(mapRange(0, -1, 1, 0, 1)).toBe(0.5);
  });
  it('inMin=inMax → outMin', () => {
    expect(mapRange(5, 10, 10, 0, 100)).toBe(0);
  });
});

describe('inRange', () => {
  it('포함', () => {
    expect(inRange(5, 0, 10)).toBe(true);
    expect(inRange(0, 0, 10)).toBe(true);
    expect(inRange(10, 0, 10)).toBe(true);
  });
  it('미포함', () => {
    expect(inRange(-1, 0, 10)).toBe(false);
    expect(inRange(11, 0, 10)).toBe(false);
  });
});

describe('snap', () => {
  it('가장 가까운 step', () => {
    expect(snap(7, 5)).toBe(5);
    expect(snap(8, 5)).toBe(10);
  });
  it('offset 적용', () => {
    expect(snap(12, 5, 2)).toBe(12); // 2,7,12,17 → 12
    expect(snap(13, 5, 2)).toBe(12);
    expect(snap(15, 5, 2)).toBe(17);
  });
});
