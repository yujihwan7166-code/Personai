import { describe, it, expect } from 'vitest';
import { toInitial, toInitialString, matchInitial } from '@/lib/koreanInitial';

describe('toInitial / toInitialString', () => {
  it('한글 → 초성', () => {
    expect(toInitial('안')).toBe('ㅇ');
    expect(toInitial('명')).toBe('ㅁ');
    expect(toInitial('찬')).toBe('ㅊ');
  });
  it('비한글 → 자기 자신', () => {
    expect(toInitial('a')).toBe('a');
    expect(toInitial('1')).toBe('1');
  });
  it('문자열', () => {
    expect(toInitialString('안녕하세요')).toBe('ㅇㄴㅎㅅㅇ');
    expect(toInitialString('나의 위키')).toBe('ㄴㅇ ㅇㅋ');
  });
});

describe('matchInitial', () => {
  it('초성 매칭', () => {
    expect(matchInitial('안녕하세요', 'ㅇㄴ')).toBe(true);
    expect(matchInitial('안녕하세요', 'ㅎㅅ')).toBe(true);
    expect(matchInitial('안녕하세요', 'ㄱㄴ')).toBe(false);
  });
  it('빈 query → true', () => {
    expect(matchInitial('any', '')).toBe(true);
  });
  it('원문 부분 매칭 fallback', () => {
    expect(matchInitial('Hello World', 'world')).toBe(true);
    expect(matchInitial('Hello', 'WORLD')).toBe(false);
  });
});
