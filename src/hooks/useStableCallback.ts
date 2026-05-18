/**
 * useStableCallback — 항상 최신 콜백을 호출하지만 reference 는 고정.
 *
 * useCallback 의 deps 누락 / stale closure 문제 해결.
 * 자식 컴포넌트 props 에 넘겨도 re-render 트리거 X.
 */

import { useRef, useCallback, useLayoutEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

export function useStableCallback<T extends AnyFn>(fn: T): T {
  const ref = useRef<T>(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  }, [fn]);
  return useCallback(((...args: Parameters<T>) => ref.current(...args)) as T, []);
}
