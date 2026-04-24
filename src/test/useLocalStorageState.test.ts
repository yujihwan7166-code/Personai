import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';

describe('useLocalStorageState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns initialValue when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorageState('test.key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('reads pre-existing localStorage value', () => {
    window.localStorage.setItem('test.key', JSON.stringify('persisted'));
    const { result } = renderHook(() => useLocalStorageState('test.key', 'fallback'));
    expect(result.current[0]).toBe('persisted');
  });

  it('persists new value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorageState('test.key', 0));
    act(() => { result.current[1](42); });
    expect(result.current[0]).toBe(42);
    expect(JSON.parse(window.localStorage.getItem('test.key')!)).toBe(42);
  });

  it('supports updater function', () => {
    const { result } = renderHook(() => useLocalStorageState('test.counter', 10));
    act(() => { result.current[1]((prev) => prev + 5); });
    expect(result.current[0]).toBe(15);
  });

  it('handles malformed localStorage gracefully', () => {
    window.localStorage.setItem('test.key', '{not-json');
    const { result } = renderHook(() => useLocalStorageState('test.key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('stores complex objects', () => {
    const { result } = renderHook(() => useLocalStorageState<{ a: number; b: string[] }>(
      'test.obj',
      { a: 1, b: ['x'] },
    ));
    act(() => { result.current[1]({ a: 2, b: ['y', 'z'] }); });
    expect(result.current[0]).toEqual({ a: 2, b: ['y', 'z'] });
    const stored = JSON.parse(window.localStorage.getItem('test.obj')!);
    expect(stored).toEqual({ a: 2, b: ['y', 'z'] });
  });

  it('uses custom serialize/deserialize when provided', () => {
    const serialize = vi.fn((v: unknown) => `!${JSON.stringify(v)}!`);
    const deserialize = vi.fn(<T>(raw: string): T => JSON.parse(raw.slice(1, -1)) as T);
    const { result } = renderHook(() => useLocalStorageState(
      'test.custom', 'start', { serialize, deserialize },
    ));
    act(() => { result.current[1]('next'); });
    expect(serialize).toHaveBeenCalled();
    expect(window.localStorage.getItem('test.custom')).toBe('!"next"!');
  });
});
