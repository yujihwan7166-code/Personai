/**
 * localStorage 영속화 state 훅 — JSON 직렬화 + 읽기 실패 시 fallback.
 *
 * 사용처:
 *   const [value, setValue] = useLocalStorageState('personai.foo', initialValue);
 *
 * 특징:
 * - SSR-safe: window 없는 환경에서 initialValue 반환
 * - 쓰기 실패(용량 초과 등) 시 silent drop — 앱 크래시 방지
 * - storage 이벤트 리스닝으로 다른 탭과 자동 동기화 (옵션)
 */
import { useCallback, useEffect, useState } from 'react';

export interface UseLocalStorageStateOptions {
  /** true 면 다른 탭에서의 변경을 storage 이벤트로 감지·동기화. 기본 false. */
  syncAcrossTabs?: boolean;
  /** 커스텀 직렬화 — 기본 JSON.stringify. */
  serialize?: (value: unknown) => string;
  /** 커스텀 역직렬화 — 기본 JSON.parse. */
  deserialize?: <T>(raw: string) => T;
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageStateOptions = {},
): [T, (value: T | ((prev: T) => T)) => void] {
  const { syncAcrossTabs = false, serialize, deserialize } = options;

  const read = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      return deserialize ? deserialize<T>(raw) : (JSON.parse(raw) as T);
    } catch {
      return initialValue;
    }
  }, [key, initialValue, deserialize]);

  const [state, setState] = useState<T>(read);

  const write = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        try {
          const raw = serialize ? serialize(next) : JSON.stringify(next);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, raw);
          }
        } catch { /* quota / serialization fail — silent drop */ }
        return next;
      });
    },
    [key, serialize],
  );

  useEffect(() => {
    if (!syncAcrossTabs || typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return;
      if (e.newValue === null) {
        setState(initialValue);
        return;
      }
      try {
        setState(deserialize ? deserialize<T>(e.newValue) : (JSON.parse(e.newValue) as T));
      } catch { /* ignore malformed storage update */ }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, initialValue, syncAcrossTabs, deserialize]);

  return [state, write];
}
