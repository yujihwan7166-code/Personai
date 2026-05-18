import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStableCallback } from '@/hooks/useStableCallback';

describe('useStableCallback', () => {
  it('reference 고정', () => {
    const count = 0;
    const { result, rerender } = renderHook(({ n }) => useStableCallback(() => n + count), {
      initialProps: { n: 1 },
    });
    const first = result.current;
    rerender({ n: 2 });
    rerender({ n: 3 });
    expect(result.current).toBe(first);
  });

  it('항상 최신 fn 호출', () => {
    const { result, rerender } = renderHook(({ n }) => useStableCallback(() => n * 10), {
      initialProps: { n: 1 },
    });
    expect(result.current()).toBe(10);
    rerender({ n: 5 });
    expect(result.current()).toBe(50);
  });

  it('인자 전달', () => {
    const { result } = renderHook(() => useStableCallback((a: number, b: number) => a + b));
    let r = 0;
    act(() => { r = result.current(2, 3); });
    expect(r).toBe(5);
  });
});
