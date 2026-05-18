import { describe, it, expect } from 'vitest';
import { chunk, zip, flatten } from '@/lib/arrayChunk';

describe('chunk', () => {
  it('균등 분할', () => {
    expect(chunk([1,2,3,4], 2)).toEqual([[1,2],[3,4]]);
  });
  it('마지막 짧음', () => {
    expect(chunk([1,2,3,4,5], 2)).toEqual([[1,2],[3,4],[5]]);
  });
  it('size 0/음수 → []', () => {
    expect(chunk([1,2,3], 0)).toEqual([]);
    expect(chunk([1,2], -1)).toEqual([]);
  });
});

describe('zip', () => {
  it('동일 길이', () => {
    expect(zip([1,2], ['a','b'])).toEqual([[1,'a'],[2,'b']]);
  });
  it('짧은 쪽 기준', () => {
    expect(zip([1,2,3], ['a'])).toEqual([[1,'a']]);
  });
});

describe('flatten', () => {
  it('1단계', () => {
    expect(flatten([[1,2],[3],[4,5]])).toEqual([1,2,3,4,5]);
  });
  it('mixed', () => {
    expect(flatten([1, [2,3], 4])).toEqual([1,2,3,4]);
  });
});
