import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '@/hooks/useCounter';

describe('useCounter', () => {
  it('초기값', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current[0]).toBe(5);
  });

  it('inc / dec', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current[1].inc());
    expect(result.current[0]).toBe(1);
    act(() => result.current[1].inc(5));
    expect(result.current[0]).toBe(6);
    act(() => result.current[1].dec(2));
    expect(result.current[0]).toBe(4);
  });

  it('reset', () => {
    const { result } = renderHook(() => useCounter(10));
    act(() => result.current[1].inc(5));
    act(() => result.current[1].reset());
    expect(result.current[0]).toBe(10);
  });

  it('set / clamp (min, max)', () => {
    const { result } = renderHook(() => useCounter(5, { min: 0, max: 10 }));
    act(() => result.current[1].set(99));
    expect(result.current[0]).toBe(10);
    act(() => result.current[1].set(-5));
    expect(result.current[0]).toBe(0);
  });
});
