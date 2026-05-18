import { describe, it, expect } from 'vitest';
import { formatKrNumber, formatKrw } from '@/lib/koreanUnit';

describe('formatKrNumber', () => {
  it('0 / 음수 / 작은 수', () => {
    expect(formatKrNumber(0)).toBe('0');
    expect(formatKrNumber(-50)).toBe('-50');
    expect(formatKrNumber(1234)).toBe('1,234');
  });
  it('만 단위', () => {
    expect(formatKrNumber(12_345)).toBe('1만 2,345');
    expect(formatKrNumber(50_000)).toBe('5만');
  });
  it('억 단위', () => {
    expect(formatKrNumber(123_456_789)).toBe('1억 2,345만 6,789');
  });
});

describe('formatKrw', () => {
  it('일반', () => {
    expect(formatKrw(1234)).toBe('₩1,234');
  });
  it('compact 만 단위', () => {
    expect(formatKrw(50_000, { compact: true })).toBe('₩5만');
    expect(formatKrw(15_000, { compact: true })).toBe('₩1.5만');
  });
  it('compact 억 단위', () => {
    expect(formatKrw(200_000_000, { compact: true })).toBe('₩2억');
  });
});
