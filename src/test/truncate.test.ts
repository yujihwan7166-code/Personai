import { describe, it, expect } from 'vitest';
import { truncate, truncateMiddle, truncateWords } from '@/lib/truncate';

describe('truncate', () => {
  it('짧으면 그대로', () => {
    expect(truncate('abc', 10)).toBe('abc');
  });
  it('길면 잘림 + …', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
  it('빈/0', () => {
    expect(truncate('', 5)).toBe('');
    expect(truncate('abc', 0)).toBe('');
  });
  it('한글', () => {
    expect(truncate('안녕하세요반갑습니다', 5)).toBe('안녕하세…');
  });
});

describe('truncateMiddle', () => {
  it('가운데 생략', () => {
    expect(truncateMiddle('1234567890', 7)).toBe('123…890');
  });
  it('짧으면 그대로', () => {
    expect(truncateMiddle('abc', 10)).toBe('abc');
  });
  it('max < ellipsis 길이', () => {
    expect(truncateMiddle('abcdefgh', 1)).toBe('…');
  });
});

describe('truncateWords', () => {
  it('단어 단위', () => {
    expect(truncateWords('one two three four', 2)).toBe('one two…');
  });
  it('적으면 그대로', () => {
    expect(truncateWords('a b', 5)).toBe('a b');
  });
});
