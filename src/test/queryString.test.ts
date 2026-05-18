import { describe, it, expect } from 'vitest';
import { parseQueryString, buildQueryString } from '@/lib/queryString';

describe('parseQueryString', () => {
  it('기본', () => {
    expect(parseQueryString('a=1&b=2')).toEqual({ a: '1', b: '2' });
  });
  it('leading ?', () => {
    expect(parseQueryString('?x=hi')).toEqual({ x: 'hi' });
  });
  it('빈 입력', () => {
    expect(parseQueryString('')).toEqual({});
    expect(parseQueryString('?')).toEqual({});
  });
  it('배열 (반복 키)', () => {
    expect(parseQueryString('tag=a&tag=b&tag=c')).toEqual({ tag: ['a','b','c'] });
  });
  it('URL 디코드 + space (+)', () => {
    expect(parseQueryString('q=hello+world')).toEqual({ q: 'hello world' });
    expect(parseQueryString('q=%ED%95%9C')).toEqual({ q: '한' });
  });
});

describe('buildQueryString', () => {
  it('기본', () => {
    expect(buildQueryString({ a: 1, b: 'x' })).toBe('a=1&b=x');
  });
  it('null/undefined 제외', () => {
    expect(buildQueryString({ a: 1, b: null, c: undefined })).toBe('a=1');
  });
  it('배열 → 반복', () => {
    expect(buildQueryString({ tag: ['a','b'] })).toBe('tag=a&tag=b');
  });
  it('인코딩', () => {
    expect(buildQueryString({ q: '한 글' })).toBe('q=%ED%95%9C%20%EA%B8%80');
  });
});
