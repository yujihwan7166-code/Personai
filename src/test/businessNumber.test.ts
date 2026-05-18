import { describe, it, expect } from 'vitest';
import { formatBizNumber, isValidBizNumber } from '@/lib/businessNumber';

describe('formatBizNumber', () => {
  it('10자리 → 하이픈', () => {
    expect(formatBizNumber('1234567890')).toBe('123-45-67890');
  });
  it('10자리 아니면 숫자만', () => {
    expect(formatBizNumber('123')).toBe('123');
  });
});

describe('isValidBizNumber', () => {
  // 알고리즘 직접 계산: 123456789 → 마지막 자리 = 1 → 유효 1234567891
  it('유효 번호 (직접 계산 체크섬)', () => {
    expect(isValidBizNumber('1234567891')).toBe(true);
    expect(isValidBizNumber('123-45-67891')).toBe(true);
  });
  it('무효 번호 (체크섬 깨짐)', () => {
    expect(isValidBizNumber('1234567890')).toBe(false);
    expect(isValidBizNumber('1234567892')).toBe(false);
  });
  it('길이 다르면 false', () => {
    expect(isValidBizNumber('12345')).toBe(false);
    expect(isValidBizNumber('')).toBe(false);
  });
});
