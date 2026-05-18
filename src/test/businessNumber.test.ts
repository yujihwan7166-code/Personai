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
  // 알려진 유효 사업자등록번호 — 국세청 공식 예시
  it('유효 번호 (체크섬 OK)', () => {
    expect(isValidBizNumber('1208114245')).toBe(true);
    expect(isValidBizNumber('120-81-14245')).toBe(true);
  });
  it('무효 번호 (체크섬 깨짐)', () => {
    expect(isValidBizNumber('1234567890')).toBe(false);
  });
  it('길이 다르면 false', () => {
    expect(isValidBizNumber('12345')).toBe(false);
    expect(isValidBizNumber('')).toBe(false);
  });
  it('비숫자 포함 → 숫자만 검증', () => {
    expect(isValidBizNumber('120abc8114245')).toBe(true);
  });
});
