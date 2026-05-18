import { describe, it, expect } from 'vitest';
import { assertNever, escapeRegex } from '@/lib/exhaustive';

describe('assertNever', () => {
  it('호출되면 throw', () => {
    expect(() => assertNever('x' as never)).toThrow();
  });
  it('커스텀 메시지', () => {
    expect(() => assertNever('x' as never, '예상치 못한 case')).toThrow('예상치 못한 case');
  });
});

describe('escapeRegex', () => {
  it('메타 문자 escape', () => {
    expect(escapeRegex('a.b')).toBe('a\\.b');
    expect(escapeRegex('(test)')).toBe('\\(test\\)');
    expect(escapeRegex('a+b*c')).toBe('a\\+b\\*c');
  });
  it('일반 문자 그대로', () => {
    expect(escapeRegex('hello')).toBe('hello');
  });
  it('escape 결과로 안전 RegExp', () => {
    const re = new RegExp(escapeRegex('a.b'));
    expect(re.test('a.b')).toBe(true);
    expect(re.test('axb')).toBe(false);
  });
});
