import { describe, it, expect } from 'vitest';
import { pick, omit } from '@/lib/pickOmit';

describe('pick', () => {
  it('선택 키만', () => {
    expect(pick({a:1,b:2,c:3}, ['a','c'])).toEqual({a:1,c:3});
  });
  it('없는 키 무시', () => {
    expect(pick({a:1} as {a:number,b?:number}, ['a','b'])).toEqual({a:1});
  });
});

describe('omit', () => {
  it('제외 키 빼고', () => {
    expect(omit({a:1,b:2,c:3}, ['b'])).toEqual({a:1,c:3});
  });
  it('원본 불변', () => {
    const src = {a:1,b:2};
    omit(src, ['a']);
    expect(src).toEqual({a:1,b:2});
  });
  it('빈 키 → 그대로', () => {
    expect(omit({a:1}, [])).toEqual({a:1});
  });
});
