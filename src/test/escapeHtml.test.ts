import { describe, it, expect } from 'vitest';
import { escapeHtml, unescapeHtml } from '@/lib/escapeHtml';

describe('escapeHtml', () => {
  it('XSS 위험 문자', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });
  it('일반 텍스트 그대로', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
    expect(escapeHtml('한글')).toBe('한글');
  });
  it('null/undefined → ""', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('unescapeHtml', () => {
  it('roundtrip', () => {
    const s = '<script>alert("x")</script>';
    expect(unescapeHtml(escapeHtml(s))).toBe(s);
  });
  it('nbsp 변환', () => {
    expect(unescapeHtml('a&nbsp;b')).toBe('a b');
  });
});
