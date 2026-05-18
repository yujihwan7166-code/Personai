/**
 * 카운터 state — increment/decrement/reset/set 헬퍼.
 *
 * 페이지네이션·뱃지·"리렌더 강제" trigger 등 자주 필요한 패턴.
 *
 * 사용:
 *   const [count, { inc, dec, reset, set }] = useCounter(0);
 */

import { useCallback, useState } from 'react';

interface CounterActions {
  inc: (by?: number) => void;
  dec: (by?: number) => void;
  reset: () => void;
  set: (v: number) => void;
}

export function useCounter(
  initial = 0,
  options: { min?: number; max?: number } = {},
): [number, CounterActions] {
  const { min = -Infinity, max = Infinity } = options;
  const [value, setValue] = useState(() => Math.max(min, Math.min(max, initial)));

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max]);
  const inc = useCallback((by = 1) => setValue((v) => clamp(v + by)), [clamp]);
  const dec = useCallback((by = 1) => setValue((v) => clamp(v - by)), [clamp]);
  const reset = useCallback(() => setValue(initial), [initial]);
  const set = useCallback((v: number) => setValue(clamp(v)), [clamp]);

  return [value, { inc, dec, reset, set }];
}
