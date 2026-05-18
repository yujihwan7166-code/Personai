import { describe, it, expect } from 'vitest';
import { toNumberStrict, toIntStrict, toBoolStrict } from '@/lib/parseStrict';

describe('toNumberStrict', () => {
  it('정상 숫자', () => {
    expect(toNumberStrict('42')).toBe(42);
    expect(toNumberStrict('1.5')).toBe(1.5);
    expect(toNumberStrict(7)).toBe(7);
  });
  it('콤마 천단위 자동 제거', () => {
    expect(toNumberStrict('1,234.5')).toBe(1234.5);
  });
  it('빈 문자열·공백 → undefined', () => {
    expect(toNumberStrict('')).toBeUndefined();
    expect(toNumberStrict('  ')).toBeUndefined();
  });
  it('숫자 아닌 문자 → undefined', () => {
    expect(toNumberStrict('abc')).toBeUndefined();
    expect(toNumberStrict('1.5abc')).toBeUndefined();
  });
  it('fallback', () => {
    expect(toNumberStrict('abc', 99)).toBe(99);
  });
  it('Infinity/NaN → undefined', () => {
    expect(toNumberStrict(Infinity)).toBeUndefined();
    expect(toNumberStrict(NaN)).toBeUndefined();
  });
});

describe('toIntStrict', () => {
  it('정수만', () => {
    expect(toIntStrict('42')).toBe(42);
    expect(toIntStrict('1.5')).toBeUndefined();
  });
});

describe('toBoolStrict', () => {
  it('일반 true/false 인식', () => {
    expect(toBoolStrict('true')).toBe(true);
    expect(toBoolStrict('false')).toBe(false);
    expect(toBoolStrict('YES')).toBe(true);
    expect(toBoolStrict('off')).toBe(false);
  });
  it('number 0/non-0', () => {
    expect(toBoolStrict(1)).toBe(true);
    expect(toBoolStrict(0)).toBe(false);
  });
  it('인식 못함 → undefined', () => {
    expect(toBoolStrict('maybe')).toBeUndefined();
    expect(toBoolStrict('maybe', false)).toBe(false);
  });
});
