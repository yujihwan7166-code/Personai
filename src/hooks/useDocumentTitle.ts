/**
 * useDocumentTitle — document.title 동기화.
 *
 * 마운트 시 title 변경, 언마운트 시 옵션으로 원복.
 * SSR safe (typeof document 체크).
 */

import { useEffect, useRef } from 'react';

interface Options {
  /** 언마운트 시 이전 title 로 복원 (default: true) */
  restoreOnUnmount?: boolean;
  /** 접미사 — "X | 사이트명" 형태 (default: undefined) */
  suffix?: string;
}

export function useDocumentTitle(title: string | null | undefined, opts: Options = {}): void {
  const { restoreOnUnmount = true, suffix } = opts;
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (prevRef.current === null) {
      prevRef.current = document.title;
    }
    if (title != null && title.length > 0) {
      document.title = suffix ? `${title} | ${suffix}` : title;
    }
    return () => {
      if (restoreOnUnmount && prevRef.current !== null) {
        document.title = prevRef.current;
      }
    };
  }, [title, suffix, restoreOnUnmount]);
}
