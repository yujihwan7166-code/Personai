import { describe, it, expect } from 'vitest';
import {
  normalizeQuery, fuzzyIncludes, tokenMatchAll, findMatches, splitForHighlight,
} from '@/lib/textSearch';

describe('normalizeQuery', () => {
  it('trim + lower + 연속 공백', () => {
    expect(normalizeQuery('  Hello   World  ')).toBe('hello world');
  });
  it('빈 문자열', () => {
    expect(normalizeQuery('   ')).toBe('');
  });
});

describe('fuzzyIncludes', () => {
  it('대소문자 무시', () => {
    expect(fuzzyIncludes('Personai', 'son')).toBe(true);
    expect(fuzzyIncludes('Personai', 'SON')).toBe(true);
  });
  it('빈 query → true (no filter)', () => {
    expect(fuzzyIncludes('abc', '')).toBe(true);
  });
});

describe('tokenMatchAll', () => {
  it('두 단어 모두 포함', () => {
    expect(tokenMatchAll('사과 바나나 망고', '사과 바나나')).toBe(true);
    expect(tokenMatchAll('사과 망고', '사과 바나나')).toBe(false);
  });
  it('순서 무관', () => {
    expect(tokenMatchAll('바나나 사과', '사과 바나나')).toBe(true);
  });
});

describe('findMatches', () => {
  it('여러 매칭 위치', () => {
    expect(findMatches('aba aba', 'a')).toEqual([
      { start: 0, end: 1 }, { start: 2, end: 3 },
      { start: 4, end: 5 }, { start: 6, end: 7 },
    ]);
  });
  it('대소문자 무시', () => {
    expect(findMatches('AaA', 'a')).toHaveLength(3);
  });
  it('빈 query → []', () => {
    expect(findMatches('hello', '')).toEqual([]);
  });
});

describe('splitForHighlight', () => {
  it('hit/miss 분할', () => {
    expect(splitForHighlight('안녕 세상', '세상')).toEqual([
      { text: '안녕 ', hit: false },
      { text: '세상', hit: true },
    ]);
  });
  it('매칭 없으면 전체 hit:false 1개', () => {
    expect(splitForHighlight('abc', 'xyz')).toEqual([{ text: 'abc', hit: false }]);
  });
  it('빈 query → 전체 hit:false', () => {
    expect(splitForHighlight('abc', '')).toEqual([{ text: 'abc', hit: false }]);
  });
});
