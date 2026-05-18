/**
 * 동적 배열 함수 + spill 페이로드 — formula 단독 검증.
 * (페이지 측 spill 펼침은 별도 — 여기선 sentinel 페이로드 형식만 검증)
 */
import { describe, it, expect } from 'vitest';
import { evalCell, SPILL_SENTINEL } from '@/lib/cloudSheet/formula';

const evalIt = (formula: string, ctx: Record<string, string> = {}): string =>
  evalCell('Z99', { ...ctx, Z99: '=' + formula });

const parseSpill = (sentinelStr: string): unknown[][] => {
  expect(sentinelStr.startsWith(SPILL_SENTINEL)).toBe(true);
  return JSON.parse(sentinelStr.slice(SPILL_SENTINEL.length));
};

describe('FILTER', () => {
  it('조건이 참인 값만 spill', () => {
    const ctx = {
      A1: '10', A2: '50', A3: '30', A4: '70',
      B1: '1', B2: '0', B3: '1', B4: '0', // 1 = 참
    };
    const out = evalIt('FILTER(A1:A4, B1:B4)', ctx);
    expect(parseSpill(out)).toEqual([['10'], ['30']]);
  });

  it('아무것도 안 맞으면 #N/A', () => {
    const ctx = { A1: '1', A2: '2', B1: '0', B2: '0' };
    expect(evalIt('FILTER(A1:A2, B1:B2)', ctx)).toBe('#N/A');
  });
});

describe('SORT', () => {
  it('숫자 오름차순', () => {
    const ctx = { A1: '30', A2: '10', A3: '20' };
    expect(parseSpill(evalIt('SORT(A1:A3)', ctx))).toEqual([['10'], ['20'], ['30']]);
  });

  it('숫자 내림차순 (2번째 인자 = 1)', () => {
    const ctx = { A1: '30', A2: '10', A3: '20' };
    expect(parseSpill(evalIt('SORT(A1:A3, 1)', ctx))).toEqual([['30'], ['20'], ['10']]);
  });

  it('문자열 정렬', () => {
    const ctx = { A1: '바', A2: '가', A3: '나' };
    expect(parseSpill(evalIt('SORT(A1:A3)', ctx))).toEqual([['가'], ['나'], ['바']]);
  });
});

describe('UNIQUE', () => {
  it('중복 제거 (등장 순서 보존)', () => {
    const ctx = { A1: 'a', A2: 'b', A3: 'a', A4: 'c', A5: 'b' };
    expect(parseSpill(evalIt('UNIQUE(A1:A5)', ctx))).toEqual([['a'], ['b'], ['c']]);
  });
});

describe('SEQUENCE', () => {
  it('SEQUENCE(5)', () => {
    expect(parseSpill(evalIt('SEQUENCE(5)'))).toEqual([['1'], ['2'], ['3'], ['4'], ['5']]);
  });

  it('SEQUENCE(3, 10, 5) — 시작 10, 증분 5', () => {
    expect(parseSpill(evalIt('SEQUENCE(3, 10, 5)'))).toEqual([['10'], ['15'], ['20']]);
  });

  it('SEQUENCE(0) → 빈 spill', () => {
    expect(parseSpill(evalIt('SEQUENCE(0)'))).toEqual([]);
  });
});

describe('동적배열 + 기존 함수 조합', () => {
  it('SORT + UNIQUE 중첩 결과 — 단순 검증', () => {
    // 우리 evaluator 는 spill sentinel 을 함수 인자로 받지 못함 (string 으로 들어옴).
    // 중첩은 v2 — 본 검증은 단일 사용만.
    expect(parseSpill(evalIt('SORT(A1:A3, 0)', { A1: '3', A2: '1', A3: '2' })))
      .toEqual([['1'], ['2'], ['3']]);
  });
});
