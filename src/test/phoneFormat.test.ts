import { describe, it, expect } from 'vitest';
import { formatKrPhone, isValidKrPhone } from '@/lib/phoneFormat';

describe('formatKrPhone', () => {
  it('휴대 11자리', () => {
    expect(formatKrPhone('01012345678')).toBe('010-1234-5678');
    expect(formatKrPhone('010 1234 5678')).toBe('010-1234-5678');
  });
  it('휴대 10자리 (옛 011)', () => {
    expect(formatKrPhone('0111234567')).toBe('011-123-4567');
  });
  it('서울 02', () => {
    expect(formatKrPhone('0212345678')).toBe('02-1234-5678');
    expect(formatKrPhone('021234567')).toBe('02-123-4567');
  });
  it('지역 03X', () => {
    expect(formatKrPhone('03112345678')).toBe('031-1234-5678');
    expect(formatKrPhone('0311234567')).toBe('031-123-4567');
  });
  it('인터넷 070', () => {
    expect(formatKrPhone('07012345678')).toBe('070-1234-5678');
  });
  it('빈 / 알 수 없음', () => {
    expect(formatKrPhone('')).toBe('');
  });
});

describe('isValidKrPhone', () => {
  it('유효', () => {
    expect(isValidKrPhone('010-1234-5678')).toBe(true);
    expect(isValidKrPhone('02-123-4567')).toBe(true);
    expect(isValidKrPhone('070-1234-5678')).toBe(true);
  });
  it('무효', () => {
    expect(isValidKrPhone('123')).toBe(false);
    expect(isValidKrPhone('010-12-34')).toBe(false);
  });
});
