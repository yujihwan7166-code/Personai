/**
 * 피벗 엔진 단독 — input cells + config → output cells.
 * 데이터 예시:
 *
 *   날짜       카테고리   매출
 *   2026-01    문구       100
 *   2026-01    음료        50
 *   2026-02    문구       200
 *   2026-02    음료       150
 *   2026-02    문구        80
 */
import { describe, it, expect } from 'vitest';
import { parsePivotRange, extractRows, runPivot } from '@/lib/cloudSheet/pivot';
import type { PivotConfig } from '@/lib/cloudSheet/pivotTypes';

const SAMPLE = {
  A1: '날짜', B1: '카테고리', C1: '매출',
  A2: '2026-01', B2: '문구', C2: '100',
  A3: '2026-01', B3: '음료', C3: '50',
  A4: '2026-02', B4: '문구', C4: '200',
  A5: '2026-02', B5: '음료', C5: '150',
  A6: '2026-02', B6: '문구', C6: '80',
};

describe('parsePivotRange', () => {
  it('A1:C6 파싱', () => {
    const r = parsePivotRange('A1:C6');
    expect(r).toEqual({ minR: 0, minC: 0, maxR: 5, maxC: 2 });
  });

  it('잘못된 형식 → throw', () => {
    expect(() => parsePivotRange('garbage')).toThrow();
  });
});

describe('extractRows', () => {
  it('헤더 + 데이터 row 추출', () => {
    const r = parsePivotRange('A1:C6');
    const { headers, rows } = extractRows(SAMPLE, r);
    expect(headers).toEqual(['날짜', '카테고리', '매출']);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ 날짜: '2026-01', 카테고리: '문구', 매출: '100' });
  });
});

describe('runPivot — 행 그룹 only (열 없음)', () => {
  it('SUM(매출) by 날짜', () => {
    const config: PivotConfig = {
      rowCol: '날짜',
      values: [{ col: '매출', agg: 'sum' }],
    };
    const out = runPivot(SAMPLE, parsePivotRange('A1:C6'), config);
    expect(out.A1).toBe('날짜');
    expect(out.B1).toBe('SUM(매출)');
    // totalDesc 정렬 — 2026-02 (430) > 2026-01 (150)
    expect(out.A2).toBe('2026-02');
    expect(out.B2).toBe('430');
    expect(out.A3).toBe('2026-01');
    expect(out.B3).toBe('150');
  });

  it('COUNT(매출) by 카테고리', () => {
    const config: PivotConfig = {
      rowCol: '카테고리',
      values: [{ col: '매출', agg: 'count' }],
    };
    const out = runPivot(SAMPLE, parsePivotRange('A1:C6'), config);
    // 문구 3건, 음료 2건 — totalDesc 으로 문구 먼저
    expect(out.A2).toBe('문구');
    expect(out.B2).toBe('3');
    expect(out.A3).toBe('음료');
    expect(out.B3).toBe('2');
  });

  it('AVG / MIN / MAX', () => {
    const out = runPivot(SAMPLE, parsePivotRange('A1:C6'), {
      rowCol: '카테고리',
      values: [
        { col: '매출', agg: 'avg' },
        { col: '매출', agg: 'min' },
        { col: '매출', agg: 'max' },
      ],
    });
    // 문구: 100, 200, 80 → avg=126.67, min=80, max=200
    expect(out.A2).toBe('문구');
    expect(Number(out.B2)).toBeCloseTo(126.6667, 3);
    expect(out.C2).toBe('80');
    expect(out.D2).toBe('200');
  });
});

describe('runPivot — 행 + 열 그룹 (교차표)', () => {
  it('날짜 × 카테고리 → SUM(매출)', () => {
    const config: PivotConfig = {
      rowCol: '날짜',
      colCol: '카테고리',
      values: [{ col: '매출', agg: 'sum' }],
    };
    const out = runPivot(SAMPLE, parsePivotRange('A1:C6'), config);
    expect(out.A1).toBe('날짜');
    // 열 헤더 — 카테고리 정렬 알파벳: 문구, 음료
    expect(out.B1).toBe('문구');
    expect(out.C1).toBe('음료');
    // 2026-02 총합 430 — 정렬 1위
    expect(out.A2).toBe('2026-02');
    expect(out.B2).toBe('280');  // 200+80
    expect(out.C2).toBe('150');
  });
});

describe('runPivot — 필터', () => {
  it('필터로 데이터 부분 집합만', () => {
    const config: PivotConfig = {
      rowCol: '카테고리',
      values: [{ col: '매출', agg: 'sum' }],
      filters: [{ col: '날짜', criteria: '2026-02' }],
    };
    const out = runPivot(SAMPLE, parsePivotRange('A1:C6'), config);
    // 2026-02 만: 문구 280, 음료 150
    expect(out.A2).toBe('문구');
    expect(out.B2).toBe('280');
    expect(out.A3).toBe('음료');
    expect(out.B3).toBe('150');
  });

  it('숫자 비교 criteria (>100)', () => {
    const out = runPivot(SAMPLE, parsePivotRange('A1:C6'), {
      rowCol: '카테고리',
      values: [{ col: '매출', agg: 'sum' }],
      filters: [{ col: '매출', criteria: '>100' }],
    });
    // 100 초과만: 200, 150 → 문구 200, 음료 150
    expect(out.B2).toBe('200');
    expect(out.B3).toBe('150');
  });
});

describe('runPivot — 정렬', () => {
  it('rowAsc — 행 라벨 오름차순', () => {
    const out = runPivot(SAMPLE, parsePivotRange('A1:C6'), {
      rowCol: '날짜',
      values: [{ col: '매출', agg: 'sum' }],
      sort: 'rowAsc',
    });
    expect(out.A2).toBe('2026-01');
    expect(out.A3).toBe('2026-02');
  });

  it('rowDesc', () => {
    const out = runPivot(SAMPLE, parsePivotRange('A1:C6'), {
      rowCol: '날짜',
      values: [{ col: '매출', agg: 'sum' }],
      sort: 'rowDesc',
    });
    expect(out.A2).toBe('2026-02');
    expect(out.A3).toBe('2026-01');
  });
});

describe('runPivot — 검증', () => {
  it('없는 행 컬럼 → throw', () => {
    expect(() => runPivot(SAMPLE, parsePivotRange('A1:C6'), {
      rowCol: '존재안함',
      values: [{ col: '매출', agg: 'sum' }],
    })).toThrow(/행 컬럼/);
  });

  it('없는 값 컬럼 → throw', () => {
    expect(() => runPivot(SAMPLE, parsePivotRange('A1:C6'), {
      rowCol: '날짜',
      values: [{ col: '없는컬럼', agg: 'sum' }],
    })).toThrow(/값 컬럼/);
  });
});
