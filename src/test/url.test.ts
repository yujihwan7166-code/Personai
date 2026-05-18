import { describe, it, expect } from 'vitest';
import { safeParseUrl, getHost, getDomain, isHttpUrl, buildQuery, appendQuery } from '@/lib/url';

describe('safeParseUrl', () => {
  it('정상', () => {
    expect(safeParseUrl('https://example.com')).toBeTruthy();
  });
  it('잘못된 → null', () => {
    expect(safeParseUrl('not a url')).toBeNull();
    expect(safeParseUrl('')).toBeNull();
  });
});

describe('getHost / getDomain', () => {
  it('host 추출', () => {
    expect(getHost('https://www.example.com/path?x=1')).toBe('www.example.com');
  });
  it('domain (www. 제거)', () => {
    expect(getDomain('https://www.example.com')).toBe('example.com');
    expect(getDomain('https://api.example.com')).toBe('api.example.com');
  });
});

describe('isHttpUrl', () => {
  it('http/https → true', () => {
    expect(isHttpUrl('http://x.com')).toBe(true);
    expect(isHttpUrl('https://x.com')).toBe(true);
  });
  it('javascript:/data: → false', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,...')).toBe(false);
    expect(isHttpUrl('not a url')).toBe(false);
  });
});

describe('buildQuery', () => {
  it('undefined/null/빈 값 제외', () => {
    const q = buildQuery({ a: 1, b: undefined, c: 'x', d: null, e: '' });
    expect(q).toContain('a=1');
    expect(q).toContain('c=x');
    expect(q).not.toContain('b=');
    expect(q).not.toContain('d=');
    expect(q).not.toContain('e=');
  });
});

describe('appendQuery', () => {
  it('기존 쿼리에 추가', () => {
    const u = appendQuery('https://x.com/p?a=1', { b: 2 });
    expect(u).toContain('a=1');
    expect(u).toContain('b=2');
  });
  it('잘못된 base URL → 원본 반환', () => {
    expect(appendQuery('not url', { a: 1 })).toBe('not url');
  });
});
