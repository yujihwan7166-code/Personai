/**
 * requestAnimationFrame 기반 state setter — 부드러운 리렌더.
 *
 * scroll / drag / pointer move 같은 고빈도 이벤트 핸들러에서 setState 직접 호출 대신
 * useRafState 의 setter 를 쓰면 frame 당 1번으로 batching.
 *
 * 사용:
 *   const [pos, setPos] = useRafState({ x: 0, y: 0 });
 *   window.addEventListener('pointermove', e => setPos({ x: e.clientX, y: e.clientY }));
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useRafState<T>(initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initial);
  const rafRef = useRef<number | null>(null);
  const latestRef = useRef<T>(initial);

  const setRafState = useCallback((next: T | ((prev: T) => T)) => {
    latestRef.current =
      typeof next === 'function'
        ? (next as (prev: T) => T)(latestRef.current)
        : next;
    if (rafRef.current != null) return; // 이미 frame 대기 중
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setState(latestRef.current);
    });
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  return [state, setRafState];
}
