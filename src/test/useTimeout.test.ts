import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTimeout } from '@/hooks/useTimeout';

describe('useTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('delay 후 호출', () => {
    const fn = vi.fn();
    renderHook(() => useTimeout(fn, 100));
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('delay=null → 호출 안 함', () => {
    const fn = vi.fn();
    renderHook(() => useTimeout(fn, null));
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('언마운트 → 호출 안 함', () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => useTimeout(fn, 100));
    unmount();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it('최신 콜백 호출 (ref)', () => {
    let v = 0;
    const { rerender } = renderHook(({ cb }) => useTimeout(cb, 100), {
      initialProps: { cb: () => { v = 1; } },
    });
    rerender({ cb: () => { v = 2; } });
    vi.advanceTimersByTime(100);
    expect(v).toBe(2);
  });
});
