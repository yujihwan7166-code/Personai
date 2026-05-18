import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  it('초기값 navigator.onLine', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(typeof result.current).toBe('boolean');
  });

  it('offline 이벤트 → false', () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current).toBe(false);
  });

  it('online 이벤트 → true', () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => { window.dispatchEvent(new Event('offline')); });
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current).toBe(true);
  });
});
