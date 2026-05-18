import { describe, it, expect } from 'vitest';
import { newId, shortId, sortableId } from '@/lib/idGenerator';

describe('newId', () => {
  it('prefix 포함', () => {
    expect(newId('tsk')).toMatch(/^tsk_[0-9a-z]+_[0-9a-z]{6}$/);
  });
  it('기본 prefix id', () => {
    expect(newId()).toMatch(/^id_/);
  });
  it('연속 호출 결과 다름', () => {
    const a = newId('x');
    const b = newId('x');
    expect(a).not.toBe(b);
  });
});

describe('shortId', () => {
  it('8자 길이', () => {
    expect(shortId()).toHaveLength(8);
  });
});

describe('sortableId', () => {
  it('시간 순 정렬 가능 (ts prefix)', async () => {
    const a = sortableId('h');
    await new Promise((r) => setTimeout(r, 5));
    const b = sortableId('h');
    expect(a < b).toBe(true);
  });
});
