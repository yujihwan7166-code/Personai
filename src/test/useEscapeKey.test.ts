import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

function fireEscape(target?: Element) {
  const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  if (target) {
    Object.defineProperty(e, 'target', { value: target, writable: false });
  }
  window.dispatchEvent(e);
}

describe('useEscapeKey', () => {
  it('enabled=true 면 호출', () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler));
    fireEscape();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('enabled=false 면 호출 X', () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler, { enabled: false }));
    fireEscape();
    expect(handler).not.toHaveBeenCalled();
  });

  it('input 안에서는 호출 X (기본)', () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler));
    const input = document.createElement('input');
    fireEscape(input);
    expect(handler).not.toHaveBeenCalled();
  });

  it('evenInInput=true 면 input 안에서도 호출', () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler, { evenInInput: true }));
    const input = document.createElement('input');
    fireEscape(input);
    expect(handler).toHaveBeenCalled();
  });

  it('Escape 외 키는 무시', () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('unmount 시 listener 정리', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(handler));
    unmount();
    fireEscape();
    expect(handler).not.toHaveBeenCalled();
  });
});
