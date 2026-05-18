import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/slugify';

describe('slugify', () => {
  it('영문', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('특수문자 제거', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });
  it('한글 유지 (default)', () => {
    expect(slugify('안녕 세상')).toBe('안녕-세상');
  });
  it('한글 제거 옵션', () => {
    expect(slugify('hello 안녕', { preserveHangul: false })).toBe('hello');
  });
  it('다중 공백/특수문자 → 단일 -', () => {
    expect(slugify('a  --  b')).toBe('a-b');
  });
  it('양끝 trim', () => {
    expect(slugify('---hello---')).toBe('hello');
  });
  it('maxLength', () => {
    expect(slugify('abcdefghij', { maxLength: 5 })).toBe('abcde');
  });
  it('빈 입력', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});
