/**
 * useTimeout — 컴포넌트 lifecycle 에 묶인 setTimeout.
 *
 * delay 가 null 이면 일시 중지. callback 은 ref 로 캡쳐.
 * 언마운트 시 자동 cleanup.
 */

import { useEffect, useRef } from 'react';

export function useTimeout(callback: () => void, delay: number | null): void {
  const cbRef = useRef(callback);

  useEffect(() => { cbRef.current = callback; }, [callback]);

  useEffect(() => {
    if (delay === null || delay === undefined) return;
    const id = setTimeout(() => cbRef.current(), Math.max(0, delay));
    return () => clearTimeout(id);
  }, [delay]);
}
