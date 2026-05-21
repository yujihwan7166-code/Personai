import { describe, it, expect } from 'vitest';
import { isSafeHref, sanitizeHref, isSafeImageSrc } from '@/lib/safeUrl';

describe('isSafeHref', () => {
  it('안전한 스키마', () => {
    expect(isSafeHref('https://x.com')).toBe(true);
    expect(isSafeHref('http://x.com')).toBe(true);
    expect(isSafeHref('mailto:a@b.com')).toBe(true);
    expect(isSafeHref('tel:01012345678')).toBe(true);
  });
  it('상대 경로 / fragment', () => {
    expect(isSafeHref('/about')).toBe(true);
    expect(isSafeHref('#top')).toBe(true);
    expect(isSafeHref('?q=1')).toBe(true);
  });
  it('위험 스키마 차단', () => {
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
    expect(isSafeHref('  javascript:alert(1)')).toBe(false);
    expect(isSafeHref('data:text/html,xxx')).toBe(false);
    expect(isSafeHref('vbscript:x')).toBe(false);
  });
  it('빈/잘못된 입력', () => {
    expect(isSafeHref('')).toBe(false);
    expect(isSafeHref(null)).toBe(false);
    expect(isSafeHref(undefined)).toBe(false);
  });
});

describe('sanitizeHref', () => {
  it('안전 → 그대로 (trim)', () => {
    expect(sanitizeHref('  https://x.com  ')).toBe('https://x.com');
  });
  it('위험 → fallback', () => {
    expect(sanitizeHref('javascript:alert(1)')).toBe('#');
    expect(sanitizeHref('javascript:x', '/safe')).toBe('/safe');
  });
});

describe('isSafeImageSrc', () => {
  it('http(s) / data:image / 절대경로', () => {
    expect(isSafeImageSrc('https://x.com/a.png')).toBe(true);
    expect(isSafeImageSrc('data:image/png;base64,XXX')).toBe(true);
    expect(isSafeImageSrc('data:image/bmp;base64,Qk0=')).toBe(true);
    expect(isSafeImageSrc('/static/a.png')).toBe(true);
  });
  it('차단', () => {
    expect(isSafeImageSrc('javascript:x')).toBe(false);
    expect(isSafeImageSrc('data:text/html,xx')).toBe(false);
    expect(isSafeImageSrc('data:image/svg+xml,<svg/>')).toBe(false);
    expect(isSafeImageSrc('file:///C:/secret.png')).toBe(false);
    expect(isSafeImageSrc('ftp://example.com/a.png')).toBe(false);
    expect(isSafeImageSrc('')).toBe(false);
  });
});
