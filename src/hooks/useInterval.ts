/**
 * setInterval 안전 hook — Dan Abramov 패턴.
 *
 * - 마운트 시 등록, 언마운트 시 정리.
 * - delay = null 이면 일시정지.
 * - callback 은 ref 로 stale closure 회피.
 *
 * 사용:
 *   useInterval(() => setNow(new Date()), 1000);
 *   useInterval(tick, isRunning ? 500 : null);
 */

import { useEffect, useRef } from 'react';

export function useInterval(callback: () => void, delay: number | null): void {
  const ref = useRef(callback);
  useEffect(() => { ref.current = callback; }, [callback]);

  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => ref.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
