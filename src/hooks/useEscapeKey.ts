/**
 * Escape 키 핸들러 hook — 모달·드로어·드롭다운에서 표준 패턴.
 *
 * 컴포넌트가 활성 상태일 때만 listen — enabled prop 으로 토글.
 * input/textarea/contentEditable 안에서는 자동 비활성 (사용자 입력 우선).
 *
 * 사용:
 *   useEscapeKey(() => setOpen(false), { enabled: open });
 */

import { useEffect } from 'react';

interface Options {
  /** 활성 여부. false 면 listen X. */
  enabled?: boolean;
  /** input/textarea/contentEditable 안에서도 동작시킬지. 기본 false (Esc=입력 취소 우선). */
  evenInInput?: boolean;
}

export function useEscapeKey(
  handler: (e: KeyboardEvent) => void,
  { enabled = true, evenInInput = false }: Options = {},
): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!evenInInput) {
        const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if ((e.target as HTMLElement | null)?.isContentEditable) return;
      }
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, enabled, evenInInput]);
}
