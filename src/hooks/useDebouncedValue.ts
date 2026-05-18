/**
 * 값 디바운스 hook — 입력값 변화 후 N ms 동안 변화 없으면 새 값 반환.
 *
 * 검색 input, 자동저장 trigger 등에서 자주 필요. 각 페이지가 useState+setTimeout
 * 패턴을 반복 — 한 곳 모음.
 *
 * 사용:
 *   const [query, setQuery] = useState('');
 *   const debounced = useDebouncedValue(query, 300);
 *   useEffect(() => { void search(debounced); }, [debounced]);
 */

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
