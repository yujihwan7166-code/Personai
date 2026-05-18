/**
 * 직전 렌더 시점의 value — 변화 감지·diff 비교용.
 *
 * 사용:
 *   const prev = usePrevious(count);
 *   useEffect(() => { if (prev !== count) onChange(); }, [count]);
 */
import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
