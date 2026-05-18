import { describe, it, expect } from 'vitest';
import { computeAlign, computeDistribute } from '@/lib/cloudSlide/align';

const A = { id: 'a', xPct: 10, yPct: 5, wPct: 20, hPct: 10 };
const B = { id: 'b', xPct: 50, yPct: 20, wPct: 10, hPct: 5 };
const C = { id: 'c', xPct: 70, yPct: 40, wPct: 15, hPct: 20 };

describe('computeAlign', () => {
  it('< 2 → 빈 Map', () => {
    expect(computeAlign([A], 'h', 'start').size).toBe(0);
    expect(computeAlign([], 'h', 'start').size).toBe(0);
  });

  it('h-start → 모두 minStart=10', () => {
    const r = computeAlign([A, B, C], 'h', 'start');
    expect(r.get('a')).toBe(10);
    expect(r.get('b')).toBe(10);
    expect(r.get('c')).toBe(10);
  });

  it('h-end → 모두 오른쪽 모서리 = maxEnd(85)', () => {
    // maxEnd = max(10+20, 50+10, 70+15) = 85
    const r = computeAlign([A, B, C], 'h', 'end');
    expect(r.get('a')).toBe(85 - 20);
    expect(r.get('b')).toBe(85 - 10);
    expect(r.get('c')).toBe(85 - 15);
  });

  it('h-center → center = (10+85)/2 = 47.5', () => {
    const r = computeAlign([A, B, C], 'h', 'center');
    expect(r.get('a')).toBeCloseTo(47.5 - 10);
    expect(r.get('b')).toBeCloseTo(47.5 - 5);
    expect(r.get('c')).toBeCloseTo(47.5 - 7.5);
  });

  it('v-start', () => {
    const r = computeAlign([A, B, C], 'v', 'start');
    expect(r.get('a')).toBe(5);
    expect(r.get('b')).toBe(5);
    expect(r.get('c')).toBe(5);
  });

  it('clamp — 100 - size 초과 안 됨', () => {
    const big = { id: 'big', xPct: 90, yPct: 0, wPct: 20, hPct: 10 };
    // maxEnd 가 110 이지만 end mode 결과는 clamp 되어 100-size=80 안 넘음
    const r = computeAlign([A, big], 'h', 'end');
    expect(r.get('big')!).toBeLessThanOrEqual(80);
  });

  it('size > 100 인 박스도 음수 안 나옴 (방어)', () => {
    const huge = { id: 'huge', xPct: 0, yPct: 0, wPct: 120, hPct: 10 };
    const r = computeAlign([A, huge], 'h', 'end');
    expect(r.get('huge')!).toBeGreaterThanOrEqual(0);
  });
});

describe('computeDistribute', () => {
  it('< 3 → 빈 Map', () => {
    expect(computeDistribute([A, B], 'h').size).toBe(0);
  });

  it('h: 중간 박스의 center 가 양끝의 중간', () => {
    // A center=20, C center=77.5 → middle target = (20+77.5)/2 = 48.75
    // B size=10 → xPct = 48.75 - 5 = 43.75
    const r = computeDistribute([A, B, C], 'h');
    expect(r.get('a')).toBeCloseTo(A.xPct); // 양끝은 그대로
    expect(r.get('c')).toBeCloseTo(C.xPct);
    expect(r.get('b')).toBeCloseTo(43.75, 5);
  });

  it('정렬 순서 무관 (정렬 후 처리)', () => {
    const r1 = computeDistribute([A, B, C], 'h');
    const r2 = computeDistribute([C, A, B], 'h');
    expect(r1.get('b')).toBeCloseTo(r2.get('b')!);
  });

  it('첫·끝 박스 중심 동일 → 빈 Map (NaN 방어)', () => {
    const same1 = { id: 'x', xPct: 50, yPct: 0, wPct: 10, hPct: 10 };
    const same2 = { id: 'y', xPct: 50, yPct: 0, wPct: 10, hPct: 10 };
    const middle = { id: 'm', xPct: 50, yPct: 0, wPct: 10, hPct: 10 };
    expect(computeDistribute([same1, middle, same2], 'h').size).toBe(0);
  });
});
