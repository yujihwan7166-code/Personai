/**
 * window 이벤트 리스너 훅 — addEventListener / cleanup 보일러플레이트 제거.
 *
 * 사용:
 *   useWindowEvent('keydown', handler);
 *   useWindowEvent('planner:open-palette', () => setOpen(true));
 *
 * handler 가 매 렌더 새 함수면 cleanup 폭주하므로 호출부에서 useCallback 으로 안정화 권장.
 * (간단한 1회 마운트 핸들러는 그냥 아무 의존 없는 함수로 직접 넘겨도 OK — 마운트 시 1회만 등록.)
 */
import { useEffect } from 'react';

export function useWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  handler: (e: WindowEventMap[K]) => void,
): void;
export function useWindowEvent(
  type: string,
  handler: (e: Event) => void,
): void;
export function useWindowEvent(
  type: string,
  handler: (e: Event) => void,
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener(type, handler);
    return () => window.removeEventListener(type, handler);
    // 의존 명시 X — 호출부에서 handler 안정화 (useCallback) 가 책임.
     
  }, [type, handler]);
}
