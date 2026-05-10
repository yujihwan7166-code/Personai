/**
 * 전역 메모 단축키 — Alt+M (또는 Option+M).
 *
 * 어디서든 새 메모를 빠르게 만들 수 있게:
 *   Alt+M → /memos 로 이동 + 빈 메모 생성 + 편집 모드 진입.
 *
 * 충돌 회피:
 * - input/textarea/contenteditable 안에선 비활성
 * - Ctrl+N / Cmd+N 은 브라우저 새 창이라 사용 X
 * - Alt+M 은 OS·브라우저 단축키와 충돌 적음
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addMemo } from '@/lib/memoStore';

export const GlobalMemoHotkey = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== 'm') return;
      // 입력 중이면 비활성
      const t = e.target as HTMLElement | null;
      if (t && (
        t.tagName === 'INPUT'
        || t.tagName === 'TEXTAREA'
        || t.isContentEditable
        || t.getAttribute('role') === 'combobox'
        || t.getAttribute('role') === 'searchbox'
      )) return;
      e.preventDefault();
      const created = addMemo({ body: '' });
      navigate(`/memos?id=${created.id}`);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
  return null;
};
