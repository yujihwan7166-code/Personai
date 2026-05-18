import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.title = '원본';
  });

  it('title 변경', () => {
    renderHook(() => useDocumentTitle('새 제목'));
    expect(document.title).toBe('새 제목');
  });

  it('suffix 적용', () => {
    renderHook(() => useDocumentTitle('대시보드', { suffix: '사이트' }));
    expect(document.title).toBe('대시보드 | 사이트');
  });

  it('빈 title → 변경 안 함', () => {
    renderHook(() => useDocumentTitle(''));
    expect(document.title).toBe('원본');
  });

  it('언마운트 시 복원', () => {
    const { unmount } = renderHook(() => useDocumentTitle('임시'));
    expect(document.title).toBe('임시');
    unmount();
    expect(document.title).toBe('원본');
  });

  it('restoreOnUnmount=false → 복원 안 함', () => {
    const { unmount } = renderHook(() => useDocumentTitle('영구', { restoreOnUnmount: false }));
    unmount();
    expect(document.title).toBe('영구');
  });
});
