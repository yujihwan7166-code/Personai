import { describe, it, expect } from 'vitest';
import { applySnap, buildSnapLines } from '@/lib/cloudSlide/snap';

describe('buildSnapLines', () => {
  it('캔버스 가장자리·중앙 + 다른 박스 anchor 3종 (left/center/right)', () => {
    const { vLines, hLines } = buildSnapLines([
      { xPct: 10, yPct: 20, wPct: 30, hPct: 40 },
    ]);
    expect(vLines).toContain(0);
    expect(vLines).toContain(50);
    expect(vLines).toContain(100);
    expect(vLines).toContain(10); // left
    expect(vLines).toContain(25); // center
    expect(vLines).toContain(40); // right
    expect(hLines).toContain(20);
    expect(hLines).toContain(40);
    expect(hLines).toContain(60);
  });
});

describe('applySnap', () => {
  const lines = { vLines: [0, 50, 100], hLines: [0, 50, 100] };

  it('threshold 이내 → snap + guide 표시', () => {
    const r = applySnap({ nx: 49.5, ny: 49.5, w: 10, h: 10, ...lines });
    expect(r.guides.length).toBeGreaterThan(0);
  });

  it('박스 center 를 캔버스 center (50) 에 snap', () => {
    // nx=45, w=10 → center=50 → 정확히 50 라인에 snap → nx 유지 45
    const r = applySnap({ nx: 45.5, ny: 0, w: 10, h: 10, ...lines, threshold: 1 });
    // center anchor offset = w/2 = 5, vLine 50 → nx = 50 - 5 = 45
    expect(r.nx).toBe(45);
    expect(r.guides.some(g => g.kind === 'v' && g.pct === 50)).toBe(true);
  });

  it('threshold 초과 → snap 안 함', () => {
    const r = applySnap({ nx: 30, ny: 30, w: 10, h: 10, ...lines, threshold: 1 });
    expect(r.nx).toBe(30);
    expect(r.ny).toBe(30);
    expect(r.guides).toEqual([]);
  });

  it('박스 right 모서리 가 100 에 snap', () => {
    // nx=89.5, w=10 → right=99.5 → 100 line 0.5 거리 → snap → nx = 100-10 = 90
    const r = applySnap({ nx: 89.5, ny: 0, w: 10, h: 10, ...lines });
    expect(r.nx).toBe(90);
  });

  it('clamp — 음수 안 됨', () => {
    const r = applySnap({ nx: -5, ny: 0, w: 10, h: 10, ...lines });
    expect(r.nx).toBeGreaterThanOrEqual(0);
  });

  it('h/v 독립 적용', () => {
    const r = applySnap({ nx: 45.5, ny: 30, w: 10, h: 10, ...lines, threshold: 1 });
    expect(r.nx).toBe(45); // v snap
    expect(r.ny).toBe(30); // h snap 없음
  });
});
