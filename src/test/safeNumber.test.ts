import { describe, it, expect } from 'vitest';
import { safeInt, safeFloat, parseKoreanNumber } from '@/lib/safeNumber';

describe('safeInt', () => {
  it('정수 string', () => {
    expect(safeInt('42')).toBe(42);
    expect(safeInt('-7')).toBe(-7);
  });
  it('잘못된 입력 → fallback', () => {
    expect(safeInt('12abc')).toBe(0);
    expect(safeInt('')).toBe(0);
    expect(safeInt('3.14', -1)).toBe(-1);
    expect(safeInt(null, 99)).toBe(99);
  });
  it('number 입력 → trunc', () => {
    expect(safeInt(3.7)).toBe(3);
    expect(safeInt(-3.7)).toBe(-3);
  });
});

describe('safeFloat', () => {
  it('실수 파싱', () => {
    expect(safeFloat('3.14')).toBeCloseTo(3.14);
    expect(safeFloat('-0.5')).toBe(-0.5);
    expect(safeFloat('1e3')).toBe(1000);
  });
  it('잘못된 입력', () => {
    expect(safeFloat('12abc')).toBe(0);
    expect(safeFloat('NaN', -1)).toBe(-1);
    expect(safeFloat(Infinity, -1)).toBe(-1);
  });
});

describe('parseKoreanNumber', () => {
  it('쉼표 제거', () => {
    expect(parseKoreanNumber('1,234,567')).toBe(1234567);
    expect(parseKoreanNumber('1,000.5')).toBeCloseTo(1000.5);
  });
});
