import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  it('초기값 즉시 반환', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 100));
    expect(result.current).toBe('a');
  });

  it('값 변경 후 delay 지나면 갱신', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), { initialProps: { v: 'a' } });
    rerender({ v: 'b' });
    expect(result.current).toBe('a'); // 아직 갱신 X
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('b');
    vi.useRealTimers();
  });

  it('연속 변경 시 마지막만 반영 (이전 타이머 cleanup)', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), { initialProps: { v: 'a' } });
    rerender({ v: 'b' });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ v: 'c' });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('a'); // 200ms 경과 안 함 — 새 타이머
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('c');
    vi.useRealTimers();
  });
});
