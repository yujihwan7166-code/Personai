import { describe, it, expect } from 'vitest';
import { diffLines, diffStats } from '@/lib/diff';

describe('diffLines', () => {
  it('동일 텍스트 → 모두 same', () => {
    const out = diffLines('a\nb\nc', 'a\nb\nc');
    expect(out.every((d) => d.op === 'same')).toBe(true);
  });

  it('순수 add', () => {
    const out = diffLines('a', 'a\nb');
    expect(out.find((d) => d.op === 'add')?.text).toBe('b');
  });

  it('순수 remove', () => {
    const out = diffLines('a\nb', 'a');
    expect(out.find((d) => d.op === 'remove')?.text).toBe('b');
  });

  it('중간 교체 (LCS 활용)', () => {
    const out = diffLines('a\nb\nc', 'a\nx\nc');
    expect(out.some((d) => d.op === 'remove' && d.text === 'b')).toBe(true);
    expect(out.some((d) => d.op === 'add' && d.text === 'x')).toBe(true);
  });
});

describe('diffStats', () => {
  it('카운트', () => {
    const out = diffLines('a\nb\nc', 'a\nx\nc\nd');
    const stats = diffStats(out);
    expect(stats.added).toBeGreaterThan(0);
    expect(stats.removed).toBeGreaterThan(0);
    expect(stats.same).toBeGreaterThan(0);
  });
});
