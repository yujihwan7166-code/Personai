import { describe, it, expect } from 'vitest';
import { streakDisplay } from '@/lib/planner/streak';

describe('streakDisplay', () => {
  it('0 → none', () => {
    expect(streakDisplay(0)).toEqual({ kind: 'none' });
    expect(streakDisplay(-1)).toEqual({ kind: 'none' });
  });

  it('1~2 → dots', () => {
    expect(streakDisplay(1)).toEqual({ kind: 'dots', count: 1 });
    expect(streakDisplay(2)).toEqual({ kind: 'dots', count: 2 });
  });

  it('3~6 → fire', () => {
    expect(streakDisplay(3)).toEqual({ kind: 'fire', count: 3 });
    expect(streakDisplay(6)).toEqual({ kind: 'fire', count: 6 });
  });

  it('7+ → fire-star', () => {
    expect(streakDisplay(7)).toEqual({ kind: 'fire-star', count: 7 });
    expect(streakDisplay(100)).toEqual({ kind: 'fire-star', count: 100 });
  });
});
