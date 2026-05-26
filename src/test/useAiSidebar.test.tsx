import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAiSidebar } from '@/components/cloud/useAiSidebar';
import { STORAGE_KEY_OPEN, type AiContext } from '@/lib/cloudAi/types';

const context: AiContext = {
  kind: 'memo',
  summary: '전체 메모 1개',
  fullText: 'memo',
};

describe('useAiSidebar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('keeps open state in session storage by default', () => {
    const { result } = renderHook(() => useAiSidebar('memo', () => context));

    act(() => result.current.setOpen(true));

    expect(window.sessionStorage.getItem(`${STORAGE_KEY_OPEN}.memo`)).toBe('1');
    expect(window.localStorage.getItem(`${STORAGE_KEY_OPEN}.memo`)).toBeNull();
  });

  it('can keep open state in local storage for workspace pages', () => {
    window.localStorage.setItem(`${STORAGE_KEY_OPEN}.journal`, '1');

    const { result } = renderHook(() => useAiSidebar('journal', () => ({
      ...context,
      kind: 'journal',
    }), { openStorage: 'local' }));

    expect(result.current.open).toBe(true);

    act(() => result.current.setOpen(false));

    expect(window.localStorage.getItem(`${STORAGE_KEY_OPEN}.journal`)).toBe('0');
    expect(window.sessionStorage.getItem(`${STORAGE_KEY_OPEN}.journal`)).toBeNull();
  });
});
